"""
Video editing module for creating clips with smart zoom, replays, lower-thirds, and variants
Handles FFmpeg filtergraphs for cutting, tracked zoom, overlays, slo-mo, freeze, PIP, and crops
"""

import os
import json
import subprocess
from pathlib import Path
from typing import Dict, List, Tuple, Optional, Union
import numpy as np
import cv2

from util import HighlightsLogger, FileUtils, FFmpegRunner, TimeCodeUtils
from edl import Event

class TrackingUtils:
    """Utilities for object tracking and zoom region calculation"""

    @staticmethod
    def track_action_region(video_path: str, start_time: float, duration: float,
                          zoom_config: Dict, logger: HighlightsLogger) -> List[Tuple[float, float, float, float]]:
        """
        Track the region of interest for smart zoom
        Returns list of (center_x, center_y, width, height) for each frame
        """
        try:
            cap = cv2.VideoCapture(video_path)
            if not cap.isOpened():
                logger.log_error("Failed to open video for tracking")
                return []

            fps = cap.get(cv2.CAP_PROP_FPS)
            frame_width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
            frame_height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

            # Seek to start time
            start_frame = int(start_time * fps)
            cap.set(cv2.CAP_PROP_POS_FRAMES, start_frame)

            # Initialize tracker
            tracker = cv2.TrackerCSRT_create()
            bbox_history = []

            frame_count = 0
            max_frames = int(duration * fps)

            # Read first frame and initialize tracking
            ret, first_frame = cap.read()
            if not ret:
                return []

            # Use simple heuristic to find initial region - center region with some activity
            gray = cv2.cvtColor(first_frame, cv2.COLOR_BGR2GRAY)

            # Default to center region
            init_bbox = (
                frame_width * 0.25,    # x
                frame_height * 0.25,   # y
                frame_width * 0.5,     # width
                frame_height * 0.5     # height
            )

            # Try to find a better initial region using edge detection
            edges = cv2.Canny(gray, 50, 150)
            contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

            if contours:
                # Find largest contour
                largest_contour = max(contours, key=cv2.contourArea)
                x, y, w, h = cv2.boundingRect(largest_contour)

                # Expand the bounding box
                padding = 0.3
                x = max(0, x - int(w * padding))
                y = max(0, y - int(h * padding))
                w = min(frame_width - x, int(w * (1 + 2 * padding)))
                h = min(frame_height - y, int(h * (1 + 2 * padding)))

                init_bbox = (x, y, w, h)

            # Initialize tracker
            tracker.init(first_frame, init_bbox)

            bbox_history.append(init_bbox)

            # Track through remaining frames
            while frame_count < max_frames:
                ret, frame = cap.read()
                if not ret:
                    break

                success, bbox = tracker.update(frame)

                if success:
                    bbox_history.append(bbox)
                else:
                    # Use last known good bbox
                    if bbox_history:
                        bbox_history.append(bbox_history[-1])
                    else:
                        bbox_history.append(init_bbox)

                frame_count += 1

            cap.release()

            # Apply smoothing
            smoothed_bboxes = TrackingUtils._smooth_tracking_data(bbox_history, zoom_config)

            logger.get_logger().info(f"Tracked {len(smoothed_bboxes)} frames")
            return smoothed_bboxes

        except Exception as e:
            logger.log_error(f"Tracking failed: {str(e)}")
            return []

    @staticmethod
    def _smooth_tracking_data(bbox_history: List[Tuple], zoom_config: Dict) -> List[Tuple]:
        """Apply exponential moving average to smooth tracking data"""
        if not bbox_history:
            return []

        smoothing_factor = zoom_config.get('smoothing', 0.15)
        smoothed = [bbox_history[0]]

        for i in range(1, len(bbox_history)):
            prev_smooth = smoothed[-1]
            current = bbox_history[i]

            # Apply EMA to each component
            smooth_bbox = tuple(
                smoothing_factor * current[j] + (1 - smoothing_factor) * prev_smooth[j]
                for j in range(4)
            )

            smoothed.append(smooth_bbox)

        return smoothed

class LowerThirdGenerator:
    """Generates lower-third graphics with text overlays"""

    def __init__(self, config: Dict, logger: HighlightsLogger):
        self.config = config
        self.logger = logger

    def generate_lower_third_text(self, event: Event) -> str:
        """Generate appropriate lower-third text for event"""
        if event.type == 'goal':
            base_text = f"GOAL! {event.player or 'Unknown'}"
            if event.assist:
                base_text += f" ({event.assist})"
            if event.score:
                base_text += f" {event.team or 'TEAM'} {event.score['home']}–{event.score['away']}"
            return base_text

        elif event.type == 'big_save':
            base_text = f"BIG SAVE! {event.player or 'Keeper'}"
            if event.score:
                base_text += f" {event.team or 'TEAM'} {event.score['home']}–{event.score['away']}"
            return base_text

        elif event.type == 'card':
            card_type = event.notes if event.notes and 'yellow' in event.notes.lower() else 'YELLOW'
            card_type = card_type.upper() if 'red' not in card_type.lower() else 'RED'
            return f"{card_type} CARD {event.player or 'Player'}"

        elif event.type == 'chance':
            return f"NEARLY! {event.team or 'Team'} close"

        else:
            return f"{event.type.upper()}: {event.player or 'Player'}"

    def create_lower_third_filter(self, event: Event, video_width: int, video_height: int) -> str:
        """Create FFmpeg filter for lower-third overlay"""
        text = self.generate_lower_third_text(event)
        font_path = self.config.get('paths', {}).get('font', 'assets/Font-Bold.ttf')

        # Calculate positioning
        font_size = max(24, video_height // 30)
        y_position = video_height - (font_size * 3)

        # Create text with background box
        filter_text = (
            f"drawtext=text='{text}':"
            f"fontfile='{font_path}':"
            f"fontsize={font_size}:"
            f"fontcolor=white:"
            f"x=(w-text_w)/2:"  # Center horizontally
            f"y={y_position}:"
            f"box=1:"
            f"boxcolor=black@0.45:"
            f"boxborderw=8"
        )

        return filter_text

class ScoreBugGenerator:
    """Generates score bug overlays with team badges"""

    def __init__(self, config: Dict, logger: HighlightsLogger):
        self.config = config
        self.logger = logger

    def create_score_bug_filter(self, event: Event, video_width: int, video_height: int) -> Optional[str]:
        """Create FFmpeg filter for score bug overlay"""
        if not event.score:
            return None

        paths = self.config.get('paths', {})
        home_badge = paths.get('home_badge', 'assets/home.png')
        away_badge = paths.get('away_badge', 'assets/away.png')

        # Calculate positioning for top-left corner
        badge_size = max(40, video_height // 25)
        spacing = badge_size // 4

        # Score text
        score_text = f"{event.score['home']} - {event.score['away']}"
        font_size = badge_size * 0.6

        # Composite filter with badges and score
        filter_parts = []

        # Home badge
        if os.path.exists(home_badge):
            filter_parts.append(
                f"movie={home_badge}:loop=0[home_badge];"
                f"[home_badge]scale={badge_size}:{badge_size}[home_scaled];"
            )

        # Away badge
        if os.path.exists(away_badge):
            filter_parts.append(
                f"movie={away_badge}:loop=0[away_badge];"
                f"[away_badge]scale={badge_size}:{badge_size}[away_scaled];"
            )

        # Score text overlay
        score_filter = (
            f"drawtext=text='{score_text}':"
            f"fontsize={int(font_size)}:"
            f"fontcolor=white:"
            f"x={badge_size * 2.5}:"
            f"y={spacing}:"
            f"box=1:"
            f"boxcolor=black@0.6:"
            f"boxborderw=4"
        )

        return "; ".join(filter_parts) + ";" + score_filter if filter_parts else score_filter

class ClipRenderer:
    """Main clip rendering engine"""

    def __init__(self, config: Dict, logger: HighlightsLogger):
        self.config = config
        self.logger = logger
        self.ffmpeg_runner = FFmpegRunner(logger.get_logger())
        self.lower_third_gen = LowerThirdGenerator(config, logger)
        self.score_bug_gen = ScoreBugGenerator(config, logger)

    def render_clip(self, event: Event, video_path: str, output_path: str,
                   tracking_data: Optional[List[Tuple]] = None) -> bool:
        """Render a complete clip with all effects"""
        try:
            # Calculate clip boundaries
            start_time = max(0, event.abs_ts - event.pre_padding)
            duration = event.pre_padding + event.post_padding

            self.logger.get_logger().info(
                f"Rendering clip: {event.type} at {TimeCodeUtils.seconds_to_timestamp(event.abs_ts)}"
            )

            # Get video info
            from util import FileUtils
            video_info = FileUtils.get_video_info(video_path)
            if not video_info:
                self.logger.log_error("Failed to get video info")
                return False

            width, height = video_info['width'], video_info['height']
            fps = video_info['fps']

            # Build FFmpeg filter complex
            filters = []
            filter_inputs = []

            # Base video input
            video_input = f"[0:v]"

            # Apply zoom if enabled and tracking data available
            if event.zoom_enabled and tracking_data:
                zoom_filter = self._create_zoom_filter(tracking_data, width, height, duration, fps)
                if zoom_filter:
                    filters.append(zoom_filter)
                    video_input = "[zoomed]"

            # Add lower-third text
            lower_third_filter = self.lower_third_gen.create_lower_third_filter(event, width, height)
            filters.append(f"{video_input}{lower_third_filter}[with_text]")
            video_input = "[with_text]"

            # Add score bug if available
            score_bug_filter = self.score_bug_gen.create_score_bug_filter(event, width, height)
            if score_bug_filter:
                filters.append(f"{video_input}{score_bug_filter}[with_scorebug]")
                video_input = "[with_scorebug]"

            # Audio processing
            audio_filter = "loudnorm=I=-16:TP=-1.5:LRA=11" if self.config['render'].get('loudnorm', True) else "anull"

            # Build complete command
            cmd = [
                'ffmpeg', '-y',
                '-ss', str(start_time),
                '-i', video_path,
                '-t', str(duration),
                '-filter_complex', '; '.join(filters),
                '-map', video_input.strip('[]'),
                '-map', '0:a',
                '-af', audio_filter,
                '-c:v', 'libx264',
                '-preset', self.config['render'].get('preset', 'veryfast'),
                '-crf', str(self.config['render'].get('crf', 20)),
                '-c:a', 'aac',
                '-b:a', f"{self.config['render'].get('audio_bitrate_k', 160)}k",
                '-r', str(self.config['render'].get('fps', 30)),
                output_path
            ]

            success = self.ffmpeg_runner.run_ffmpeg(cmd, f"render clip {event.type}")

            # Add replay segment if enabled
            if success and event.replay_enabled:
                success = self._add_replay_segment(event, video_path, output_path, start_time, duration)

            return success

        except Exception as e:
            self.logger.log_error(f"Clip rendering failed: {str(e)}", {"event": event.type})
            return False

    def _create_zoom_filter(self, tracking_data: List[Tuple], width: int, height: int,
                           duration: float, fps: float) -> Optional[str]:
        """Create FFmpeg zoom filter based on tracking data"""
        if not tracking_data:
            return None

        zoom_config = self.config.get('zoom', {})
        min_zoom = zoom_config.get('min_zoom', 1.08)
        max_zoom = zoom_config.get('max_zoom', 1.30)
        edge_margin_pct = zoom_config.get('edge_margin_pct', 0.18)

        # Generate zoom parameters for each frame
        zoom_expressions = []

        for frame_idx, bbox in enumerate(tracking_data):
            if frame_idx >= int(duration * fps):
                break

            x, y, w, h = bbox

            # Calculate zoom level to fit bbox with margin
            margin_w = width * edge_margin_pct
            margin_h = height * edge_margin_pct

            zoom_w = width / (w + 2 * margin_w)
            zoom_h = height / (h + 2 * margin_h)
            zoom = min(max(min(zoom_w, zoom_h), min_zoom), max_zoom)

            # Calculate pan to center the bbox
            center_x = x + w / 2
            center_y = y + h / 2

            # Convert to FFmpeg zoompan parameters
            # zoompan uses normalized coordinates (0-1)
            pan_x = center_x / width
            pan_y = center_y / height

            zoom_expressions.append(f"if(eq(on,{frame_idx}),{zoom},{pan_x},{pan_y})")

        if not zoom_expressions:
            return None

        # Create interpolated zoom filter
        zoom_filter = (
            f"zoompan=z='if(lte(on,0),{min_zoom},"
            f"{''.join(zoom_expressions)})':"
            f"x='iw/2-(iw/zoom/2)':"
            f"y='ih/2-(ih/zoom/2)':"
            f"d=1[zoomed]"
        )

        return zoom_filter

    def _add_replay_segment(self, event: Event, video_path: str, output_path: str,
                           start_time: float, duration: float) -> bool:
        """Add slow-motion replay segment to clip"""
        try:
            replay_config = self.config.get('replay', {})
            slowmo_factor = replay_config.get('slowmo_factor', 0.5)
            freeze_ms = replay_config.get('freeze_ms', 300)
            pip = replay_config.get('pip', True)
            stinger = replay_config.get('stinger', True)

            # Create temporary replay clip
            temp_dir = "tmp"
            FileUtils.ensure_dir(temp_dir)
            replay_temp = os.path.join(temp_dir, f"replay_{event.type}_{int(event.abs_ts)}.mp4")

            # Extract replay segment (shorter, focused on the action)
            replay_start = event.abs_ts - 2  # 2 seconds before event
            replay_duration = 4  # 4 second replay

            # Create slow-mo with freeze
            replay_cmd = [
                'ffmpeg', '-y',
                '-ss', str(replay_start),
                '-i', video_path,
                '-t', str(replay_duration),
                '-filter_complex',
                f"[0:v]minterpolate=fps={int(30/slowmo_factor)}:mi_mode=mci[slomo];"
                f"[slomo]tpad=stop_mode=clone:stop_duration={freeze_ms/1000}[replay]",
                '-map', '[replay]',
                '-an',  # No audio for replay
                '-c:v', 'libx264', '-crf', '18',
                replay_temp
            ]

            if not self.ffmpeg_runner.run_ffmpeg(replay_cmd, "create replay segment"):
                return False

            # Composite original clip with replay
            final_temp = os.path.join(temp_dir, f"final_{event.type}_{int(event.abs_ts)}.mp4")

            pip_filter = ""
            if pip:
                # Picture-in-picture replay in top-right corner
                pip_filter = (
                    f"[1:v]scale=iw*0.35:ih*0.35[pip];"
                    f"[0:v][pip]overlay=main_w-overlay_w-10:10[final]"
                )
            else:
                pip_filter = "[0:v]copy[final]"

            composite_cmd = [
                'ffmpeg', '-y',
                '-i', output_path,
                '-i', replay_temp,
                '-filter_complex', pip_filter,
                '-map', '[final]',
                '-map', '0:a',
                '-c:v', 'libx264', '-c:a', 'copy',
                final_temp
            ]

            success = self.ffmpeg_runner.run_ffmpeg(composite_cmd, "composite with replay")

            if success:
                # Replace original with composite
                os.replace(final_temp, output_path)

            # Clean up temps
            for temp_file in [replay_temp, final_temp]:
                if os.path.exists(temp_file):
                    os.unlink(temp_file)

            return success

        except Exception as e:
            self.logger.log_error(f"Replay addition failed: {str(e)}")
            return False

class VariantGenerator:
    """Generates 1:1 and 9:16 variants from 16:9 master"""

    def __init__(self, config: Dict, logger: HighlightsLogger):
        self.config = config
        self.logger = logger
        self.ffmpeg_runner = FFmpegRunner(logger.get_logger())

    def generate_variants(self, master_path: str, output_dir: str, clip_name: str,
                         tracking_data: Optional[List[Tuple]] = None) -> Dict[str, str]:
        """Generate 1:1 and 9:16 variants from 16:9 master"""
        variants = {'169': master_path}

        try:
            # Get master video info
            from util import FileUtils
            video_info = FileUtils.get_video_info(master_path)
            if not video_info:
                return variants

            width, height = video_info['width'], video_info['height']

            # Generate 1:1 variant
            if self.config['variants'].get('produce_11', True):
                square_path = os.path.join(output_dir, f"{clip_name}_1x1.mp4")
                if self._create_square_variant(master_path, square_path, width, height, tracking_data):
                    variants['11'] = square_path

            # Generate 9:16 variant
            if self.config['variants'].get('produce_916', True):
                vertical_path = os.path.join(output_dir, f"{clip_name}_9x16.mp4")
                if self._create_vertical_variant(master_path, vertical_path, width, height, tracking_data):
                    variants['916'] = vertical_path

            return variants

        except Exception as e:
            self.logger.log_error(f"Variant generation failed: {str(e)}")
            return variants

    def _create_square_variant(self, input_path: str, output_path: str, width: int, height: int,
                              tracking_data: Optional[List[Tuple]]) -> bool:
        """Create 1:1 square variant"""
        # Use center-weighted crop with tracking bias
        target_size = min(width, height)

        if tracking_data and len(tracking_data) > 0:
            # Use average tracking position to bias crop
            avg_x = sum(bbox[0] + bbox[2]/2 for bbox in tracking_data) / len(tracking_data)
            avg_y = sum(bbox[1] + bbox[3]/2 for bbox in tracking_data) / len(tracking_data)

            # Calculate crop position
            crop_x = max(0, min(avg_x - target_size/2, width - target_size))
            crop_y = max(0, min(avg_y - target_size/2, height - target_size))
        else:
            # Center crop
            crop_x = (width - target_size) // 2
            crop_y = (height - target_size) // 2

        cmd = [
            'ffmpeg', '-y', '-i', input_path,
            '-filter_complex', f"[0:v]crop={target_size}:{target_size}:{int(crop_x)}:{int(crop_y)}[square]",
            '-map', '[square]', '-map', '0:a',
            '-c:v', 'libx264', '-c:a', 'copy',
            output_path
        ]

        return self.ffmpeg_runner.run_ffmpeg(cmd, "create square variant")

    def _create_vertical_variant(self, input_path: str, output_path: str, width: int, height: int,
                                tracking_data: Optional[List[Tuple]]) -> bool:
        """Create 9:16 vertical variant"""
        # Calculate 9:16 dimensions
        target_width = height * 9 // 16
        target_height = height

        if target_width > width:
            # Video is too narrow, scale and pad
            scale_filter = f"scale={width}:{width*16//9},pad={target_width}:{target_height}:(ow-iw)/2:(oh-ih)/2"
        else:
            # Crop to 9:16
            if tracking_data and len(tracking_data) > 0:
                # Use tracking to bias crop position
                avg_x = sum(bbox[0] + bbox[2]/2 for bbox in tracking_data) / len(tracking_data)
                crop_x = max(0, min(avg_x - target_width/2, width - target_width))
            else:
                crop_x = (width - target_width) // 2

            scale_filter = f"crop={target_width}:{target_height}:{int(crop_x)}:0"

        cmd = [
            'ffmpeg', '-y', '-i', input_path,
            '-filter_complex', f"[0:v]{scale_filter}[vertical]",
            '-map', '[vertical]', '-map', '0:a',
            '-c:v', 'libx264', '-c:a', 'copy',
            output_path
        ]

        return self.ffmpeg_runner.run_ffmpeg(cmd, "create vertical variant")

class HighlightsReelAssembler:
    """Assembles individual clips into a complete highlights reel"""

    def __init__(self, config: Dict, logger: HighlightsLogger):
        self.config = config
        self.logger = logger
        self.ffmpeg_runner = FFmpegRunner(logger.get_logger())

    def assemble_highlights_reel(self, clip_paths: List[str], output_path: str) -> bool:
        """Create highlights reel from individual clips"""
        try:
            if not clip_paths:
                self.logger.log_error("No clips to assemble into highlights reel")
                return False

            paths = self.config.get('paths', {})
            intro_path = paths.get('intro', 'assets/intro.mp4')
            outro_path = paths.get('outro', 'assets/outro.mp4')

            # Build input list
            inputs = []
            input_args = []

            # Add intro if exists
            if os.path.exists(intro_path):
                inputs.append(intro_path)
                input_args.extend(['-i', intro_path])

            # Add all clips
            for clip_path in clip_paths:
                if os.path.exists(clip_path):
                    inputs.append(clip_path)
                    input_args.extend(['-i', clip_path])

            # Add outro if exists
            if os.path.exists(outro_path):
                inputs.append(outro_path)
                input_args.extend(['-i', outro_path])

            if len(inputs) < 1:
                self.logger.log_error("No valid inputs for highlights reel")
                return False

            # Create concat filter
            concat_inputs = ''.join(f"[{i}:v][{i}:a]" for i in range(len(inputs)))
            concat_filter = f"{concat_inputs}concat=n={len(inputs)}:v=1:a=1[outv][outa]"

            # Build command
            cmd = [
                'ffmpeg', '-y'
            ] + input_args + [
                '-filter_complex', concat_filter,
                '-map', '[outv]', '-map', '[outa]',
                '-c:v', 'libx264',
                '-preset', self.config['render'].get('preset', 'veryfast'),
                '-crf', str(self.config['render'].get('crf', 20)),
                '-c:a', 'aac',
                '-b:a', f"{self.config['render'].get('audio_bitrate_k', 160)}k",
                output_path
            ]

            success = self.ffmpeg_runner.run_ffmpeg(cmd, "assemble highlights reel")

            if success:
                # Check if reel exceeds 120 seconds (default limit)
                from util import FileUtils
                video_info = FileUtils.get_video_info(output_path)
                duration = video_info.get('duration', 0)

                self.logger.get_logger().info(
                    f"Highlights reel assembled: {duration:.1f}s from {len(clip_paths)} clips"
                )

                if duration > 120:  # 2 minutes
                    self.logger.get_logger().warning(f"Highlights reel exceeds 120s: {duration:.1f}s")

            return success

        except Exception as e:
            self.logger.log_error(f"Highlights reel assembly failed: {str(e)}")
            return False
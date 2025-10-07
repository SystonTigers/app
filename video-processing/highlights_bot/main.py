#!/usr/bin/env python3
"""
Main orchestrator for the Highlights Expert bot
Coordinates the complete pipeline from video input to final highlights reel and manifest
"""

import os
import json
import argparse
import shutil
import time
from pathlib import Path
from typing import Dict, List, Optional

from util import (
    HighlightsLogger, FileUtils, TimeCodeUtils, generate_run_id,
    load_config, check_consent, ValidationUtils
)
from edl import EDLProcessor, Event, EDLUtils
from detect import EventDetector
from edit import ClipRenderer, VariantGenerator, HighlightsReelAssembler, TrackingUtils

class HighlightsBot:
    """Main highlights processing bot"""

    def __init__(self, config_path: str = "config.yaml"):
        """Initialize the highlights bot"""
        self.run_id = generate_run_id()
        self.config = load_config(config_path)
        self.logger = HighlightsLogger(self.run_id)

        # Initialize components
        self.edl_processor = EDLProcessor(self.config, self.logger)
        self.event_detector = EventDetector(self.config, self.logger)
        self.clip_renderer = ClipRenderer(self.config, self.logger)
        self.variant_generator = VariantGenerator(self.config, self.logger)
        self.reel_assembler = HighlightsReelAssembler(self.config, self.logger)

        # Setup directories
        self.setup_directories()

        self.logger.get_logger().info(f"Highlights bot initialized - Run ID: {self.run_id}")

    def setup_directories(self):
        """Ensure all required directories exist"""
        dirs_to_create = [
            "tmp", "out/clips", "out/renders", "logs"
        ]

        for dir_path in dirs_to_create:
            FileUtils.ensure_dir(dir_path)

    def process_match(self, match_video: str, events_file: str,
                     consent_file: Optional[str] = None) -> Dict:
        """
        Process a complete match to generate highlights

        Args:
            match_video: Path to match video file
            events_file: Path to events.json file
            consent_file: Optional consent file path

        Returns:
            Dict with processing results and file paths
        """
        start_time = time.time()
        results = {
            'success': False,
            'run_id': self.run_id,
            'clips': {},
            'highlights_reel': None,
            'manifest': None,
            'errors': []
        }

        try:
            self.logger.get_logger().info("=" * 60)
            self.logger.get_logger().info(f"STARTING HIGHLIGHTS PROCESSING - RUN {self.run_id}")
            self.logger.get_logger().info("=" * 60)

            # Step 1: Pre-flight checks
            if not self._preflight_checks(match_video, events_file, consent_file):
                return results

            # Step 2: Normalize video
            normalized_video = self._normalize_video(match_video)
            if not normalized_video:
                results['errors'].append("Video normalization failed")
                return results

            # Step 3: Load and process guided events
            if not self.edl_processor.load_guided_events(events_file):
                results['errors'].append("Failed to load guided events")
                return results

            # Step 4: Auto-detect missed events
            auto_candidates = self.event_detector.scan_full_match(normalized_video, "tmp")
            self.edl_processor.add_auto_detected_events(auto_candidates)

            # Step 5: Merge, dedupe, and process EDL
            final_events = self._process_edl()
            if not final_events:
                results['errors'].append("No valid events to process")
                return results

            # Step 6: Render individual clips
            clip_results = self._render_all_clips(final_events, normalized_video)
            results['clips'] = clip_results

            # Step 7: Assemble highlights reel
            if clip_results:
                reel_path = self._assemble_highlights_reel(clip_results)
                results['highlights_reel'] = reel_path

            # Step 8: Generate manifest
            manifest_path = self._generate_manifest(final_events, clip_results, results['highlights_reel'])
            results['manifest'] = manifest_path

            # Step 9: Cleanup and finalize
            self._cleanup_temp_files()

            processing_time = time.time() - start_time
            self.logger.get_logger().info(f"Processing completed in {processing_time:.1f}s")

            results['success'] = True
            results['processing_time'] = processing_time

        except Exception as e:
            self.logger.log_error(f"Fatal error in main processing: {str(e)}")
            results['errors'].append(str(e))

        finally:
            # Always save logs
            self.logger.save_json_log()

        return results

    def _preflight_checks(self, match_video: str, events_file: str,
                         consent_file: Optional[str]) -> bool:
        """Run pre-flight checks before processing"""
        self.logger.get_logger().info("Running pre-flight checks...")

        # Check files exist
        if not os.path.exists(match_video):
            self.logger.log_error(f"Match video not found: {match_video}")
            return False

        if not os.path.exists(events_file):
            self.logger.log_error(f"Events file not found: {events_file}")
            return False

        # Check consent
        try:
            with open(events_file, 'r') as f:
                events_data = json.load(f)
        except Exception as e:
            self.logger.log_error(f"Failed to read events file: {str(e)}")
            return False

        if not check_consent(events_data, consent_file or ".consent"):
            self.logger.log_error(
                "Consent not found. Please ensure consent is given in events.json "
                "or create a .consent file before processing."
            )
            return False

        # Check video format
        from util import FileUtils
        video_info = FileUtils.get_video_info(match_video)
        if not video_info:
            self.logger.log_error("Failed to read video information")
            return False

        self.logger.get_logger().info(
            f"Video info: {video_info['duration']:.1f}s, "
            f"{video_info['width']}x{video_info['height']}, "
            f"{video_info['fps']:.1f}fps"
        )

        # Check assets
        paths = self.config.get('paths', {})
        for asset_name, asset_path in paths.items():
            if asset_name in ['intro', 'outro', 'font', 'home_badge', 'away_badge']:
                if not os.path.exists(asset_path):
                    self.logger.get_logger().warning(f"Asset not found: {asset_name} at {asset_path}")

        self.logger.get_logger().info("Pre-flight checks passed")
        return True

    def _normalize_video(self, input_video: str) -> Optional[str]:
        """Normalize video to consistent format"""
        self.logger.get_logger().info("Normalizing video...")

        normalized_path = os.path.join("tmp", f"normalized_{self.run_id}.mp4")

        from util import FFmpegRunner
        ffmpeg_runner = FFmpegRunner(self.logger.get_logger())

        target_fps = self.config['render'].get('fps', 30)

        if ffmpeg_runner.normalize_video(input_video, normalized_path, target_fps):
            self.logger.get_logger().info(f"Video normalized: {normalized_path}")
            return normalized_path
        else:
            self.logger.log_error("Video normalization failed")
            return None

    def _process_edl(self) -> List[Event]:
        """Process the complete EDL pipeline"""
        self.logger.get_logger().info("Processing Edit Decision List...")

        # Merge and dedupe events
        merged_events = self.edl_processor.merge_and_dedupe()

        # Compute adaptive padding
        padded_events = self.edl_processor.compute_adaptive_padding()

        # Apply feature flags
        featured_events = self.edl_processor.apply_feature_flags()

        # Validate durations
        final_events = self.edl_processor.validate_clip_durations()

        self.logger.get_logger().info(f"EDL processing complete: {len(final_events)} final events")

        return final_events

    def _render_all_clips(self, events: List[Event], video_path: str) -> Dict[str, Dict]:
        """Render all clips with variants"""
        self.logger.get_logger().info(f"Rendering {len(events)} clips...")

        clip_results = {}
        output_dir = "out/clips"

        for i, event in enumerate(events):
            clip_name = f"{event.type}_{int(event.abs_ts)}_{i+1:02d}"
            self.logger.get_logger().info(f"Rendering clip {i+1}/{len(events)}: {clip_name}")

            # Generate tracking data if zoom is enabled
            tracking_data = None
            if event.zoom_enabled:
                duration = event.pre_padding + event.post_padding
                tracking_data = TrackingUtils.track_action_region(
                    video_path,
                    event.abs_ts - event.pre_padding,
                    duration,
                    self.config.get('zoom', {}),
                    self.logger
                )

            # Render master 16:9 clip
            master_path = os.path.join(output_dir, f"{clip_name}.mp4")
            if self.clip_renderer.render_clip(event, video_path, master_path, tracking_data):

                # Generate variants
                variants = self.variant_generator.generate_variants(
                    master_path, output_dir, clip_name, tracking_data
                )

                clip_results[clip_name] = {
                    'event': event,
                    'files': variants,
                    'tracking_data': len(tracking_data) if tracking_data else 0
                }

                self.logger.get_logger().info(f"Clip rendered: {len(variants)} variants")

            else:
                self.logger.log_error(f"Failed to render clip: {clip_name}")

        self.logger.get_logger().info(f"Clip rendering complete: {len(clip_results)} successful")
        return clip_results

    def _assemble_highlights_reel(self, clip_results: Dict) -> Optional[str]:
        """Assemble final highlights reel"""
        self.logger.get_logger().info("Assembling highlights reel...")

        if not clip_results:
            self.logger.log_error("No clips available for highlights reel")
            return None

        # Get master clips (16:9) in chronological order
        master_clips = []
        for clip_name, clip_data in clip_results.items():
            if '169' in clip_data['files']:
                master_clips.append((clip_data['event'].abs_ts, clip_data['files']['169']))

        # Sort by timestamp
        master_clips.sort(key=lambda x: x[0])
        clip_paths = [path for _, path in master_clips]

        # Generate output path
        reel_path = os.path.join("out/renders", f"highlights_{self.run_id}.mp4")

        if self.reel_assembler.assemble_highlights_reel(clip_paths, reel_path):
            self.logger.get_logger().info(f"Highlights reel created: {reel_path}")
            return reel_path
        else:
            self.logger.log_error("Failed to assemble highlights reel")
            return None

    def _generate_manifest(self, events: List[Event], clip_results: Dict,
                          reel_path: Optional[str]) -> Optional[str]:
        """Generate manifest.json for Make.com integration"""
        self.logger.get_logger().info("Generating manifest...")

        try:
            manifest_data = {
                'run_id': self.run_id,
                'generated_at': time.strftime('%Y-%m-%d %H:%M:%S'),
                'match_info': {
                    'total_clips': len(clip_results),
                    'total_events': len(events),
                    'processing_version': '1.0'
                },
                'highlights_reel': {
                    'path': reel_path,
                    'title': f"Match Highlights - {time.strftime('%B %d, %Y')}",
                    'description': f"Automatically generated highlights featuring {len(events)} key moments",
                    'tags': ['football', 'highlights', 'automated', 'match']
                },
                'clips': []
            }

            # Add individual clip data
            for clip_name, clip_data in clip_results.items():
                event = clip_data['event']
                files = clip_data['files']

                # Generate caption
                caption = self._generate_clip_caption(event)

                # Generate tags
                tags = self._generate_clip_tags(event)

                clip_entry = {
                    'name': clip_name,
                    'type': event.type,
                    'timestamp': TimeCodeUtils.seconds_to_timestamp(event.abs_ts),
                    'duration': event.pre_padding + event.post_padding,
                    'player': event.player,
                    'team': event.team,
                    'score': event.score,
                    'caption': caption,
                    'tags': tags,
                    'files': {
                        '16:9': files.get('169'),
                        '1:1': files.get('11'),
                        '9:16': files.get('916')
                    },
                    'confidence': event.confidence,
                    'source': event.source,
                    'features': {
                        'zoom': event.zoom_enabled,
                        'replay': event.replay_enabled
                    }
                }

                manifest_data['clips'].append(clip_entry)

            # Save manifest
            manifest_path = os.path.join("out", "manifest.json")
            with open(manifest_path, 'w') as f:
                json.dump(manifest_data, f, indent=2)

            self.logger.get_logger().info(f"Manifest generated: {manifest_path}")
            return manifest_path

        except Exception as e:
            self.logger.log_error(f"Failed to generate manifest: {str(e)}")
            return None

    def _generate_clip_caption(self, event: Event) -> str:
        """Generate social media caption for clip"""
        if event.type == 'goal':
            base = f"⚽ GOAL! {event.player or 'Player'}"
            if event.assist:
                base += f" with an assist from {event.assist}"
            if event.score:
                base += f" | Score: {event.score['home']}-{event.score['away']}"
            return base + " #Football #Goal #MatchHighlights"

        elif event.type == 'big_save':
            return f"🧤 INCREDIBLE SAVE by {event.player or 'Keeper'}! #Football #Save #Goalkeeper"

        elif event.type == 'chance':
            return f"⚡ So close! {event.team or 'Team'} nearly scored! #Football #AlmostGoal"

        elif event.type == 'card':
            card_type = "🟨 Yellow" if "yellow" in (event.notes or "").lower() else "🟥 Red"
            return f"{card_type} card for {event.player or 'Player'} #Football #Discipline"

        else:
            return f"⚽ Match highlight: {event.type} #Football #MatchHighlights"

    def _generate_clip_tags(self, event: Event) -> List[str]:
        """Generate tags for clip"""
        base_tags = ['football', 'highlights', 'match']

        if event.type == 'goal':
            base_tags.extend(['goal', 'celebration', 'scoring'])
        elif event.type == 'big_save':
            base_tags.extend(['save', 'goalkeeper', 'defense'])
        elif event.type == 'chance':
            base_tags.extend(['almostgoal', 'excitement', 'attack'])
        elif event.type == 'card':
            base_tags.extend(['discipline', 'referee'])

        if event.team:
            base_tags.append(event.team.lower().replace(' ', ''))

        return base_tags

    def _cleanup_temp_files(self):
        """Clean up temporary files"""
        temp_dir = Path("tmp")
        if temp_dir.exists():
            for temp_file in temp_dir.glob(f"*{self.run_id}*"):
                try:
                    temp_file.unlink()
                except OSError:
                    pass

        self.logger.get_logger().info("Temporary files cleaned up")

    def get_run_summary(self) -> Dict:
        """Get summary of the current run"""
        return {
            'run_id': self.run_id,
            'config_version': self.config.get('version', 'unknown'),
            'timestamp': time.strftime('%Y-%m-%d %H:%M:%S')
        }

def main():
    """Main CLI entry point"""
    parser = argparse.ArgumentParser(description='Highlights Expert - Smart Auto-Editing Bot')
    parser.add_argument('--match', required=True, help='Path to match video file')
    parser.add_argument('--events', required=True, help='Path to events.json file')
    parser.add_argument('--consent', help='Path to consent file (optional)')
    parser.add_argument('--config', default='config.yaml', help='Path to config file')
    parser.add_argument('--no-variants', action='store_true', help='Skip variant generation')

    args = parser.parse_args()

    try:
        # Initialize bot
        bot = HighlightsBot(args.config)

        # Override variant settings if requested
        if args.no_variants:
            bot.config['variants'] = {
                'produce_169': True,
                'produce_11': False,
                'produce_916': False
            }

        print(f"🎬 Highlights Expert Bot v1.0")
        print(f"📹 Processing: {args.match}")
        print(f"📋 Events: {args.events}")
        print(f"🆔 Run ID: {bot.run_id}")
        print("-" * 50)

        # Process match
        results = bot.process_match(args.match, args.events, args.consent)

        # Print results
        if results['success']:
            print("\n✅ PROCESSING COMPLETED SUCCESSFULLY!")
            print(f"⏱️  Processing time: {results.get('processing_time', 0):.1f}s")
            print(f"🎞️  Clips generated: {len(results['clips'])}")

            if results['highlights_reel']:
                print(f"🎥 Highlights reel: {results['highlights_reel']}")

            if results['manifest']:
                print(f"📋 Manifest: {results['manifest']}")

        else:
            print("\n❌ PROCESSING FAILED!")
            for error in results.get('errors', []):
                print(f"   Error: {error}")

        print(f"\n📝 Logs saved to: logs/run_{bot.run_id}.json")

    except KeyboardInterrupt:
        print("\n⏹️  Processing interrupted by user")
    except Exception as e:
        print(f"\n💥 Fatal error: {str(e)}")
        return 1

    return 0 if results.get('success', False) else 1

if __name__ == '__main__':
    exit(main())
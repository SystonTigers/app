"""
Auto-detection module for finding missed events in match video
Handles audio peaks, scene cuts, goal area activity, celebration detection, and optional OCR
"""

import cv2
import numpy as np
from scipy import signal
from scipy.stats import zscore
from sklearn.cluster import DBSCAN
from typing import Dict, List, Tuple, Optional
import os
from pathlib import Path

from util import HighlightsLogger, FileUtils, FFmpegRunner

class AudioAnalyzer:
    """Analyzes audio for peaks that might indicate events"""

    def __init__(self, logger: HighlightsLogger):
        self.logger = logger

    def extract_audio_features(self, video_path: str, temp_dir: str) -> Optional[np.ndarray]:
        """Extract audio waveform from video"""
        audio_path = os.path.join(temp_dir, "temp_audio.wav")

        ffmpeg_runner = FFmpegRunner(self.logger.get_logger())
        if not ffmpeg_runner.extract_audio(video_path, audio_path):
            return None

        try:
            # Read audio file
            import librosa
            audio_data, sr = librosa.load(audio_path, sr=44100)
            os.unlink(audio_path)  # Clean up
            return audio_data, sr
        except ImportError:
            # Fallback without librosa
            self.logger.get_logger().warning("librosa not available, using basic audio analysis")
            return self._basic_audio_extract(audio_path)

    def _basic_audio_extract(self, audio_path: str) -> Optional[Tuple[np.ndarray, int]]:
        """Basic audio extraction without librosa"""
        try:
            import wave
            with wave.open(audio_path, 'rb') as wav_file:
                frames = wav_file.readframes(-1)
                audio_data = np.frombuffer(frames, dtype=np.int16)
                sr = wav_file.getframerate()
                return audio_data.astype(np.float32) / 32768.0, sr
        except Exception as e:
            self.logger.log_error(f"Failed to extract audio: {str(e)}")
            return None

    def detect_audio_peaks(self, audio_data: np.ndarray, sr: int, sigma_threshold: float = 3.0) -> List[Dict]:
        """Detect significant audio peaks that might indicate events"""
        candidates = []

        try:
            # Calculate short-time energy
            hop_length = int(sr * 0.5)  # 0.5 second windows
            frame_length = int(sr * 1.0)  # 1 second frames

            energy_windows = []
            timestamps = []

            for i in range(0, len(audio_data) - frame_length, hop_length):
                window = audio_data[i:i + frame_length]
                energy = np.sum(window ** 2)
                energy_windows.append(energy)
                timestamps.append(i / sr)

            energy_windows = np.array(energy_windows)

            # Find peaks using z-score
            z_scores = zscore(energy_windows)
            peak_indices = np.where(z_scores > sigma_threshold)[0]

            for peak_idx in peak_indices:
                timestamp = timestamps[peak_idx]
                confidence = min(z_scores[peak_idx] / 5.0, 1.0)  # Normalize confidence

                candidates.append({
                    'type': 'goal_like',  # Audio peaks often indicate goals/excitement
                    'abs_ts': timestamp,
                    'confidence': confidence,
                    'signals': ['audio_peak'],
                    'source': 'auto'
                })

            self.logger.get_logger().info(f"Detected {len(candidates)} audio peak candidates")

        except Exception as e:
            self.logger.log_error(f"Audio peak detection failed: {str(e)}")

        return candidates

class SceneCutAnalyzer:
    """Analyzes video for scene cuts that might indicate camera switches during events"""

    def __init__(self, logger: HighlightsLogger):
        self.logger = logger

    def detect_scene_cuts(self, video_path: str, threshold: float = 30.0) -> List[Dict]:
        """Detect significant scene cuts in video"""
        candidates = []

        try:
            cap = cv2.VideoCapture(video_path)
            if not cap.isOpened():
                self.logger.log_error("Failed to open video for scene cut detection")
                return []

            fps = cap.get(cv2.CAP_PROP_FPS)
            prev_hist = None
            frame_count = 0

            while True:
                ret, frame = cap.read()
                if not ret:
                    break

                # Convert to grayscale and calculate histogram
                gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
                hist = cv2.calcHist([gray], [0], None, [256], [0, 256])

                if prev_hist is not None:
                    # Calculate histogram difference
                    diff = cv2.compareHist(prev_hist, hist, cv2.HISTCMP_CHISQR)

                    if diff > threshold:
                        timestamp = frame_count / fps
                        confidence = min(diff / (threshold * 3), 1.0)

                        candidates.append({
                            'type': 'goal_like',  # Scene cuts often happen during replays/goals
                            'abs_ts': timestamp,
                            'confidence': confidence,
                            'signals': ['scene_cut'],
                            'source': 'auto'
                        })

                prev_hist = hist
                frame_count += 1

                # Sample every 10th frame for performance
                for _ in range(9):
                    cap.read()
                    frame_count += 9

            cap.release()
            self.logger.get_logger().info(f"Detected {len(candidates)} scene cut candidates")

        except Exception as e:
            self.logger.log_error(f"Scene cut detection failed: {str(e)}")

        return candidates

class GoalAreaAnalyzer:
    """Analyzes player activity in goal areas using basic computer vision"""

    def __init__(self, logger: HighlightsLogger, config: Dict):
        self.logger = logger
        self.config = config
        self.tracker = None
        self._load_model()

    def _load_model(self):
        """Load YOLO model for player detection"""
        try:
            from ultralytics import YOLO
            self.tracker = YOLO('yolov8n.pt')  # Nano model for speed
            self.logger.get_logger().info("Loaded YOLO model for player detection")
        except ImportError:
            self.logger.get_logger().warning("YOLOv8 not available, using basic motion detection")
            self.tracker = None

    def analyze_goal_area_activity(self, video_path: str) -> List[Dict]:
        """Detect increased activity in goal areas"""
        candidates = []

        try:
            cap = cv2.VideoCapture(video_path)
            if not cap.isOpened():
                return []

            fps = cap.get(cv2.CAP_PROP_FPS)
            frame_count = 0

            # Sample every 30 frames for performance (1 sec intervals at 30fps)
            sample_interval = 30

            activity_history = []

            while True:
                ret, frame = cap.read()
                if not ret:
                    break

                if frame_count % sample_interval == 0:
                    timestamp = frame_count / fps
                    activity_score = self._analyze_frame_activity(frame, timestamp)

                    activity_history.append({
                        'timestamp': timestamp,
                        'activity': activity_score
                    })

                frame_count += 1

            # Find peaks in activity
            if len(activity_history) > 10:
                activities = [h['activity'] for h in activity_history]
                activity_array = np.array(activities)

                # Use z-score to find significant peaks
                z_scores = zscore(activity_array)
                peak_threshold = 2.0

                for i, z_score in enumerate(z_scores):
                    if z_score > peak_threshold:
                        timestamp = activity_history[i]['timestamp']
                        confidence = min(z_score / 4.0, 1.0)

                        candidates.append({
                            'type': 'goal_like',
                            'abs_ts': timestamp,
                            'confidence': confidence,
                            'signals': ['goal_third_activity'],
                            'source': 'auto'
                        })

            cap.release()
            self.logger.get_logger().info(f"Detected {len(candidates)} goal area activity candidates")

        except Exception as e:
            self.logger.log_error(f"Goal area analysis failed: {str(e)}")

        return candidates

    def _analyze_frame_activity(self, frame: cv2.Mat, timestamp: float) -> float:
        """Analyze activity in a single frame"""
        if self.tracker is not None:
            return self._yolo_activity_analysis(frame)
        else:
            return self._motion_activity_analysis(frame)

    def _yolo_activity_analysis(self, frame: cv2.Mat) -> float:
        """Use YOLO to count players in goal areas"""
        try:
            results = self.tracker(frame, verbose=False)

            if not results:
                return 0.0

            # Count person detections
            person_count = 0
            goal_area_count = 0

            height, width = frame.shape[:2]

            # Define goal areas (rough thirds)
            goal_area_left = width * 0.1
            goal_area_right = width * 0.9

            for result in results:
                boxes = result.boxes
                if boxes is not None:
                    for box in boxes:
                        cls = int(box.cls[0])
                        if cls == 0:  # Person class in COCO
                            person_count += 1

                            # Check if in goal area
                            x1, y1, x2, y2 = box.xyxy[0]
                            center_x = (x1 + x2) / 2

                            if center_x < goal_area_left or center_x > goal_area_right:
                                goal_area_count += 1

            return goal_area_count / max(person_count, 1)  # Ratio of players in goal areas

        except Exception as e:
            self.logger.log_error(f"YOLO analysis failed: {str(e)}")
            return 0.0

    def _motion_activity_analysis(self, frame: cv2.Mat) -> float:
        """Basic motion analysis without ML"""
        # This is a placeholder - implement optical flow or frame differencing
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)

        # Calculate variance as a proxy for activity
        variance = np.var(gray)
        return min(variance / 10000.0, 1.0)  # Normalize

class CelebrationDetector:
    """Detects celebration moments using pose estimation heuristics"""

    def __init__(self, logger: HighlightsLogger):
        self.logger = logger

    def detect_celebrations(self, video_path: str, celebration_window: float = 6.0) -> List[Dict]:
        """Detect celebration moments in video"""
        candidates = []

        try:
            cap = cv2.VideoCapture(video_path)
            if not cap.isOpened():
                return []

            fps = cap.get(cv2.CAP_PROP_FPS)
            frame_count = 0

            # Sample every 15 frames for performance
            sample_interval = 15

            celebration_scores = []
            timestamps = []

            while True:
                ret, frame = cap.read()
                if not ret:
                    break

                if frame_count % sample_interval == 0:
                    timestamp = frame_count / fps
                    score = self._analyze_celebration_frame(frame)

                    celebration_scores.append(score)
                    timestamps.append(timestamp)

                frame_count += 1

            # Find celebration periods
            if len(celebration_scores) > 10:
                # Smooth scores
                window_size = max(int(celebration_window / (sample_interval / fps)), 3)
                smoothed = np.convolve(celebration_scores, np.ones(window_size) / window_size, mode='same')

                # Find peaks
                threshold = np.mean(smoothed) + np.std(smoothed)
                peaks = signal.find_peaks(smoothed, height=threshold, distance=int(fps))

                for peak_idx in peaks[0]:
                    if peak_idx < len(timestamps):
                        timestamp = timestamps[peak_idx]
                        confidence = min(smoothed[peak_idx], 1.0)

                        candidates.append({
                            'type': 'celebration',
                            'abs_ts': timestamp,
                            'confidence': confidence,
                            'signals': ['celebration_frames'],
                            'source': 'auto'
                        })

            cap.release()
            self.logger.get_logger().info(f"Detected {len(candidates)} celebration candidates")

        except Exception as e:
            self.logger.log_error(f"Celebration detection failed: {str(e)}")

        return candidates

    def _analyze_celebration_frame(self, frame: cv2.Mat) -> float:
        """Analyze single frame for celebration indicators"""
        # Simple heuristic: look for upward motion and clustering
        # This is a placeholder - could be improved with pose estimation

        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)

        # Edge detection to find people/motion
        edges = cv2.Canny(gray, 50, 150)
        contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

        # Count significant contours (potential people)
        significant_contours = [c for c in contours if cv2.contourArea(c) > 500]

        # Rough heuristic: more people visible = potential celebration
        return min(len(significant_contours) / 10.0, 1.0)

class ScoreBugOCR:
    """Optional OCR for reading scoreboards (disabled by default)"""

    def __init__(self, logger: HighlightsLogger):
        self.logger = logger
        self.ocr_available = False

        try:
            import pytesseract
            self.ocr_available = True
            self.logger.get_logger().info("OCR available for scorebug detection")
        except ImportError:
            self.logger.get_logger().info("OCR not available - scorebug detection disabled")

    def detect_score_changes(self, video_path: str) -> List[Dict]:
        """Detect score changes via OCR (if enabled)"""
        if not self.ocr_available:
            return []

        # Placeholder - implement OCR scoreboard reading
        # This would track score changes over time
        return []

class EventDetector:
    """Main event detection coordinator"""

    def __init__(self, config: Dict, logger: HighlightsLogger):
        self.config = config
        self.logger = logger
        self.detection_config = config.get('detection', {})

        # Initialize analyzers
        self.audio_analyzer = AudioAnalyzer(logger)
        self.scene_analyzer = SceneCutAnalyzer(logger)
        self.goal_analyzer = GoalAreaAnalyzer(logger, config)
        self.celebration_detector = CelebrationDetector(logger)
        self.scorebug_ocr = ScoreBugOCR(logger)

    def scan_full_match(self, video_path: str, temp_dir: str) -> List[Dict]:
        """Run full scan for missed events"""
        all_candidates = []

        self.logger.get_logger().info("Starting full match scan for auto-detection")

        # Audio peak detection
        try:
            audio_data = self.audio_analyzer.extract_audio_features(video_path, temp_dir)
            if audio_data:
                audio_candidates = self.audio_analyzer.detect_audio_peaks(
                    audio_data[0], audio_data[1],
                    self.detection_config.get('audio_peak_sigma', 3.0)
                )
                all_candidates.extend(audio_candidates)
        except Exception as e:
            self.logger.log_error(f"Audio analysis failed: {str(e)}")

        # Scene cut detection
        try:
            scene_candidates = self.scene_analyzer.detect_scene_cuts(
                video_path,
                self.detection_config.get('scene_cut_threshold', 30)
            )
            all_candidates.extend(scene_candidates)
        except Exception as e:
            self.logger.log_error(f"Scene cut analysis failed: {str(e)}")

        # Goal area activity
        try:
            goal_candidates = self.goal_analyzer.analyze_goal_area_activity(video_path)
            all_candidates.extend(goal_candidates)
        except Exception as e:
            self.logger.log_error(f"Goal area analysis failed: {str(e)}")

        # Celebration detection
        try:
            celebration_candidates = self.celebration_detector.detect_celebrations(
                video_path,
                self.detection_config.get('celebration_window_s', 6)
            )
            all_candidates.extend(celebration_candidates)
        except Exception as e:
            self.logger.log_error(f"Celebration detection failed: {str(e)}")

        # Optional: Scorebug OCR
        if self.detection_config.get('scorebug_ocr', False):
            try:
                scorebug_candidates = self.scorebug_ocr.detect_score_changes(video_path)
                all_candidates.extend(scorebug_candidates)
            except Exception as e:
                self.logger.log_error(f"Scorebug OCR failed: {str(e)}")

        # Promote candidates with multiple overlapping signals
        promoted_candidates = self._promote_multi_signal_candidates(all_candidates)

        self.logger.get_logger().info(
            f"Auto-detection complete: {len(all_candidates)} raw candidates, "
            f"{len(promoted_candidates)} final candidates"
        )

        return promoted_candidates

    def _promote_multi_signal_candidates(self, candidates: List[Dict]) -> List[Dict]:
        """Promote candidates that have multiple overlapping signals"""
        promote_threshold = self.detection_config.get('promote_if_signals', 2)
        overlap_window = 4.0  # seconds

        # Group candidates by time proximity
        time_groups = []
        for candidate in sorted(candidates, key=lambda c: c['abs_ts']):
            added_to_group = False

            for group in time_groups:
                # Check if candidate is close to any in this group
                if any(abs(candidate['abs_ts'] - c['abs_ts']) <= overlap_window for c in group):
                    group.append(candidate)
                    added_to_group = True
                    break

            if not added_to_group:
                time_groups.append([candidate])

        # Process each group
        final_candidates = []
        for group in time_groups:
            if len(group) >= promote_threshold:
                # Merge signals and use highest confidence
                best_candidate = max(group, key=lambda c: c['confidence'])
                all_signals = set()
                for c in group:
                    all_signals.update(c['signals'])

                merged_candidate = best_candidate.copy()
                merged_candidate['signals'] = list(all_signals)
                merged_candidate['confidence'] = min(merged_candidate['confidence'] + 0.2, 1.0)  # Boost confidence

                final_candidates.append(merged_candidate)
                self.logger.log_detection(merged_candidate)
            elif len(group) == 1:
                # Single signal candidates
                final_candidates.append(group[0])
                self.logger.log_detection(group[0])

        return final_candidates
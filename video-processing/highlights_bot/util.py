"""
Utility functions for the Highlights Expert bot
Handles timecode conversion, file operations, subprocess wrappers, and logging
"""

import os
import json
import subprocess
import logging
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Union
import re

class TimeCodeUtils:
    """Utilities for handling timecode conversion and calculations"""

    @staticmethod
    def parse_match_clock(clock_str: str) -> float:
        """Convert mm:ss to total seconds"""
        try:
            parts = clock_str.split(':')
            if len(parts) == 2:
                minutes, seconds = int(parts[0]), int(parts[1])
                return minutes * 60 + seconds
            elif len(parts) == 3:
                hours, minutes, seconds = int(parts[0]), int(parts[1]), int(parts[2])
                return hours * 3600 + minutes * 60 + seconds
            else:
                return float(clock_str)
        except (ValueError, IndexError):
            return 0.0

    @staticmethod
    def parse_timestamp(ts_str: str) -> float:
        """Convert HH:MM:SS.sss to total seconds"""
        try:
            # Handle formats like "01:23:45.678" or "01:23:45"
            time_part = ts_str.split('.')[0]
            microsec_part = ts_str.split('.')[1] if '.' in ts_str else "0"

            h, m, s = map(int, time_part.split(':'))
            total_seconds = h * 3600 + m * 60 + s

            # Add fractional seconds
            if microsec_part:
                fraction = float(f"0.{microsec_part}")
                total_seconds += fraction

            return total_seconds
        except (ValueError, IndexError):
            return 0.0

    @staticmethod
    def seconds_to_timestamp(seconds: float) -> str:
        """Convert seconds to HH:MM:SS.sss format"""
        hours = int(seconds // 3600)
        minutes = int((seconds % 3600) // 60)
        secs = seconds % 60
        return f"{hours:02d}:{minutes:02d}:{secs:06.3f}"

    @staticmethod
    def seconds_to_clock(seconds: float) -> str:
        """Convert seconds to mm:ss format"""
        minutes = int(seconds // 60)
        secs = int(seconds % 60)
        return f"{minutes:02d}:{secs:02d}"

    @staticmethod
    def compute_absolute_time(half: int, clock: str, kickoff_time: float, ht_duration: int = 15) -> float:
        """
        Compute absolute timestamp from match half and clock

        Args:
            half: 1 or 2
            clock: "mm:ss" format
            kickoff_time: absolute time of kickoff in seconds
            ht_duration: half-time duration in minutes
        """
        clock_seconds = TimeCodeUtils.parse_match_clock(clock)

        if half == 1:
            return kickoff_time + clock_seconds
        elif half == 2:
            # Add first half + half time + second half time
            first_half_duration = 49 * 60  # Default 49 minutes
            return kickoff_time + first_half_duration + (ht_duration * 60) + clock_seconds
        else:
            return kickoff_time + clock_seconds

class FileUtils:
    """File and directory operations"""

    @staticmethod
    def ensure_dir(path: Union[str, Path]) -> Path:
        """Ensure directory exists, create if not"""
        path = Path(path)
        path.mkdir(parents=True, exist_ok=True)
        return path

    @staticmethod
    def clean_temp_files(temp_dir: Union[str, Path]):
        """Clean temporary files from directory"""
        temp_dir = Path(temp_dir)
        if temp_dir.exists():
            for file in temp_dir.glob("*"):
                if file.is_file():
                    try:
                        file.unlink()
                    except OSError:
                        pass

    @staticmethod
    def get_video_info(video_path: Union[str, Path]) -> Dict:
        """Get video information using ffprobe"""
        cmd = [
            'ffprobe', '-v', 'quiet', '-print_format', 'json', '-show_format', '-show_streams',
            str(video_path)
        ]

        try:
            result = subprocess.run(cmd, capture_output=True, text=True, check=True)
            info = json.loads(result.stdout)

            # Find video stream
            video_stream = None
            for stream in info.get('streams', []):
                if stream.get('codec_type') == 'video':
                    video_stream = stream
                    break

            if not video_stream:
                return {}

            duration = float(info.get('format', {}).get('duration', 0))
            fps_str = video_stream.get('r_frame_rate', '30/1')
            fps = eval(fps_str) if '/' in fps_str else float(fps_str)

            return {
                'duration': duration,
                'fps': fps,
                'width': int(video_stream.get('width', 0)),
                'height': int(video_stream.get('height', 0)),
                'codec': video_stream.get('codec_name', 'unknown')
            }

        except (subprocess.CalledProcessError, json.JSONDecodeError, Exception):
            return {}

class FFmpegRunner:
    """Wrapper for FFmpeg operations with logging"""

    def __init__(self, logger: logging.Logger):
        self.logger = logger

    def run_ffmpeg(self, cmd: List[str], description: str = "FFmpeg operation") -> bool:
        """Run FFmpeg command with logging"""
        self.logger.info(f"Starting {description}")
        self.logger.debug(f"FFmpeg command: {' '.join(cmd)}")

        try:
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                check=True
            )
            self.logger.info(f"Completed {description}")
            return True

        except subprocess.CalledProcessError as e:
            self.logger.error(f"FFmpeg failed for {description}: {e.stderr}")
            return False
        except Exception as e:
            self.logger.error(f"Unexpected error in {description}: {str(e)}")
            return False

    def extract_audio(self, input_path: str, output_path: str) -> bool:
        """Extract audio track from video"""
        cmd = [
            'ffmpeg', '-y', '-i', input_path,
            '-vn', '-acodec', 'pcm_s16le', '-ar', '44100',
            output_path
        ]
        return self.run_ffmpeg(cmd, "audio extraction")

    def normalize_video(self, input_path: str, output_path: str, target_fps: int = 30) -> bool:
        """Normalize video to consistent FPS and audio levels"""
        cmd = [
            'ffmpeg', '-y', '-i', input_path,
            '-r', str(target_fps),
            '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11',
            '-c:v', 'libx264', '-preset', 'fast', '-crf', '18',
            output_path
        ]
        return self.run_ffmpeg(cmd, "video normalization")

class HighlightsLogger:
    """Structured logging for highlights bot"""

    def __init__(self, run_id: str, log_dir: Union[str, Path] = "logs"):
        self.run_id = run_id
        self.log_dir = FileUtils.ensure_dir(log_dir)

        # Set up structured logging
        self.logger = logging.getLogger('highlights_bot')
        self.logger.setLevel(logging.DEBUG)

        # File handler for detailed logs
        log_file = self.log_dir / f"run_{run_id}.log"
        file_handler = logging.FileHandler(log_file)
        file_handler.setLevel(logging.DEBUG)

        # Console handler for important messages
        console_handler = logging.StreamHandler()
        console_handler.setLevel(logging.INFO)

        # Formatters
        detailed_formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        )
        simple_formatter = logging.Formatter('%(levelname)s: %(message)s')

        file_handler.setFormatter(detailed_formatter)
        console_handler.setFormatter(simple_formatter)

        self.logger.addHandler(file_handler)
        self.logger.addHandler(console_handler)

        # JSON log for structured data
        self.json_log_file = self.log_dir / f"run_{run_id}.json"
        self.json_data = {
            'run_id': run_id,
            'start_time': datetime.now().isoformat(),
            'events': [],
            'detections': [],
            'clips': [],
            'errors': []
        }

    def log_detection(self, detection: Dict):
        """Log an auto-detected event"""
        self.json_data['detections'].append({
            'timestamp': datetime.now().isoformat(),
            **detection
        })
        self.logger.debug(f"Detection: {detection}")

    def log_clip_plan(self, clip_plan: Dict):
        """Log clip planning details"""
        self.json_data['clips'].append({
            'timestamp': datetime.now().isoformat(),
            **clip_plan
        })
        self.logger.info(f"Clip planned: {clip_plan.get('type', 'unknown')} at {clip_plan.get('abs_ts', 'unknown')}")

    def log_error(self, error: str, context: Dict = None):
        """Log an error with context"""
        error_entry = {
            'timestamp': datetime.now().isoformat(),
            'error': error,
            'context': context or {}
        }
        self.json_data['errors'].append(error_entry)
        self.logger.error(f"{error} - Context: {context}")

    def save_json_log(self):
        """Save the JSON log to file"""
        self.json_data['end_time'] = datetime.now().isoformat()
        with open(self.json_log_file, 'w') as f:
            json.dump(self.json_data, f, indent=2)

    def get_logger(self) -> logging.Logger:
        """Get the underlying logger instance"""
        return self.logger

class ValidationUtils:
    """Validation utilities for events and configuration"""

    @staticmethod
    def validate_event(event: Dict) -> Tuple[bool, List[str]]:
        """Validate a single event against the schema"""
        errors = []
        required_fields = ['type', 'half', 'clock']

        # Check required fields
        for field in required_fields:
            if field not in event:
                errors.append(f"Missing required field: {field}")

        # Validate types
        if 'type' in event and event['type'] not in ['goal', 'big_save', 'chance', 'foul', 'card']:
            errors.append(f"Invalid event type: {event['type']}")

        if 'half' in event and event['half'] not in [1, 2]:
            errors.append(f"Invalid half: {event['half']}")

        if 'clock' in event:
            try:
                TimeCodeUtils.parse_match_clock(event['clock'])
            except:
                errors.append(f"Invalid clock format: {event['clock']}")

        return len(errors) == 0, errors

    @staticmethod
    def validate_events_file(events: List[Dict]) -> Tuple[bool, List[str]]:
        """Validate entire events file"""
        all_errors = []

        if not isinstance(events, list):
            return False, ["Events must be a list"]

        for i, event in enumerate(events):
            valid, errors = ValidationUtils.validate_event(event)
            if not valid:
                all_errors.extend([f"Event {i}: {error}" for error in errors])

        return len(all_errors) == 0, all_errors

# Global utilities that can be imported directly
def generate_run_id() -> str:
    """Generate a unique run ID"""
    return datetime.now().strftime("%Y%m%d_%H%M%S")

def load_config(config_path: str = "config.yaml") -> Dict:
    """Load configuration from YAML file"""
    import yaml
    try:
        with open(config_path, 'r') as f:
            return yaml.safe_load(f)
    except Exception as e:
        raise RuntimeError(f"Failed to load config from {config_path}: {str(e)}")

def check_consent(events_data: Dict = None, consent_file: str = ".consent") -> bool:
    """Check if consent is present"""
    # Check for consent flag in events
    if events_data and events_data.get('consent_given'):
        return True

    # Check for consent file
    if os.path.exists(consent_file):
        return True

    return False
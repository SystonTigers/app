"""
FFmpeg command logging module for reproducibility and debugging
Logs all FFmpeg commands with timestamps and descriptions
"""

import os
import json
from datetime import datetime


class FFmpegLogger:
    """
    Logger for FFmpeg commands to ensure reproducibility.
    """

    def __init__(self, match_id, output_dir='ffmpeg_logs'):
        self.match_id = match_id
        self.output_dir = os.path.join(output_dir, match_id)
        self.commands = []

        os.makedirs(self.output_dir, exist_ok=True)

        print(f"📝 FFmpeg logger initialized: {self.output_dir}")

    def log_command(self, step_name, command, description=''):
        """
        Log an FFmpeg command.

        Parameters:
        - step_name: Short name for this step (e.g., '01_extract_clip')
        - command: Full FFmpeg command (list or string)
        - description: Human-readable description
        """
        if isinstance(command, list):
            command_str = ' '.join(str(arg) for arg in command)
        else:
            command_str = str(command)

        entry = {
            'step': step_name,
            'command': command_str,
            'description': description,
            'timestamp': datetime.now().isoformat()
        }

        self.commands.append(entry)

        # Write individual shell script
        script_path = os.path.join(self.output_dir, f'{step_name}.sh')
        with open(script_path, 'w') as f:
            f.write('#!/bin/bash\n')
            f.write(f'# {description}\n')
            f.write(f'# Generated: {entry["timestamp"]}\n\n')
            f.write(command_str + '\n')

        # Make executable (Unix/Linux/Mac only)
        try:
            os.chmod(script_path, 0o755)
        except:
            pass  # Skip on Windows

        print(f"  ✓ Logged: {step_name}")

    def write_reproduce_md(self):
        """
        Write comprehensive REPRODUCE.md file.
        """
        reproduce_path = os.path.join(self.output_dir, 'REPRODUCE.md')

        with open(reproduce_path, 'w', encoding='utf-8') as f:
            f.write(f"# Reproduction Guide - {self.match_id}\n\n")
            f.write(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n")
            f.write("---\n\n")

            f.write("## Overview\n\n")
            f.write(f"This document contains all FFmpeg commands used to process this match.\n")
            f.write(f"Total steps: {len(self.commands)}\n\n")
            f.write("Each step has a corresponding `.sh` script in this directory.\n\n")
            f.write("---\n\n")

            for idx, cmd in enumerate(self.commands, start=1):
                f.write(f"## Step {idx}: {cmd['step']}\n\n")

                if cmd['description']:
                    f.write(f"**Description**: {cmd['description']}\n\n")

                f.write(f"**Timestamp**: {cmd['timestamp']}\n\n")
                f.write("**Command**:\n")
                f.write("```bash\n")
                f.write(cmd['command'])
                f.write("\n```\n\n")
                f.write("---\n\n")

            f.write("## Running All Steps\n\n")
            f.write("To reproduce this entire processing pipeline:\n\n")
            f.write("```bash\n")
            for cmd in self.commands:
                f.write(f"# {cmd['step']}\n")
                f.write(f"./{cmd['step']}.sh\n\n")
            f.write("```\n\n")
            f.write("---\n\n")
            f.write("**Note**: Paths in commands may need adjustment based on your environment.\n")

        print(f"✅ Reproduction guide written: {reproduce_path}")

        # Also write JSON for programmatic access
        json_path = os.path.join(self.output_dir, 'commands.json')
        with open(json_path, 'w', encoding='utf-8') as f:
            json.dump({
                'match_id': self.match_id,
                'generated': datetime.now().isoformat(),
                'commands': self.commands
            }, f, indent=2)

        print(f"✅ Commands JSON written: {json_path}")

        return reproduce_path

    def write_batch_file(self):
        """
        Write Windows batch file (.bat) for easy execution on Windows.
        """
        batch_path = os.path.join(self.output_dir, 'run_all.bat')

        with open(batch_path, 'w') as f:
            f.write('@echo off\n')
            f.write(f'REM Reproduction batch file - {self.match_id}\n')
            f.write(f'REM Generated: {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}\n\n')

            for cmd in self.commands:
                f.write(f'REM {cmd["step"]}: {cmd["description"]}\n')
                f.write(f'{cmd["command"]}\n\n')

        print(f"✅ Batch file written: {batch_path}")
        return batch_path

    def get_summary(self):
        """
        Get summary of logged commands.

        Returns: Dictionary with statistics
        """
        return {
            'match_id': self.match_id,
            'total_commands': len(self.commands),
            'output_dir': self.output_dir,
            'commands': [
                {
                    'step': cmd['step'],
                    'description': cmd['description'],
                    'timestamp': cmd['timestamp']
                }
                for cmd in self.commands
            ]
        }


def process_match_with_logging(match_id, video_path, config):
    """
    Example: Main processing function with comprehensive logging.
    """
    logger = FFmpegLogger(match_id)

    # Example usage throughout pipeline:

    # 1. Extract clip
    cmd = ['ffmpeg', '-i', video_path, '-ss', '10', '-to', '20', '-c', 'copy', 'clip.mp4']
    logger.log_command('01_extract_clip', cmd, 'Extract 10s clip from match video')

    # 2. Stabilize - detect pass
    cmd = ['ffmpeg', '-i', 'clip.mp4', '-vf', 'vidstabdetect', '-f', 'null', '-']
    logger.log_command('02_stabilize_detect', cmd, 'Detect shakiness for stabilization')

    # 3. Stabilize - transform pass
    cmd = ['ffmpeg', '-i', 'clip.mp4', '-vf', 'vidstabtransform', 'clip_stable.mp4']
    logger.log_command('03_stabilize_transform', cmd, 'Apply stabilization transformation')

    # 4. Normalize audio
    cmd = ['ffmpeg', '-i', 'clip_stable.mp4', '-af', 'loudnorm=I=-14:TP=-1.5', 'clip_normalized.mp4']
    logger.log_command('04_normalize_audio', cmd, 'Normalize audio to -14 LUFS')

    # 5. Add overlays
    cmd = ['ffmpeg', '-i', 'clip_normalized.mp4', '-i', 'scorebug.png', '-filter_complex',
           '[0:v][1:v]overlay=10:10', 'clip_final.mp4']
    logger.log_command('05_add_overlays', cmd, 'Add scorebug overlay')

    # At the end
    logger.write_reproduce_md()
    logger.write_batch_file()

    # Get summary
    summary = logger.get_summary()
    print(f"\n📊 Processing Summary:")
    print(f"  Total commands: {summary['total_commands']}")
    print(f"  Output directory: {summary['output_dir']}")

    return logger


class CommandValidator:
    """
    Validates FFmpeg commands for common issues.
    """

    @staticmethod
    def validate_command(command):
        """
        Validate FFmpeg command for common issues.

        Returns: List of warnings/errors
        """
        issues = []

        if isinstance(command, list):
            command_str = ' '.join(str(arg) for arg in command)
        else:
            command_str = str(command)

        # Check if it's an FFmpeg command
        if not command_str.strip().startswith('ffmpeg'):
            issues.append('Command does not start with ffmpeg')

        # Check for common issues
        if '-i' not in command_str:
            issues.append('No input file specified (-i flag missing)')

        # Check for overwrite flag
        if '-y' not in command_str and '-n' not in command_str:
            issues.append('Warning: No overwrite flag (-y or -n) specified')

        # Check for output file
        parts = command_str.split()
        if len(parts) < 3:
            issues.append('Command seems incomplete')
        else:
            # Check if last argument looks like an output file
            last_arg = parts[-1]
            if not any(last_arg.endswith(ext) for ext in ['.mp4', '.mkv', '.avi', '.mov', '.webm', '.png', '.jpg', '-']):
                issues.append('Warning: Output file might be missing or has unusual extension')

        return issues


class LogAnalyzer:
    """
    Analyzes FFmpeg logs for insights and optimizations.
    """

    @staticmethod
    def analyze_log_dir(log_dir):
        """
        Analyze a log directory and provide insights.

        Returns: Dictionary with analysis results
        """
        commands_json = os.path.join(log_dir, 'commands.json')

        if not os.path.exists(commands_json):
            return {'error': 'commands.json not found'}

        with open(commands_json, 'r') as f:
            data = json.load(f)

        commands = data.get('commands', [])

        # Count command types
        command_types = {}
        for cmd in commands:
            cmd_str = cmd['command']
            if 'vidstab' in cmd_str:
                cmd_type = 'stabilization'
            elif 'loudnorm' in cmd_str:
                cmd_type = 'audio_normalization'
            elif 'overlay' in cmd_str:
                cmd_type = 'overlay'
            elif 'scale' in cmd_str or 'crop' in cmd_str:
                cmd_type = 'resize_crop'
            elif '-ss' in cmd_str and '-to' in cmd_str:
                cmd_type = 'extract_clip'
            else:
                cmd_type = 'other'

            command_types[cmd_type] = command_types.get(cmd_type, 0) + 1

        return {
            'match_id': data.get('match_id'),
            'total_commands': len(commands),
            'command_types': command_types,
            'first_command': commands[0]['timestamp'] if commands else None,
            'last_command': commands[-1]['timestamp'] if commands else None
        }

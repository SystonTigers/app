#!/usr/bin/env python3
"""
Test script for video effects (stabilization, smart zoom, slow-motion replays)
"""

import argparse
import os
import sys
import json
from pathlib import Path

from effects import stabilize_clip, smart_zoom_on_action, add_slowmo_replay


def test_stabilization(input_path, output_path=None):
    """Test video stabilization"""
    if not os.path.exists(input_path):
        print(f"Error: Input file not found: {input_path}")
        return False

    if output_path is None:
        output_path = input_path.replace('.mp4', '_stabilized.mp4')

    print(f"Testing stabilization...")
    print(f"Input: {input_path}")
    print(f"Output: {output_path}")

    try:
        result = stabilize_clip(input_path, output_path, shakiness=5, accuracy=9, smoothing=10)
        print(f"✓ Stabilization complete: {result}")
        return True
    except Exception as e:
        print(f"✗ Stabilization failed: {str(e)}")
        return False


def test_smart_zoom(input_path, bbox_file, output_path=None):
    """Test smart zoom with bounding box data"""
    if not os.path.exists(input_path):
        print(f"Error: Input file not found: {input_path}")
        return False

    if not os.path.exists(bbox_file):
        print(f"Error: Bounding box file not found: {bbox_file}")
        return False

    if output_path is None:
        output_path = input_path.replace('.mp4', '_zoomed.mp4')

    print(f"Testing smart zoom...")
    print(f"Input: {input_path}")
    print(f"Bbox data: {bbox_file}")
    print(f"Output: {output_path}")

    # Load bbox data
    try:
        with open(bbox_file, 'r') as f:
            bbox_data = json.load(f)

        # Convert to expected format: [(timestamp, x, y, w, h), ...]
        if isinstance(bbox_data, list) and len(bbox_data) > 0:
            # If already in correct format
            if isinstance(bbox_data[0], (list, tuple)) and len(bbox_data[0]) == 5:
                pass
            # If in dict format
            elif isinstance(bbox_data[0], dict):
                bbox_data = [
                    (item['timestamp'], item['x'], item['y'], item['w'], item['h'])
                    for item in bbox_data
                ]

        result = smart_zoom_on_action(input_path, output_path, bbox_data, max_zoom=1.25)
        print(f"✓ Smart zoom complete: {result}")
        return True
    except Exception as e:
        print(f"✗ Smart zoom failed: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


def test_replay(input_path, start_time, end_time, output_path=None, stinger_path=None):
    """Test slow-motion replay"""
    if not os.path.exists(input_path):
        print(f"Error: Input file not found: {input_path}")
        return False

    if output_path is None:
        output_path = input_path.replace('.mp4', '_replay.mp4')

    print(f"Testing slow-motion replay...")
    print(f"Input: {input_path}")
    print(f"Replay segment: {start_time}s to {end_time}s")
    print(f"Output: {output_path}")

    try:
        result = add_slowmo_replay(
            input_path, output_path,
            replay_start=start_time,
            replay_end=end_time,
            slowmo_factor=0.65,
            stinger_path=stinger_path
        )
        print(f"✓ Replay complete: {result}")
        return True
    except Exception as e:
        print(f"✗ Replay failed: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


def main():
    parser = argparse.ArgumentParser(description='Test video effects')
    parser.add_argument('--test', required=True, choices=['stabilize', 'zoom', 'replay', 'all'],
                       help='Which effect to test')
    parser.add_argument('--input', required=True, help='Input video file')
    parser.add_argument('--output', help='Output video file (optional)')
    parser.add_argument('--bbox', help='Bounding box data JSON file (for zoom test)')
    parser.add_argument('--start', type=float, help='Replay start time in seconds (for replay test)')
    parser.add_argument('--end', type=float, help='Replay end time in seconds (for replay test)')
    parser.add_argument('--stinger', help='Stinger transition video (optional, for replay test)')

    args = parser.parse_args()

    success = True

    if args.test == 'stabilize' or args.test == 'all':
        print("\n" + "="*60)
        print("TESTING STABILIZATION")
        print("="*60)
        success = test_stabilization(args.input, args.output) and success

    if args.test == 'zoom' or args.test == 'all':
        print("\n" + "="*60)
        print("TESTING SMART ZOOM")
        print("="*60)
        if not args.bbox:
            print("Error: --bbox argument required for zoom test")
            success = False
        else:
            success = test_smart_zoom(args.input, args.bbox, args.output) and success

    if args.test == 'replay' or args.test == 'all':
        print("\n" + "="*60)
        print("TESTING SLOW-MOTION REPLAY")
        print("="*60)
        if args.start is None or args.end is None:
            print("Error: --start and --end arguments required for replay test")
            success = False
        else:
            success = test_replay(args.input, args.start, args.end, args.output, args.stinger) and success

    print("\n" + "="*60)
    if success:
        print("✓ ALL TESTS PASSED")
    else:
        print("✗ SOME TESTS FAILED")
    print("="*60)

    sys.exit(0 if success else 1)


if __name__ == '__main__':
    main()

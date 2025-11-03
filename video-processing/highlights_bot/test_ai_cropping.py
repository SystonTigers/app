#!/usr/bin/env python3
"""
Test script for AI-powered smart cropping
Tests YOLOv8-based automatic action tracking and vertical cropping

Usage:
    python test_ai_cropping.py --input sample.mp4 --output test_crop.mp4
    python test_ai_cropping.py --input sample.mp4 --output test_crop.mp4 --model yolov8s.pt
    python test_ai_cropping.py --check  # Check YOLO availability only

Part of Phase 9: High-Value Enhancements
Created: 2025-11-03
"""

import argparse
import os
import sys
from ai_cropping import ai_smart_crop_to_vertical, test_yolo_availability


def test_availability_only():
    """Test if YOLO is available"""
    print("\n" + "="*60)
    print("YOLO AVAILABILITY CHECK")
    print("="*60)

    if test_yolo_availability():
        print("\n✅ AI cropping is ready to use!")
        return 0
    else:
        print("\n❌ AI cropping is not available")
        print("\nTo install YOLOv8:")
        print("  pip install ultralytics")
        return 1


def test_cropping(input_path, output_path, model='yolov8n.pt',
                 smoothing=0.3, priority='ball'):
    """Test AI cropping on a video file"""

    if not os.path.exists(input_path):
        print(f"❌ Error: Input file not found: {input_path}")
        return 1

    print("\n" + "="*60)
    print("AI SMART CROPPING TEST")
    print("="*60)
    print(f"\nInput:     {input_path}")
    print(f"Output:    {output_path}")
    print(f"Model:     {model}")
    print(f"Smoothing: {smoothing}")
    print(f"Priority:  {priority}")
    print("\n" + "="*60)

    # Configuration
    config = {
        'yolo_model': model,
        'smoothing': smoothing,
        'priority': priority
    }

    try:
        # Run AI cropping
        result = ai_smart_crop_to_vertical(
            input_path,
            output_path,
            target_res=(1080, 1920),
            config=config
        )

        print("\n" + "="*60)
        print("TEST RESULT")
        print("="*60)
        print(f"\n✅ AI cropping successful!")
        print(f"   Output: {result}")

        # Check file size
        if os.path.exists(result):
            size_mb = os.path.getsize(result) / (1024 * 1024)
            print(f"   Size: {size_mb:.2f} MB")
        else:
            print(f"   ⚠️  Warning: Output file not found")

        return 0

    except Exception as e:
        print("\n" + "="*60)
        print("TEST FAILED")
        print("="*60)
        print(f"\n❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()
        return 1


def main():
    parser = argparse.ArgumentParser(
        description='Test AI-powered smart cropping for vertical shorts',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Check if YOLO is available
  python test_ai_cropping.py --check

  # Test with sample video (fast nano model)
  python test_ai_cropping.py --input sample.mp4 --output test_crop.mp4

  # Test with small model (more accurate)
  python test_ai_cropping.py --input sample.mp4 --output test_crop.mp4 --model yolov8s.pt

  # Test with custom smoothing
  python test_ai_cropping.py --input sample.mp4 --output test_crop.mp4 --smoothing 0.2

  # Test with players priority instead of ball
  python test_ai_cropping.py --input sample.mp4 --output test_crop.mp4 --priority players
        """
    )

    parser.add_argument('--check', action='store_true',
                       help='Check YOLO availability only (no video processing)')
    parser.add_argument('--input', type=str,
                       help='Input video file (16:9 landscape)')
    parser.add_argument('--output', type=str,
                       help='Output video file (9:16 vertical)')
    parser.add_argument('--model', type=str, default='yolov8n.pt',
                       choices=['yolov8n.pt', 'yolov8s.pt', 'yolov8m.pt'],
                       help='YOLO model: n=fastest, s=balanced, m=accurate (default: yolov8n.pt)')
    parser.add_argument('--smoothing', type=float, default=0.3,
                       help='EMA smoothing factor (0.2-0.4, default: 0.3)')
    parser.add_argument('--priority', type=str, default='ball',
                       choices=['ball', 'players', 'center_of_mass'],
                       help='Tracking priority (default: ball)')

    args = parser.parse_args()

    # Check mode
    if args.check:
        return test_availability_only()

    # Cropping mode
    if not args.input or not args.output:
        parser.print_help()
        print("\n❌ Error: --input and --output are required (or use --check)")
        return 1

    return test_cropping(
        args.input,
        args.output,
        model=args.model,
        smoothing=args.smoothing,
        priority=args.priority
    )


if __name__ == '__main__':
    sys.exit(main())

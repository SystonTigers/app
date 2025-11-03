#!/usr/bin/env python3
"""
Test script for broadcast overlay generation
Tests scorebug, lower-thirds, and opening/closing slates
"""

import argparse
import os
import sys
import json
from pathlib import Path

from overlays import (
    create_scorebug, apply_scorebug,
    create_goal_lowerthird, apply_lowerthird,
    create_opening_slate, create_closing_slate
)


def test_scorebug(output_dir='test_output'):
    """Test scorebug creation and application"""
    print("\n" + "="*60)
    print("TESTING SCOREBUG")
    print("="*60)

    os.makedirs(output_dir, exist_ok=True)

    # Sample match metadata
    match_meta = {
        'home_short': 'MAN',
        'away_short': 'LIV',
        'score': '2-1',
        'current_minute': 45
    }

    # Sample brand assets
    brand_assets = {
        'font_bold': 'brand/fonts/Inter-Bold.ttf',
        'home_badge': 'brand/badges/home_team.png',
        'away_badge': 'brand/badges/away_team.png'
    }

    # Create scorebug
    scorebug_path = os.path.join(output_dir, 'scorebug.png')

    try:
        result = create_scorebug(match_meta, brand_assets, scorebug_path)
        print(f"✓ Scorebug created: {result}")

        # Check if file exists
        if os.path.exists(scorebug_path):
            file_size = os.path.getsize(scorebug_path)
            print(f"  File size: {file_size} bytes")
            return True
        else:
            print("✗ Scorebug file not created")
            return False

    except Exception as e:
        print(f"✗ Scorebug creation failed: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


def test_lowerthird(output_dir='test_output'):
    """Test goal lower-third creation"""
    print("\n" + "="*60)
    print("TESTING GOAL LOWER-THIRD")
    print("="*60)

    os.makedirs(output_dir, exist_ok=True)

    # Sample event data
    event_data = {
        'player': 'Mohamed Salah',
        'team': 'Liverpool',
        'minute': '67',
        'assister': 'Trent Alexander-Arnold'
    }

    # Sample brand assets
    brand_assets = {
        'font_bold': 'brand/fonts/Inter-Bold.ttf',
        'font_regular': 'brand/fonts/Inter-Regular.ttf'
    }

    # Create lower-third
    lowerthird_path = os.path.join(output_dir, 'lowerthird.png')

    try:
        result = create_goal_lowerthird(event_data, brand_assets, lowerthird_path)
        print(f"✓ Lower-third created: {result}")

        # Check if file exists
        if os.path.exists(lowerthird_path):
            file_size = os.path.getsize(lowerthird_path)
            print(f"  File size: {file_size} bytes")
            return True
        else:
            print("✗ Lower-third file not created")
            return False

    except Exception as e:
        print(f"✗ Lower-third creation failed: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


def test_slates(output_dir='test_output'):
    """Test opening and closing slate creation"""
    print("\n" + "="*60)
    print("TESTING OPENING/CLOSING SLATES")
    print("="*60)

    os.makedirs(output_dir, exist_ok=True)

    # Sample match metadata for opening slate
    opening_meta = {
        'home': 'Manchester United',
        'away': 'Liverpool',
        'competition': 'Premier League',
        'date': '2025-03-15',
        'venue': 'Old Trafford'
    }

    # Sample match metadata for closing slate
    closing_meta = {
        'home': 'Manchester United',
        'away': 'Liverpool',
        'final_score': '2-3',
        'motm': 'Mohamed Salah',
        'cta': 'Subscribe for more highlights!'
    }

    # Sample brand assets
    brand_assets = {
        'club_badge': 'brand/badges/club.png',
        'sponsor_logo': 'brand/badges/sponsor.png'
    }

    success = True

    # Test opening slate
    print("\nTesting Opening Slate...")
    opening_path = os.path.join(output_dir, 'opening_slate.mp4')

    try:
        result = create_opening_slate(opening_meta, brand_assets, opening_path, duration=2.5)
        print(f"✓ Opening slate created: {result}")

        if os.path.exists(opening_path):
            file_size = os.path.getsize(opening_path)
            print(f"  File size: {file_size} bytes")
        else:
            print("✗ Opening slate file not created")
            success = False

    except Exception as e:
        print(f"✗ Opening slate creation failed: {str(e)}")
        import traceback
        traceback.print_exc()
        success = False

    # Test closing slate
    print("\nTesting Closing Slate...")
    closing_path = os.path.join(output_dir, 'closing_slate.mp4')

    try:
        result = create_closing_slate(closing_meta, brand_assets, closing_path, duration=3.0)
        print(f"✓ Closing slate created: {result}")

        if os.path.exists(closing_path):
            file_size = os.path.getsize(closing_path)
            print(f"  File size: {file_size} bytes")
        else:
            print("✗ Closing slate file not created")
            success = False

    except Exception as e:
        print(f"✗ Closing slate creation failed: {str(e)}")
        import traceback
        traceback.print_exc()
        success = False

    return success


def test_apply_overlays(video_path, output_dir='test_output'):
    """Test applying overlays to actual video"""
    print("\n" + "="*60)
    print("TESTING OVERLAY APPLICATION")
    print("="*60)

    if not os.path.exists(video_path):
        print(f"Error: Test video not found: {video_path}")
        print("Skipping overlay application tests")
        return True  # Don't fail if no test video

    os.makedirs(output_dir, exist_ok=True)

    success = True

    # Test scorebug application
    print("\nApplying scorebug to video...")
    scorebug_path = os.path.join(output_dir, 'scorebug.png')
    if not os.path.exists(scorebug_path):
        print("  Creating scorebug first...")
        match_meta = {'home_short': 'MAN', 'away_short': 'LIV', 'score': '2-1', 'current_minute': 45}
        brand_assets = {}
        create_scorebug(match_meta, brand_assets, scorebug_path)

    output_video = os.path.join(output_dir, 'video_with_scorebug.mp4')

    try:
        result = apply_scorebug(video_path, scorebug_path, output_video, position='top-left')
        print(f"✓ Scorebug applied to video: {result}")
    except Exception as e:
        print(f"✗ Scorebug application failed: {str(e)}")
        success = False

    # Test lower-third application
    print("\nApplying lower-third to video...")
    lowerthird_path = os.path.join(output_dir, 'lowerthird.png')
    if not os.path.exists(lowerthird_path):
        print("  Creating lower-third first...")
        event_data = {'player': 'Mohamed Salah', 'team': 'Liverpool', 'minute': '67', 'assister': 'TAA'}
        brand_assets = {}
        create_goal_lowerthird(event_data, brand_assets, lowerthird_path)

    output_video = os.path.join(output_dir, 'video_with_lowerthird.mp4')

    try:
        result = apply_lowerthird(video_path, lowerthird_path, output_video, start_time=2.0, duration=3.0)
        print(f"✓ Lower-third applied to video: {result}")
    except Exception as e:
        print(f"✗ Lower-third application failed: {str(e)}")
        success = False

    return success


def main():
    parser = argparse.ArgumentParser(description='Test broadcast overlays')
    parser.add_argument('--test', required=True, choices=['scorebug', 'lowerthird', 'slates', 'apply', 'all'],
                       help='Which overlay test to run')
    parser.add_argument('--output', default='test_output', help='Output directory for test files')
    parser.add_argument('--video', help='Test video file (for apply test)')

    args = parser.parse_args()

    success = True

    if args.test == 'scorebug' or args.test == 'all':
        success = test_scorebug(args.output) and success

    if args.test == 'lowerthird' or args.test == 'all':
        success = test_lowerthird(args.output) and success

    if args.test == 'slates' or args.test == 'all':
        success = test_slates(args.output) and success

    if args.test == 'apply' or args.test == 'all':
        if args.video:
            success = test_apply_overlays(args.video, args.output) and success
        elif args.test == 'apply':
            print("Error: --video argument required for apply test")
            success = False

    print("\n" + "="*60)
    if success:
        print("✓ ALL TESTS PASSED")
    else:
        print("✗ SOME TESTS FAILED")
    print("="*60)

    sys.exit(0 if success else 1)


if __name__ == '__main__':
    main()

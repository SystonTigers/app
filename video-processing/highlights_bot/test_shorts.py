#!/usr/bin/env python3
"""
Test script for vertical shorts generation
Tests smart cropping, vertical overlays, and full shorts pipeline
"""

import argparse
import os
import sys
import json
from pathlib import Path

from shorts import (
    smart_crop_to_vertical,
    add_vertical_overlays,
    extract_clip,
    generate_vertical_shorts,
    add_trending_effects,
    generate_thumbnail,
    batch_export_for_platforms
)


def test_smart_crop(input_path, output_path=None, bbox_file=None):
    """Test smart crop to vertical"""
    print("\n" + "="*60)
    print("TESTING SMART CROP TO VERTICAL")
    print("="*60)

    if not os.path.exists(input_path):
        print(f"Error: Input file not found: {input_path}")
        return False

    if output_path is None:
        output_path = input_path.replace('.mp4', '_vertical.mp4')

    # Load bbox data if provided
    bbox_data = None
    if bbox_file and os.path.exists(bbox_file):
        with open(bbox_file, 'r') as f:
            bbox_data = json.load(f)
        print(f"Loaded bbox data: {len(bbox_data)} entries")

    print(f"Input: {input_path}")
    print(f"Output: {output_path}")
    print(f"Target resolution: 1080x1920 (9:16)")

    try:
        result = smart_crop_to_vertical(input_path, output_path, bbox_data)
        print(f"\n✓ Smart crop complete: {result}")
        return True

    except Exception as e:
        print(f"\n✗ Smart crop failed: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


def test_vertical_overlays(input_path, output_path=None):
    """Test vertical overlays"""
    print("\n" + "="*60)
    print("TESTING VERTICAL OVERLAYS")
    print("="*60)

    if not os.path.exists(input_path):
        print(f"Error: Input file not found: {input_path}")
        return False

    if output_path is None:
        output_path = input_path.replace('.mp4', '_with_overlays.mp4')

    # Sample event data
    event = {
        'type': 'goal',
        'player': 'Mohamed Salah',
        'team': 'Liverpool',
        'minute': '67',
        'score': 8.5
    }

    # Sample match metadata
    match_meta = {
        'home': 'Manchester United',
        'away': 'Liverpool',
        'cta_short': 'Follow for more highlights!'
    }

    # Sample brand assets
    brand_assets = {
        'club_badge': 'brand/badges/club.png'
    }

    print(f"Input: {input_path}")
    print(f"Output: {output_path}")
    print(f"Event: {event['type']} - {event['player']}")

    try:
        result = add_vertical_overlays(input_path, output_path, event, match_meta, brand_assets)
        print(f"\n✓ Vertical overlays complete: {result}")
        return True

    except Exception as e:
        print(f"\n✗ Vertical overlays failed: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


def test_extract_clip(input_path, start=5, end=15, output_path=None):
    """Test clip extraction"""
    print("\n" + "="*60)
    print("TESTING CLIP EXTRACTION")
    print("="*60)

    if not os.path.exists(input_path):
        print(f"Error: Input file not found: {input_path}")
        return False

    if output_path is None:
        output_path = input_path.replace('.mp4', f'_clip_{start}-{end}.mp4')

    print(f"Input: {input_path}")
    print(f"Output: {output_path}")
    print(f"Time range: {start}s - {end}s")

    try:
        result = extract_clip(input_path, start, end, output_path)
        print(f"\n✓ Clip extraction complete: {result}")
        return True

    except Exception as e:
        print(f"\n✗ Clip extraction failed: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


def test_generate_shorts(input_path, events_file, output_dir='test_output/shorts', count=3):
    """Test full shorts generation pipeline"""
    print("\n" + "="*60)
    print("TESTING FULL SHORTS GENERATION")
    print("="*60)

    if not os.path.exists(input_path):
        print(f"Error: Input file not found: {input_path}")
        return False

    if not os.path.exists(events_file):
        print(f"Error: Events file not found: {events_file}")
        return False

    # Load events
    with open(events_file, 'r') as f:
        events = json.load(f)

    print(f"Input video: {input_path}")
    print(f"Events file: {events_file}")
    print(f"Events loaded: {len(events)}")
    print(f"Output directory: {output_dir}")
    print(f"Shorts to generate: {count}")

    # Sample match metadata
    match_meta = {
        'home': 'Manchester United',
        'away': 'Liverpool',
        'cta_short': 'Follow for more highlights!'
    }

    # Sample brand assets
    brand_assets = {
        'club_badge': 'brand/badges/club.png'
    }

    # Configuration
    config = {
        'shorts': {
            'count': count,
            'min_score': 2.0
        }
    }

    try:
        result = generate_vertical_shorts(
            events, input_path, match_meta, brand_assets, config, output_dir
        )
        print(f"\n✓ Shorts generation complete!")
        print(f"  Generated {len(result)} shorts:")
        for idx, short in enumerate(result, 1):
            print(f"    {idx}. {short['path']} ({short['duration']:.1f}s, score: {short['score']:.1f})")
        return True

    except Exception as e:
        print(f"\n✗ Shorts generation failed: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


def test_trending_effects(input_path, output_path=None, effect='zoom_pulse'):
    """Test trending social media effects"""
    print("\n" + "="*60)
    print("TESTING TRENDING EFFECTS")
    print("="*60)

    if not os.path.exists(input_path):
        print(f"Error: Input file not found: {input_path}")
        return False

    if output_path is None:
        output_path = input_path.replace('.mp4', f'_{effect}.mp4')

    print(f"Input: {input_path}")
    print(f"Output: {output_path}")
    print(f"Effect: {effect}")

    try:
        result = add_trending_effects(input_path, output_path, effect_type=effect)
        print(f"\n✓ Trending effects complete: {result}")
        return True

    except Exception as e:
        print(f"\n✗ Trending effects failed: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


def test_thumbnail(input_path, output_path=None, timestamp=None):
    """Test thumbnail generation"""
    print("\n" + "="*60)
    print("TESTING THUMBNAIL GENERATION")
    print("="*60)

    if not os.path.exists(input_path):
        print(f"Error: Input file not found: {input_path}")
        return False

    if output_path is None:
        output_path = input_path.replace('.mp4', '_thumbnail.jpg')

    print(f"Input: {input_path}")
    print(f"Output: {output_path}")
    if timestamp:
        print(f"Timestamp: {timestamp}s")
    else:
        print(f"Timestamp: middle of video")

    try:
        result = generate_thumbnail(input_path, output_path, timestamp)
        print(f"\n✓ Thumbnail generation complete: {result}")
        return True

    except Exception as e:
        print(f"\n✗ Thumbnail generation failed: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


def test_platform_export(input_path, output_dir='test_output/platforms'):
    """Test platform-specific exports"""
    print("\n" + "="*60)
    print("TESTING PLATFORM EXPORTS")
    print("="*60)

    if not os.path.exists(input_path):
        print(f"Error: Input file not found: {input_path}")
        return False

    print(f"Input: {input_path}")
    print(f"Output directory: {output_dir}")
    print(f"Platforms: TikTok, Instagram Reels, YouTube Shorts")

    try:
        result = batch_export_for_platforms(
            input_path, output_dir,
            platforms=['tiktok', 'reels', 'shorts']
        )
        print(f"\n✓ Platform exports complete!")
        for platform, path in result.items():
            print(f"  {platform}: {path}")
        return True

    except Exception as e:
        print(f"\n✗ Platform exports failed: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


def main():
    parser = argparse.ArgumentParser(description='Test vertical shorts generation')
    parser.add_argument('--test', required=True,
                       choices=['crop', 'overlays', 'extract', 'generate', 'effects', 'thumbnail', 'export', 'all'],
                       help='Which shorts test to run')
    parser.add_argument('--input', required=True, help='Input video file')
    parser.add_argument('--output', help='Output file/directory (optional)')
    parser.add_argument('--events', help='Events JSON file (for generate test)')
    parser.add_argument('--bbox', help='Bounding box data JSON file (for crop test)')
    parser.add_argument('--start', type=float, default=5, help='Start time for clip extraction')
    parser.add_argument('--end', type=float, default=15, help='End time for clip extraction')
    parser.add_argument('--count', type=int, default=3, help='Number of shorts to generate')
    parser.add_argument('--effect', default='zoom_pulse', choices=['zoom_pulse', 'speed_ramp'],
                       help='Trending effect type')
    parser.add_argument('--timestamp', type=float, help='Thumbnail timestamp in seconds')

    args = parser.parse_args()

    success = True

    if args.test == 'crop' or args.test == 'all':
        success = test_smart_crop(args.input, args.output, args.bbox) and success

    if args.test == 'overlays' or args.test == 'all':
        success = test_vertical_overlays(args.input, args.output) and success

    if args.test == 'extract' or args.test == 'all':
        success = test_extract_clip(args.input, args.start, args.end, args.output) and success

    if args.test == 'generate' or args.test == 'all':
        if args.events:
            output_dir = args.output or 'test_output/shorts'
            success = test_generate_shorts(args.input, args.events, output_dir, args.count) and success
        elif args.test == 'generate':
            print("Error: --events argument required for generate test")
            success = False

    if args.test == 'effects' or args.test == 'all':
        success = test_trending_effects(args.input, args.output, args.effect) and success

    if args.test == 'thumbnail' or args.test == 'all':
        success = test_thumbnail(args.input, args.output, args.timestamp) and success

    if args.test == 'export' or args.test == 'all':
        output_dir = args.output or 'test_output/platforms'
        success = test_platform_export(args.input, output_dir) and success

    print("\n" + "="*60)
    if success:
        print("✓ ALL TESTS PASSED")
    else:
        print("✗ SOME TESTS FAILED")
    print("="*60)

    sys.exit(0 if success else 1)


if __name__ == '__main__':
    main()

#!/usr/bin/env python3
"""
Test script for SRT caption generation and burn-in
Tests caption generation, validation, and video burn-in
"""

import argparse
import os
import sys
import json
from pathlib import Path

from captions import (
    format_srt_time,
    generate_srt_captions,
    burn_caption,
    burn_srt_file,
    generate_caption_text,
    add_auto_captions,
    validate_srt_file
)


def test_format_time():
    """Test SRT time formatting"""
    print("\n" + "="*60)
    print("TESTING SRT TIME FORMATTING")
    print("="*60)

    test_cases = [
        (0, "00:00:00,000"),
        (1.5, "00:00:01,500"),
        (65, "00:01:05,000"),
        (3661.250, "01:01:01,250"),
        (7322.999, "02:02:02,999")
    ]

    success = True
    for seconds, expected in test_cases:
        result = format_srt_time(seconds)
        status = "✓" if result == expected else "✗"
        print(f"{status} {seconds}s → {result} (expected: {expected})")
        if result != expected:
            success = False

    if success:
        print("\n✓ All time formatting tests passed")
    else:
        print("\n✗ Some time formatting tests failed")

    return success


def test_generate_srt(events_file, output_path=None):
    """Test SRT generation from events"""
    print("\n" + "="*60)
    print("TESTING SRT GENERATION")
    print("="*60)

    if not os.path.exists(events_file):
        print(f"Error: Events file not found: {events_file}")
        return False

    if output_path is None:
        output_path = 'test_output/captions.srt'

    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    # Load events
    with open(events_file, 'r') as f:
        events = json.load(f)

    # Match metadata
    match_meta = {
        'home': 'Manchester United',
        'away': 'Liverpool'
    }

    print(f"Events file: {events_file}")
    print(f"Events loaded: {len(events)}")
    print(f"Output: {output_path}")

    try:
        result = generate_srt_captions(events, match_meta, output_path)

        # Read and display first few entries
        print("\nFirst 3 SRT entries:")
        with open(output_path, 'r', encoding='utf-8') as f:
            lines = f.readlines()
            for i, line in enumerate(lines[:15]):  # Show first 3 entries (5 lines each)
                print(f"  {line.rstrip()}")

        return True

    except Exception as e:
        print(f"\n✗ SRT generation failed: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


def test_validate_srt(srt_path):
    """Test SRT validation"""
    print("\n" + "="*60)
    print("TESTING SRT VALIDATION")
    print("="*60)

    if not os.path.exists(srt_path):
        print(f"Error: SRT file not found: {srt_path}")
        return False

    print(f"SRT file: {srt_path}")

    try:
        errors = validate_srt_file(srt_path)

        if errors:
            print("\n✗ SRT validation failed:")
            for error in errors:
                print(f"  - {error}")
            return False
        else:
            print("\n✓ SRT file is valid")
            return True

    except Exception as e:
        print(f"\n✗ Validation failed: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


def test_burn_caption_text(input_path, output_path=None):
    """Test burning text caption into video"""
    print("\n" + "="*60)
    print("TESTING TEXT CAPTION BURN-IN")
    print("="*60)

    if not os.path.exists(input_path):
        print(f"Error: Input file not found: {input_path}")
        return False

    if output_path is None:
        output_path = input_path.replace('.mp4', '_with_caption.mp4')

    caption_text = "⚽ GOAL! Mohamed Salah (67')"

    print(f"Input: {input_path}")
    print(f"Output: {output_path}")
    print(f"Caption: {caption_text}")

    try:
        result = burn_caption(
            input_path, output_path,
            caption_text,
            position='top',
            duration=5.0,
            font_size=48
        )
        print(f"\n✓ Text caption burned: {result}")
        return True

    except Exception as e:
        print(f"\n✗ Text caption burn failed: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


def test_burn_srt(input_path, srt_path, output_path=None):
    """Test burning SRT file into video"""
    print("\n" + "="*60)
    print("TESTING SRT FILE BURN-IN")
    print("="*60)

    if not os.path.exists(input_path):
        print(f"Error: Input file not found: {input_path}")
        return False

    if not os.path.exists(srt_path):
        print(f"Error: SRT file not found: {srt_path}")
        return False

    if output_path is None:
        output_path = input_path.replace('.mp4', '_with_srt.mp4')

    print(f"Input: {input_path}")
    print(f"SRT: {srt_path}")
    print(f"Output: {output_path}")

    try:
        result = burn_srt_file(input_path, output_path, srt_path, font_size=24)
        print(f"\n✓ SRT burned into video: {result}")
        return True

    except Exception as e:
        print(f"\n✗ SRT burn failed: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


def test_caption_text_generation():
    """Test caption text generation for various event types"""
    print("\n" + "="*60)
    print("TESTING CAPTION TEXT GENERATION")
    print("="*60)

    test_events = [
        {'type': 'goal', 'player': 'Mohamed Salah', 'team': 'Liverpool'},
        {'type': 'chance', 'team': 'Manchester United'},
        {'type': 'card', 'player': 'Bruno Fernandes', 'card_type': 'yellow'},
        {'type': 'card', 'player': 'Casemiro', 'card_type': 'red'},
        {'type': 'skill', 'player': 'Marcus Rashford'},
        {'type': 'save', 'player': 'Alisson'},
    ]

    success = True
    for event in test_events:
        caption = generate_caption_text(event)
        print(f"  {event['type']:10s} → {caption}")

    print("\n✓ Caption text generation complete")
    return success


def test_auto_captions(input_path, events_file, output_path=None):
    """Test automatic captions"""
    print("\n" + "="*60)
    print("TESTING AUTO CAPTIONS")
    print("="*60)

    if not os.path.exists(input_path):
        print(f"Error: Input file not found: {input_path}")
        return False

    if not os.path.exists(events_file):
        print(f"Error: Events file not found: {events_file}")
        return False

    if output_path is None:
        output_path = input_path.replace('.mp4', '_auto_captions.mp4')

    # Load events
    with open(events_file, 'r') as f:
        events = json.load(f)

    print(f"Input: {input_path}")
    print(f"Events: {events_file} ({len(events)} events)")
    print(f"Output: {output_path}")

    try:
        result = add_auto_captions(input_path, output_path, events, style='modern')
        print(f"\n✓ Auto captions added: {result}")
        return True

    except Exception as e:
        print(f"\n✗ Auto captions failed: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


def main():
    parser = argparse.ArgumentParser(description='Test SRT caption generation and burn-in')
    parser.add_argument('--test', required=True,
                       choices=['format', 'generate', 'validate', 'burn-text', 'burn-srt',
                               'caption-text', 'auto', 'all'],
                       help='Which caption test to run')
    parser.add_argument('--events', help='Events JSON file')
    parser.add_argument('--srt', help='SRT file path')
    parser.add_argument('--input', help='Input video file')
    parser.add_argument('--output', help='Output file (optional)')

    args = parser.parse_args()

    success = True

    if args.test == 'format' or args.test == 'all':
        success = test_format_time() and success

    if args.test == 'generate' or args.test == 'all':
        if args.events:
            success = test_generate_srt(args.events, args.output) and success
        elif args.test == 'generate':
            print("Error: --events argument required for generate test")
            success = False

    if args.test == 'validate' or args.test == 'all':
        if args.srt:
            success = test_validate_srt(args.srt) and success
        elif args.test == 'validate':
            print("Error: --srt argument required for validate test")
            success = False

    if args.test == 'burn-text' or args.test == 'all':
        if args.input:
            success = test_burn_caption_text(args.input, args.output) and success
        elif args.test == 'burn-text':
            print("Error: --input argument required for burn-text test")
            success = False

    if args.test == 'burn-srt' or args.test == 'all':
        if args.input and args.srt:
            success = test_burn_srt(args.input, args.srt, args.output) and success
        elif args.test == 'burn-srt':
            print("Error: --input and --srt arguments required for burn-srt test")
            success = False

    if args.test == 'caption-text' or args.test == 'all':
        success = test_caption_text_generation() and success

    if args.test == 'auto' or args.test == 'all':
        if args.input and args.events:
            success = test_auto_captions(args.input, args.events, args.output) and success
        elif args.test == 'auto':
            print("Error: --input and --events arguments required for auto test")
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

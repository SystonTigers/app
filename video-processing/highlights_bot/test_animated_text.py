#!/usr/bin/env python3
"""
Test script for animated text effects
Tests all animation effects (pop, slide, bounce, pulse, fade, typewriter)
"""

import argparse
import os
import sys
from pathlib import Path

from animated_text import (
    add_animated_caption,
    add_event_caption_animated,
    get_effect_info,
    test_all_effects,
    EFFECT_LIBRARY
)


def test_single_effect(input_path, effect='pop', output_path=None):
    """Test a single animation effect"""
    print("\n" + "="*60)
    print(f"TESTING {effect.upper()} EFFECT")
    print("="*60)

    if not os.path.exists(input_path):
        print(f"Error: Input file not found: {input_path}")
        return False

    if output_path is None:
        output_path = input_path.replace('.mp4', f'_{effect}.mp4')

    caption_text = "⚽ GOAL! Mohamed Salah"

    print(f"Input: {input_path}")
    print(f"Output: {output_path}")
    print(f"Effect: {effect}")
    print(f"Caption: {caption_text}")

    effect_info = EFFECT_LIBRARY.get(effect)
    if effect_info:
        print(f"Description: {effect_info['description']}")
        print(f"Duration: {effect_info['duration']}s")
        print(f"Best for: {effect_info['best_for']}")

    try:
        result = add_animated_caption(
            input_path,
            output_path,
            caption_text,
            effect=effect,
            position='bottom',
            duration=5.0,
            font_size=56
        )
        print(f"\n✓ Effect test complete: {result}")
        return True

    except Exception as e:
        print(f"\n✗ Effect test failed: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


def test_all_effects_batch(input_path, output_dir='test_output/animated_text'):
    """Test all animation effects"""
    print("\n" + "="*60)
    print("TESTING ALL ANIMATION EFFECTS")
    print("="*60)

    if not os.path.exists(input_path):
        print(f"Error: Input file not found: {input_path}")
        return False

    print(f"Input: {input_path}")
    print(f"Output directory: {output_dir}")
    print(f"Effects to test: {list(EFFECT_LIBRARY.keys())}")

    try:
        outputs = test_all_effects(input_path, output_dir)

        print(f"\n✓ All effects tested successfully!")
        print(f"  Generated {len(outputs)} test videos:")
        for output in outputs:
            print(f"    - {output}")

        return True

    except Exception as e:
        print(f"\n✗ Batch test failed: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


def test_event_caption(input_path, event_type='goal', output_path=None):
    """Test event-based caption with auto effect selection"""
    print("\n" + "="*60)
    print(f"TESTING EVENT CAPTION ({event_type.upper()})")
    print("="*60)

    if not os.path.exists(input_path):
        print(f"Error: Input file not found: {input_path}")
        return False

    if output_path is None:
        output_path = input_path.replace('.mp4', f'_event_{event_type}.mp4')

    # Sample event data
    events = {
        'goal': {
            'type': 'goal',
            'player': 'Mohamed Salah',
            'team': 'Liverpool',
            'minute': '67'
        },
        'save': {
            'type': 'save',
            'player': 'Alisson',
            'team': 'Liverpool',
            'minute': '23'
        },
        'skill': {
            'type': 'skill',
            'player': 'Marcus Rashford',
            'team': 'Man Utd',
            'minute': '45'
        },
        'card': {
            'type': 'card',
            'player': 'Bruno Fernandes',
            'team': 'Man Utd',
            'card_type': 'yellow',
            'minute': '78'
        },
        'chance': {
            'type': 'chance',
            'team': 'Liverpool',
            'minute': '12'
        }
    }

    event = events.get(event_type, events['goal'])

    print(f"Input: {input_path}")
    print(f"Output: {output_path}")
    print(f"Event: {event}")

    try:
        result = add_event_caption_animated(
            input_path,
            output_path,
            event,
            effect='auto'  # Auto-select based on event type
        )
        print(f"\n✓ Event caption test complete: {result}")
        return True

    except Exception as e:
        print(f"\n✗ Event caption test failed: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


def test_effect_info():
    """Test effect info retrieval"""
    print("\n" + "="*60)
    print("EFFECT LIBRARY INFORMATION")
    print("="*60)

    effect_info = get_effect_info()

    print(f"\nTotal effects available: {len(effect_info)}")
    print("\nEffect Details:\n")

    for effect_name, info in effect_info.items():
        print(f"  {effect_name.upper()}:")
        print(f"    Description: {info['description']}")
        print(f"    Duration: {info['duration']}s" if info['duration'] else "    Duration: Continuous")
        print(f"    Best for: {info['best_for']}")
        print()

    return True


def main():
    parser = argparse.ArgumentParser(description='Test animated text effects')
    parser.add_argument('--test', required=True,
                       choices=['single', 'all', 'event', 'info'],
                       help='Which test to run')
    parser.add_argument('--input', help='Input video file')
    parser.add_argument('--output', help='Output file (optional)')
    parser.add_argument('--effect', default='pop',
                       choices=list(EFFECT_LIBRARY.keys()),
                       help='Effect to test (for single test)')
    parser.add_argument('--event-type', default='goal',
                       choices=['goal', 'save', 'skill', 'card', 'chance'],
                       help='Event type to test (for event test)')
    parser.add_argument('--output-dir', default='test_output/animated_text',
                       help='Output directory (for all test)')

    args = parser.parse_args()

    success = True

    if args.test == 'info':
        success = test_effect_info()

    elif args.test == 'single':
        if not args.input:
            print("Error: --input argument required for single test")
            success = False
        else:
            success = test_single_effect(args.input, args.effect, args.output)

    elif args.test == 'all':
        if not args.input:
            print("Error: --input argument required for all test")
            success = False
        else:
            success = test_all_effects_batch(args.input, args.output_dir)

    elif args.test == 'event':
        if not args.input:
            print("Error: --input argument required for event test")
            success = False
        else:
            success = test_event_caption(args.input, args.event_type, args.output)

    print("\n" + "="*60)
    if success:
        print("✓ ALL TESTS PASSED")
    else:
        print("✗ SOME TESTS FAILED")
    print("="*60)

    sys.exit(0 if success else 1)


if __name__ == '__main__':
    main()

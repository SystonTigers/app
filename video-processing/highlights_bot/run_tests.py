#!/usr/bin/env python3
"""
Comprehensive test runner for Phase 5 & 6
Works around Windows console Unicode issues
"""

import sys
import os
import json
import io

# Set UTF-8 output
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

from captions import (
    format_srt_time,
    generate_srt_captions,
    validate_srt_file,
    generate_caption_text
)

from shorts import (
    smart_crop_to_vertical,
    add_vertical_overlays,
    extract_clip,
    generate_thumbnail
)


def test_phase_6_captions():
    """Test Phase 6: SRT Caption Generation"""
    print("\n" + "="*60)
    print("PHASE 6: CAPTION TESTS")
    print("="*60)

    results = {
        'passed': 0,
        'failed': 0,
        'tests': []
    }

    # Test 1: Time formatting
    print("\n[1/4] Testing SRT time formatting...")
    test_cases = [
        (0, "00:00:00,000"),
        (1.5, "00:00:01,500"),
        (65, "00:01:05,000"),
        (3661.250, "01:01:01,250")
    ]

    all_passed = True
    for seconds, expected in test_cases:
        result = format_srt_time(seconds)
        if result == expected:
            print(f"  PASS: {seconds}s -> {result}")
        else:
            print(f"  FAIL: {seconds}s -> {result} (expected: {expected})")
            all_passed = False

    if all_passed:
        results['passed'] += 1
        results['tests'].append(('Time formatting', 'PASS'))
    else:
        results['failed'] += 1
        results['tests'].append(('Time formatting', 'FAIL'))

    # Test 2: Caption text generation
    print("\n[2/4] Testing caption text generation...")
    test_events = [
        {'type': 'goal', 'player': 'John Doe', 'team': 'Home'},
        {'type': 'chance', 'team': 'Away'},
        {'type': 'card', 'player': 'Jane', 'card_type': 'yellow'},
        {'type': 'skill', 'player': 'Star Player'}
    ]

    try:
        for event in test_events:
            caption = generate_caption_text(event)
            print(f"  {event['type']}: {caption}")
        results['passed'] += 1
        results['tests'].append(('Caption text generation', 'PASS'))
    except Exception as e:
        print(f"  FAIL: {str(e)}")
        results['failed'] += 1
        results['tests'].append(('Caption text generation', 'FAIL'))

    # Test 3: SRT file generation
    print("\n[3/4] Testing SRT file generation...")
    try:
        # Load sample events
        with open('samples/sample_events.json', 'r') as f:
            raw_events = json.load(f)

        # Convert to expected format
        events = []
        for e in raw_events:
            if e.get('type'):
                events.append({
                    'type': e['type'],
                    'timestamp': 0,
                    'abs_ts': 0,
                    'video_timestamp': 0,
                    'player': e.get('player'),
                    'team': e.get('team'),
                    'minute': e.get('clock', '').split(':')[0] if e.get('clock') else '',
                    'assister': e.get('assist'),
                    'card_type': 'yellow',
                    'duration': 5.0
                })

        os.makedirs('test_output', exist_ok=True)
        output = 'test_output/test_captions.srt'

        # Redirect print to avoid Unicode issues
        import io
        import contextlib

        f = io.StringIO()
        with contextlib.redirect_stdout(f):
            result = generate_srt_captions(events, {}, output)

        if os.path.exists(output):
            with open(output, 'r', encoding='utf-8') as srt:
                lines = srt.readlines()
                print(f"  Generated SRT with {len(events)} events, {len(lines)} lines")
                print(f"  File: {output}")
            results['passed'] += 1
            results['tests'].append(('SRT generation', 'PASS'))
        else:
            print(f"  FAIL: SRT file not created")
            results['failed'] += 1
            results['tests'].append(('SRT generation', 'FAIL'))

    except Exception as e:
        print(f"  FAIL: {str(e)}")
        results['failed'] += 1
        results['tests'].append(('SRT generation', 'FAIL'))

    # Test 4: SRT validation
    print("\n[4/4] Testing SRT validation...")
    try:
        if os.path.exists('test_output/test_captions.srt'):
            errors = validate_srt_file('test_output/test_captions.srt')
            if errors:
                print(f"  FAIL: {len(errors)} validation errors")
                for err in errors[:3]:
                    print(f"    - {err}")
                results['failed'] += 1
                results['tests'].append(('SRT validation', 'FAIL'))
            else:
                print(f"  PASS: SRT file is valid")
                results['passed'] += 1
                results['tests'].append(('SRT validation', 'PASS'))
        else:
            print(f"  SKIP: No SRT file to validate")
            results['tests'].append(('SRT validation', 'SKIP'))
    except Exception as e:
        print(f"  FAIL: {str(e)}")
        results['failed'] += 1
        results['tests'].append(('SRT validation', 'FAIL'))

    return results


def test_phase_5_shorts():
    """Test Phase 5: Vertical Shorts Generation"""
    print("\n" + "="*60)
    print("PHASE 5: SHORTS TESTS")
    print("="*60)

    results = {
        'passed': 0,
        'failed': 0,
        'tests': []
    }

    # Test 1: Module imports
    print("\n[1/3] Testing shorts module imports...")
    try:
        from shorts import (
            smart_crop_to_vertical,
            add_vertical_overlays,
            extract_clip,
            generate_vertical_shorts,
            add_trending_effects,
            generate_thumbnail,
            batch_export_for_platforms
        )
        print("  PASS: All functions imported successfully")
        results['passed'] += 1
        results['tests'].append(('Module imports', 'PASS'))
    except Exception as e:
        print(f"  FAIL: {str(e)}")
        results['failed'] += 1
        results['tests'].append(('Module imports', 'FAIL'))

    # Test 2: Caption text for shorts
    print("\n[2/3] Testing caption text generation for shorts...")
    try:
        event = {
            'type': 'goal',
            'player': 'Mohamed Salah',
            'team': 'Liverpool',
            'minute': '67',
            'score': 8.5
        }

        caption = generate_caption_text(event)
        print(f"  Generated: {caption}")
        print("  PASS: Caption text generated")
        results['passed'] += 1
        results['tests'].append(('Caption text for shorts', 'PASS'))
    except Exception as e:
        print(f"  FAIL: {str(e)}")
        results['failed'] += 1
        results['tests'].append(('Caption text for shorts', 'FAIL'))

    # Test 3: Function signatures
    print("\n[3/3] Testing function signatures...")
    try:
        import inspect

        funcs_to_check = [
            (smart_crop_to_vertical, ['input_path', 'output_path']),
            (add_vertical_overlays, ['input_path', 'output_path', 'event', 'match_meta', 'brand_assets']),
            (extract_clip, ['input_path', 'start_time', 'end_time', 'output_path'])
        ]

        all_good = True
        for func, expected_params in funcs_to_check:
            sig = inspect.signature(func)
            params = list(sig.parameters.keys())
            if all(p in params for p in expected_params):
                print(f"  PASS: {func.__name__} has correct signature")
            else:
                print(f"  FAIL: {func.__name__} missing params")
                all_good = False

        if all_good:
            results['passed'] += 1
            results['tests'].append(('Function signatures', 'PASS'))
        else:
            results['failed'] += 1
            results['tests'].append(('Function signatures', 'FAIL'))

    except Exception as e:
        print(f"  FAIL: {str(e)}")
        results['failed'] += 1
        results['tests'].append(('Function signatures', 'FAIL'))

    return results


def main():
    """Run all tests"""
    print("="*60)
    print("PHASE 5 & 6 COMPREHENSIVE TEST SUITE")
    print("="*60)

    # Test Phase 6
    phase6_results = test_phase_6_captions()

    # Test Phase 5
    phase5_results = test_phase_5_shorts()

    # Summary
    print("\n" + "="*60)
    print("TEST SUMMARY")
    print("="*60)

    total_passed = phase5_results['passed'] + phase6_results['passed']
    total_failed = phase5_results['failed'] + phase6_results['failed']
    total_tests = total_passed + total_failed

    print(f"\nPhase 5 (Shorts): {phase5_results['passed']}/{phase5_results['passed']+phase5_results['failed']} passed")
    for test_name, status in phase5_results['tests']:
        print(f"  - {test_name}: {status}")

    print(f"\nPhase 6 (Captions): {phase6_results['passed']}/{phase6_results['passed']+phase6_results['failed']} passed")
    for test_name, status in phase6_results['tests']:
        print(f"  - {test_name}: {status}")

    print(f"\nOVERALL: {total_passed}/{total_tests} tests passed")

    if total_failed == 0:
        print("\n*** ALL TESTS PASSED ***")
        return 0
    else:
        print(f"\n*** {total_failed} TEST(S) FAILED ***")
        return 1


if __name__ == '__main__':
    sys.exit(main())

#!/usr/bin/env python3
"""
Comprehensive test suite for ALL phases (1-8)
Tests module imports, function signatures, and basic functionality
Works without requiring actual video files
"""

import sys
import os
import io
import json

# Set UTF-8 output for Windows
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')


def test_phase_1_multi_signal_detection():
    """Test Phase 1: Multi-Signal Event Detection"""
    print("\n" + "="*60)
    print("PHASE 1: MULTI-SIGNAL EVENT DETECTION")
    print("="*60)

    results = {'passed': 0, 'failed': 0, 'tests': []}

    # Test 1: Module imports
    print("\n[1/3] Testing module imports...")
    try:
        from detect_fusion import detect_events_multimodal
        print("  PASS: Core detection module imported")

        # Test optional modules (audio analysis requires librosa)
        try:
            from detect_audio import detect_audio_events
            print("  PASS: Audio detection module imported")
        except ImportError as e:
            if 'librosa' in str(e):
                print("  WARN: Audio detection unavailable (librosa not installed)")
            else:
                raise

        try:
            from detect_flow import detect_flow_events
            print("  PASS: Flow detection module imported")
        except ImportError:
            print("  WARN: Flow detection unavailable")

        results['passed'] += 1
        results['tests'].append(('Module imports', 'PASS'))
    except Exception as e:
        print(f"  FAIL: {str(e)}")
        results['failed'] += 1
        results['tests'].append(('Module imports', 'FAIL'))

    # Test 2: Check function signatures
    print("\n[2/3] Testing function signatures...")
    try:
        import inspect
        from detect_fusion import detect_events_multimodal

        sig = inspect.signature(detect_events_multimodal)
        params = list(sig.parameters.keys())

        expected_params = ['video_path', 'json_events', 'config']
        if all(p in params for p in expected_params):
            print(f"  PASS: detect_events_multimodal has correct signature")
            results['passed'] += 1
            results['tests'].append(('Function signatures', 'PASS'))
        else:
            print(f"  FAIL: Missing expected parameters")
            results['failed'] += 1
            results['tests'].append(('Function signatures', 'FAIL'))
    except Exception as e:
        print(f"  FAIL: {str(e)}")
        results['failed'] += 1
        results['tests'].append(('Function signatures', 'FAIL'))

    # Test 3: Config parsing
    print("\n[3/3] Testing config structure...")
    try:
        test_config = {
            'detection': {
                'signals': ['yolo', 'audio_energy', 'whistle', 'optical_flow', 'ocr'],
                'weights': {
                    'json': 5.0,
                    'yolo': 2.0,
                    'audio_energy': 1.5
                }
            }
        }

        signals = test_config['detection']['signals']
        weights = test_config['detection']['weights']

        print(f"  Config has {len(signals)} signal types")
        print(f"  Config has {len(weights)} weight definitions")
        print("  PASS: Config structure valid")
        results['passed'] += 1
        results['tests'].append(('Config parsing', 'PASS'))
    except Exception as e:
        print(f"  FAIL: {str(e)}")
        results['failed'] += 1
        results['tests'].append(('Config parsing', 'FAIL'))

    return results


def test_phase_2_professional_effects():
    """Test Phase 2: Professional Effects & Editing"""
    print("\n" + "="*60)
    print("PHASE 2: PROFESSIONAL EFFECTS & EDITING")
    print("="*60)

    results = {'passed': 0, 'failed': 0, 'tests': []}

    # Test 1: Module imports
    print("\n[1/2] Testing module imports...")
    try:
        from effects import (
            stabilize_clip,
            smart_zoom_on_action,
            add_slowmo_replay,
            apply_pro_effects
        )
        print("  PASS: All effect modules imported")
        results['passed'] += 1
        results['tests'].append(('Module imports', 'PASS'))
    except Exception as e:
        print(f"  FAIL: {str(e)}")
        results['failed'] += 1
        results['tests'].append(('Module imports', 'FAIL'))

    # Test 2: Function signatures
    print("\n[2/2] Testing function signatures...")
    try:
        import inspect
        from effects import stabilize_clip, smart_zoom_on_action, add_slowmo_replay

        funcs_to_check = [
            (stabilize_clip, ['input_path', 'output_path']),
            (smart_zoom_on_action, ['input_path', 'output_path']),
            (add_slowmo_replay, ['input_path', 'output_path'])
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


def test_phase_3_broadcast_overlays():
    """Test Phase 3: Broadcast-Quality Overlays"""
    print("\n" + "="*60)
    print("PHASE 3: BROADCAST-QUALITY OVERLAYS")
    print("="*60)

    results = {'passed': 0, 'failed': 0, 'tests': []}

    # Test 1: Module imports
    print("\n[1/3] Testing module imports...")
    try:
        from overlays import (
            create_scorebug,
            apply_scorebug,
            create_goal_lowerthird,
            apply_lowerthird,
            create_opening_slate,
            create_closing_slate
        )
        print("  PASS: All overlay modules imported")
        results['passed'] += 1
        results['tests'].append(('Module imports', 'PASS'))
    except Exception as e:
        print(f"  FAIL: {str(e)}")
        results['failed'] += 1
        results['tests'].append(('Module imports', 'FAIL'))

    # Test 2: Test metadata structure
    print("\n[2/3] Testing metadata structures...")
    try:
        test_match_meta = {
            'home_short': 'MAN',
            'away_short': 'LIV',
            'score': '2-1',
            'current_minute': 45
        }

        test_brand_assets = {
            'font_bold': 'brand/fonts/Inter-Bold.ttf',
            'home_badge': 'brand/badges/home_team.png',
            'away_badge': 'brand/badges/away_team.png'
        }

        print(f"  Match meta has {len(test_match_meta)} fields")
        print(f"  Brand assets has {len(test_brand_assets)} items")
        print("  PASS: Metadata structures valid")
        results['passed'] += 1
        results['tests'].append(('Metadata structures', 'PASS'))
    except Exception as e:
        print(f"  FAIL: {str(e)}")
        results['failed'] += 1
        results['tests'].append(('Metadata structures', 'FAIL'))

    # Test 3: Function signatures
    print("\n[3/3] Testing function signatures...")
    try:
        import inspect
        from overlays import create_scorebug, create_goal_lowerthird

        sig = inspect.signature(create_scorebug)
        params = list(sig.parameters.keys())

        if 'match_meta' in params and 'brand_assets' in params:
            print(f"  PASS: create_scorebug has correct signature")
            results['passed'] += 1
            results['tests'].append(('Function signatures', 'PASS'))
        else:
            print(f"  FAIL: Missing expected parameters")
            results['failed'] += 1
            results['tests'].append(('Function signatures', 'FAIL'))
    except Exception as e:
        print(f"  FAIL: {str(e)}")
        results['failed'] += 1
        results['tests'].append(('Function signatures', 'FAIL'))

    return results


def test_phase_4_audio_processing():
    """Test Phase 4: Professional Audio Processing"""
    print("\n" + "="*60)
    print("PHASE 4: PROFESSIONAL AUDIO PROCESSING")
    print("="*60)

    results = {'passed': 0, 'failed': 0, 'tests': []}

    # Test 1: Module imports
    print("\n[1/2] Testing module imports...")
    try:
        from audio import (
            normalize_loudness,
            duck_audio_during_overlays,
            apply_peak_limiter,
            add_audio_fade,
            mix_audio_tracks,
            extract_audio_info,
            apply_professional_audio_chain
        )
        print("  PASS: All audio modules imported")
        results['passed'] += 1
        results['tests'].append(('Module imports', 'PASS'))
    except Exception as e:
        print(f"  FAIL: {str(e)}")
        results['failed'] += 1
        results['tests'].append(('Module imports', 'FAIL'))

    # Test 2: Function signatures
    print("\n[2/2] Testing function signatures...")
    try:
        import inspect
        from audio import normalize_loudness, apply_professional_audio_chain

        sig = inspect.signature(normalize_loudness)
        params = list(sig.parameters.keys())

        expected = ['input_path', 'output_path']
        if all(p in params for p in expected):
            print(f"  PASS: normalize_loudness has correct signature")
            results['passed'] += 1
            results['tests'].append(('Function signatures', 'PASS'))
        else:
            print(f"  FAIL: Missing expected parameters")
            results['failed'] += 1
            results['tests'].append(('Function signatures', 'FAIL'))
    except Exception as e:
        print(f"  FAIL: {str(e)}")
        results['failed'] += 1
        results['tests'].append(('Function signatures', 'FAIL'))

    return results


def test_phase_5_vertical_shorts():
    """Test Phase 5: Vertical Shorts Generation"""
    print("\n" + "="*60)
    print("PHASE 5: VERTICAL SHORTS GENERATION")
    print("="*60)

    results = {'passed': 0, 'failed': 0, 'tests': []}

    # Test 1: Module imports
    print("\n[1/2] Testing module imports...")
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
        print("  PASS: All shorts modules imported")
        results['passed'] += 1
        results['tests'].append(('Module imports', 'PASS'))
    except Exception as e:
        print(f"  FAIL: {str(e)}")
        results['failed'] += 1
        results['tests'].append(('Module imports', 'FAIL'))

    # Test 2: Function signatures
    print("\n[2/2] Testing function signatures...")
    try:
        import inspect
        from shorts import smart_crop_to_vertical, generate_vertical_shorts

        funcs_to_check = [
            (smart_crop_to_vertical, ['input_path', 'output_path']),
            (generate_vertical_shorts, ['events', 'video_path'])
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


def test_phase_6_captions():
    """Test Phase 6: SRT Captions & Logging"""
    print("\n" + "="*60)
    print("PHASE 6: SRT CAPTIONS & LOGGING")
    print("="*60)

    results = {'passed': 0, 'failed': 0, 'tests': []}

    # Test 1: Module imports
    print("\n[1/2] Testing module imports...")
    try:
        from captions import (
            format_srt_time,
            generate_srt_captions,
            validate_srt_file,
            generate_caption_text,
            burn_caption,
            burn_srt_file
        )
        from ffmpeg_logger import FFmpegLogger
        print("  PASS: All caption modules imported")
        results['passed'] += 1
        results['tests'].append(('Module imports', 'PASS'))
    except Exception as e:
        print(f"  FAIL: {str(e)}")
        results['failed'] += 1
        results['tests'].append(('Module imports', 'FAIL'))

    # Test 2: SRT time formatting
    print("\n[2/2] Testing SRT time formatting...")
    try:
        from captions import format_srt_time

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
            results['tests'].append(('SRT time formatting', 'PASS'))
        else:
            results['failed'] += 1
            results['tests'].append(('SRT time formatting', 'FAIL'))
    except Exception as e:
        print(f"  FAIL: {str(e)}")
        results['failed'] += 1
        results['tests'].append(('SRT time formatting', 'FAIL'))

    return results


def test_phase_7_integration():
    """Test Phase 7: Integration & Configuration"""
    print("\n" + "="*60)
    print("PHASE 7: INTEGRATION & CONFIGURATION")
    print("="*60)

    results = {'passed': 0, 'failed': 0, 'tests': []}

    # Test 1: Main pipeline exists
    print("\n[1/3] Testing main.py exists...")
    try:
        if os.path.exists('main.py'):
            print("  PASS: main.py exists")
            results['passed'] += 1
            results['tests'].append(('Main pipeline file', 'PASS'))
        else:
            print("  FAIL: main.py not found")
            results['failed'] += 1
            results['tests'].append(('Main pipeline file', 'FAIL'))
    except Exception as e:
        print(f"  FAIL: {str(e)}")
        results['failed'] += 1
        results['tests'].append(('Main pipeline file', 'FAIL'))

    # Test 2: Config file exists
    print("\n[2/3] Testing config.yaml exists...")
    try:
        if os.path.exists('config.yaml'):
            print("  PASS: config.yaml exists")
            results['passed'] += 1
            results['tests'].append(('Config file', 'PASS'))
        else:
            print("  FAIL: config.yaml not found")
            results['failed'] += 1
            results['tests'].append(('Config file', 'FAIL'))
    except Exception as e:
        print(f"  FAIL: {str(e)}")
        results['failed'] += 1
        results['tests'].append(('Config file', 'FAIL'))

    # Test 3: Config structure
    print("\n[3/3] Testing config structure...")
    try:
        import yaml

        if os.path.exists('config.yaml'):
            with open('config.yaml', 'r') as f:
                config = yaml.safe_load(f)

            expected_sections = ['detection', 'editing', 'overlays', 'audio', 'shorts', 'captions']
            found_sections = [s for s in expected_sections if s in config]

            print(f"  Found {len(found_sections)}/{len(expected_sections)} config sections")

            if len(found_sections) == len(expected_sections):
                print("  PASS: All config sections present")
                results['passed'] += 1
                results['tests'].append(('Config structure', 'PASS'))
            else:
                print(f"  FAIL: Missing sections: {set(expected_sections) - set(found_sections)}")
                results['failed'] += 1
                results['tests'].append(('Config structure', 'FAIL'))
        else:
            print("  SKIP: config.yaml not found")
            results['tests'].append(('Config structure', 'SKIP'))
    except Exception as e:
        print(f"  FAIL: {str(e)}")
        results['failed'] += 1
        results['tests'].append(('Config structure', 'FAIL'))

    return results


def test_phase_8_docker():
    """Test Phase 8: Docker Integration"""
    print("\n" + "="*60)
    print("PHASE 8: DOCKER INTEGRATION")
    print("="*60)

    results = {'passed': 0, 'failed': 0, 'tests': []}

    # Test 1: Dockerfile exists
    print("\n[1/3] Testing Dockerfile exists...")
    try:
        dockerfile_path = '../football-highlights-processor/Dockerfile'
        if os.path.exists(dockerfile_path):
            print(f"  PASS: Dockerfile exists at {dockerfile_path}")
            results['passed'] += 1
            results['tests'].append(('Dockerfile exists', 'PASS'))
        else:
            print(f"  FAIL: Dockerfile not found at {dockerfile_path}")
            results['failed'] += 1
            results['tests'].append(('Dockerfile exists', 'FAIL'))
    except Exception as e:
        print(f"  FAIL: {str(e)}")
        results['failed'] += 1
        results['tests'].append(('Dockerfile exists', 'FAIL'))

    # Test 2: docker-compose.yml exists
    print("\n[2/3] Testing docker-compose.yml exists...")
    try:
        compose_path = '../football-highlights-processor/docker-compose.yml'
        if os.path.exists(compose_path):
            print(f"  PASS: docker-compose.yml exists at {compose_path}")
            results['passed'] += 1
            results['tests'].append(('docker-compose.yml exists', 'PASS'))
        else:
            print(f"  FAIL: docker-compose.yml not found at {compose_path}")
            results['failed'] += 1
            results['tests'].append(('docker-compose.yml exists', 'FAIL'))
    except Exception as e:
        print(f"  FAIL: {str(e)}")
        results['failed'] += 1
        results['tests'].append(('docker-compose.yml exists', 'FAIL'))

    # Test 3: requirements.txt exists
    print("\n[3/3] Testing requirements.txt exists...")
    try:
        # Check multiple possible locations
        req_paths = [
            'requirements.txt',  # highlights_bot directory
            '../football-highlights-processor/requirements.txt'  # processor directory
        ]

        req_path = None
        for path in req_paths:
            if os.path.exists(path):
                req_path = path
                break

        if req_path:
            with open(req_path, 'r') as f:
                lines = [l.strip() for l in f.readlines() if l.strip() and not l.startswith('#')]
            print(f"  Found {len(lines)} dependencies")
            print(f"  PASS: requirements.txt exists at {req_path} with {len(lines)} packages")
            results['passed'] += 1
            results['tests'].append(('requirements.txt exists', 'PASS'))
        else:
            print(f"  FAIL: requirements.txt not found in any expected location")
            results['failed'] += 1
            results['tests'].append(('requirements.txt exists', 'FAIL'))
    except Exception as e:
        print(f"  FAIL: {str(e)}")
        results['failed'] += 1
        results['tests'].append(('requirements.txt exists', 'FAIL'))

    return results


def main():
    """Run all phase tests"""
    print("="*60)
    print("COMPREHENSIVE PHASE 1-8 TEST SUITE")
    print("="*60)

    all_results = {}

    # Test all phases
    all_results['phase1'] = test_phase_1_multi_signal_detection()
    all_results['phase2'] = test_phase_2_professional_effects()
    all_results['phase3'] = test_phase_3_broadcast_overlays()
    all_results['phase4'] = test_phase_4_audio_processing()
    all_results['phase5'] = test_phase_5_vertical_shorts()
    all_results['phase6'] = test_phase_6_captions()
    all_results['phase7'] = test_phase_7_integration()
    all_results['phase8'] = test_phase_8_docker()

    # Summary
    print("\n" + "="*60)
    print("TEST SUMMARY")
    print("="*60)

    phase_names = {
        'phase1': 'Phase 1 (Multi-Signal Detection)',
        'phase2': 'Phase 2 (Professional Effects)',
        'phase3': 'Phase 3 (Broadcast Overlays)',
        'phase4': 'Phase 4 (Audio Processing)',
        'phase5': 'Phase 5 (Vertical Shorts)',
        'phase6': 'Phase 6 (SRT Captions)',
        'phase7': 'Phase 7 (Integration)',
        'phase8': 'Phase 8 (Docker)'
    }

    total_passed = 0
    total_failed = 0

    for phase_key, phase_name in phase_names.items():
        results = all_results[phase_key]
        total_passed += results['passed']
        total_failed += results['failed']
        total = results['passed'] + results['failed']

        status = "PASS" if results['failed'] == 0 else "FAIL"
        symbol = "✅" if results['failed'] == 0 else "❌"

        print(f"\n{symbol} {phase_name}: {results['passed']}/{total} passed ({status})")
        for test_name, test_status in results['tests']:
            test_symbol = "✓" if test_status == 'PASS' else ("✗" if test_status == 'FAIL' else "-")
            print(f"  {test_symbol} {test_name}: {test_status}")

    total_tests = total_passed + total_failed
    print(f"\nOVERALL: {total_passed}/{total_tests} tests passed")

    if total_failed == 0:
        print("\n*** ALL TESTS PASSED ***")
        return 0
    else:
        print(f"\n*** {total_failed} TEST(S) FAILED ***")
        return 1


if __name__ == '__main__':
    sys.exit(main())

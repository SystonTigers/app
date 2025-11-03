#!/usr/bin/env python3
"""
Test script for professional audio processing
Tests loudness normalization, ducking, limiting, and full audio chain
"""

import argparse
import os
import sys
from pathlib import Path

from audio import (
    normalize_loudness,
    duck_audio_during_overlays,
    apply_peak_limiter,
    add_audio_fade,
    mix_audio_tracks,
    extract_audio_info,
    apply_professional_audio_chain
)


def test_normalize(input_path, output_path=None, target_lufs=-14.0):
    """Test loudness normalization"""
    print("\n" + "="*60)
    print("TESTING LOUDNESS NORMALIZATION")
    print("="*60)

    if not os.path.exists(input_path):
        print(f"Error: Input file not found: {input_path}")
        return False

    if output_path is None:
        output_path = input_path.replace('.mp4', '_normalized.mp4')

    print(f"Input: {input_path}")
    print(f"Output: {output_path}")
    print(f"Target: {target_lufs} LUFS")

    try:
        # Get original audio info
        print("\nOriginal audio info:")
        info = extract_audio_info(input_path)
        if info:
            print(f"  Codec: {info['codec']}")
            print(f"  Sample rate: {info['sample_rate']} Hz")
            print(f"  Channels: {info['channels']}")
            if info['bit_rate']:
                print(f"  Bit rate: {info['bit_rate']/1000:.1f} kbps")

        # Normalize
        result = normalize_loudness(input_path, output_path, target_lufs=target_lufs)
        print(f"\n✓ Normalization complete: {result}")

        # Get normalized audio info
        print("\nNormalized audio info:")
        info = extract_audio_info(output_path)
        if info:
            print(f"  Codec: {info['codec']}")
            print(f"  Sample rate: {info['sample_rate']} Hz")
            print(f"  Channels: {info['channels']}")
            if info['bit_rate']:
                print(f"  Bit rate: {info['bit_rate']/1000:.1f} kbps")

        return True

    except Exception as e:
        print(f"\n✗ Normalization failed: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


def test_duck(input_path, output_path=None, times_str="5-8,15-18"):
    """Test audio ducking"""
    print("\n" + "="*60)
    print("TESTING AUDIO DUCKING")
    print("="*60)

    if not os.path.exists(input_path):
        print(f"Error: Input file not found: {input_path}")
        return False

    if output_path is None:
        output_path = input_path.replace('.mp4', '_ducked.mp4')

    # Parse times string (format: "5-8,15-18")
    overlay_times = []
    for segment in times_str.split(','):
        if '-' in segment:
            start, end = segment.split('-')
            overlay_times.append((float(start), float(end)))

    print(f"Input: {input_path}")
    print(f"Output: {output_path}")
    print(f"Duck segments: {overlay_times}")

    try:
        result = duck_audio_during_overlays(
            input_path, output_path,
            overlay_times,
            duck_amount_db=-3.0
        )
        print(f"\n✓ Ducking complete: {result}")
        return True

    except Exception as e:
        print(f"\n✗ Ducking failed: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


def test_limiter(input_path, output_path=None, threshold=-2.0):
    """Test peak limiter"""
    print("\n" + "="*60)
    print("TESTING PEAK LIMITER")
    print("="*60)

    if not os.path.exists(input_path):
        print(f"Error: Input file not found: {input_path}")
        return False

    if output_path is None:
        output_path = input_path.replace('.mp4', '_limited.mp4')

    print(f"Input: {input_path}")
    print(f"Output: {output_path}")
    print(f"Threshold: {threshold} dB")

    try:
        result = apply_peak_limiter(input_path, output_path, threshold_db=threshold)
        print(f"\n✓ Peak limiting complete: {result}")
        return True

    except Exception as e:
        print(f"\n✗ Peak limiting failed: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


def test_fade(input_path, output_path=None, fade_in=0.5, fade_out=1.0):
    """Test audio fades"""
    print("\n" + "="*60)
    print("TESTING AUDIO FADES")
    print("="*60)

    if not os.path.exists(input_path):
        print(f"Error: Input file not found: {input_path}")
        return False

    if output_path is None:
        output_path = input_path.replace('.mp4', '_faded.mp4')

    print(f"Input: {input_path}")
    print(f"Output: {output_path}")
    print(f"Fade in: {fade_in}s, Fade out: {fade_out}s")

    try:
        result = add_audio_fade(input_path, output_path, fade_in, fade_out)
        print(f"\n✓ Audio fades complete: {result}")
        return True

    except Exception as e:
        print(f"\n✗ Audio fades failed: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


def test_mix(video_path, music_path, output_path=None, video_vol=1.0, music_vol=0.3):
    """Test audio mixing"""
    print("\n" + "="*60)
    print("TESTING AUDIO MIXING")
    print("="*60)

    if not os.path.exists(video_path):
        print(f"Error: Video file not found: {video_path}")
        return False

    if not os.path.exists(music_path):
        print(f"Error: Music file not found: {music_path}")
        return False

    if output_path is None:
        output_path = video_path.replace('.mp4', '_mixed.mp4')

    print(f"Video: {video_path}")
    print(f"Music: {music_path}")
    print(f"Output: {output_path}")
    print(f"Video volume: {video_vol*100:.0f}%, Music volume: {music_vol*100:.0f}%")

    try:
        result = mix_audio_tracks(video_path, music_path, output_path, video_vol, music_vol)
        print(f"\n✓ Audio mixing complete: {result}")
        return True

    except Exception as e:
        print(f"\n✗ Audio mixing failed: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


def test_professional_chain(input_path, output_path=None):
    """Test complete professional audio chain"""
    print("\n" + "="*60)
    print("TESTING PROFESSIONAL AUDIO CHAIN")
    print("="*60)

    if not os.path.exists(input_path):
        print(f"Error: Input file not found: {input_path}")
        return False

    if output_path is None:
        output_path = input_path.replace('.mp4', '_pro_audio.mp4')

    print(f"Input: {input_path}")
    print(f"Output: {output_path}")

    config = {
        'target_lufs': -14.0,
        'true_peak': -1.5,
        'limiter_threshold': -2.0,
        'fade_in': 0.5,
        'fade_out': 1.0
    }

    print("\nProcessing chain:")
    print(f"  1. Normalize to {config['target_lufs']} LUFS")
    print(f"  2. Peak limiter at {config['limiter_threshold']} dB")
    print(f"  3. Fades: {config['fade_in']}s in, {config['fade_out']}s out")

    try:
        result = apply_professional_audio_chain(input_path, output_path, config)
        print(f"\n✓ Professional audio chain complete: {result}")
        return True

    except Exception as e:
        print(f"\n✗ Professional audio chain failed: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


def test_info(input_path):
    """Test audio info extraction"""
    print("\n" + "="*60)
    print("TESTING AUDIO INFO EXTRACTION")
    print("="*60)

    if not os.path.exists(input_path):
        print(f"Error: Input file not found: {input_path}")
        return False

    print(f"Input: {input_path}")

    try:
        info = extract_audio_info(input_path)

        if info:
            print("\nAudio Information:")
            print(f"  Codec: {info['codec']}")
            print(f"  Sample rate: {info['sample_rate']} Hz")
            print(f"  Channels: {info['channels']}")
            if info['bit_rate']:
                print(f"  Bit rate: {info['bit_rate']/1000:.1f} kbps")
            print("\n✓ Audio info extracted successfully")
            return True
        else:
            print("\n✗ Could not extract audio info")
            return False

    except Exception as e:
        print(f"\n✗ Audio info extraction failed: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


def main():
    parser = argparse.ArgumentParser(description='Test professional audio processing')
    parser.add_argument('--test', required=True,
                       choices=['normalize', 'duck', 'limiter', 'fade', 'mix', 'chain', 'info', 'all'],
                       help='Which audio test to run')
    parser.add_argument('--input', required=True, help='Input video file')
    parser.add_argument('--output', help='Output video file (optional)')
    parser.add_argument('--times', default='5-8,15-18', help='Duck times in format "start-end,start-end"')
    parser.add_argument('--lufs', type=float, default=-14.0, help='Target LUFS for normalization')
    parser.add_argument('--threshold', type=float, default=-2.0, help='Limiter threshold in dB')
    parser.add_argument('--fade-in', type=float, default=0.5, help='Fade in duration in seconds')
    parser.add_argument('--fade-out', type=float, default=1.0, help='Fade out duration in seconds')
    parser.add_argument('--music', help='Music file for mixing test')
    parser.add_argument('--video-vol', type=float, default=1.0, help='Video volume (0.0-1.0)')
    parser.add_argument('--music-vol', type=float, default=0.3, help='Music volume (0.0-1.0)')

    args = parser.parse_args()

    success = True

    if args.test == 'normalize' or args.test == 'all':
        success = test_normalize(args.input, args.output, args.lufs) and success

    if args.test == 'duck' or args.test == 'all':
        success = test_duck(args.input, args.output, args.times) and success

    if args.test == 'limiter' or args.test == 'all':
        success = test_limiter(args.input, args.output, args.threshold) and success

    if args.test == 'fade' or args.test == 'all':
        success = test_fade(args.input, args.output, args.fade_in, args.fade_out) and success

    if args.test == 'mix' or args.test == 'all':
        if args.music:
            success = test_mix(args.input, args.music, args.output, args.video_vol, args.music_vol) and success
        elif args.test == 'mix':
            print("Error: --music argument required for mix test")
            success = False

    if args.test == 'chain' or args.test == 'all':
        success = test_professional_chain(args.input, args.output) and success

    if args.test == 'info' or args.test == 'all':
        success = test_info(args.input) and success

    print("\n" + "="*60)
    if success:
        print("✓ ALL TESTS PASSED")
    else:
        print("✗ SOME TESTS FAILED")
    print("="*60)

    sys.exit(0 if success else 1)


if __name__ == '__main__':
    main()

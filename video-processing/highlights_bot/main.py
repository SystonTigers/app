#!/usr/bin/env python3
"""
Enhanced Highlights Bot - Professional Match Highlights Generator

Combines multi-signal detection, pro effects, overlays, and social media optimization.
"""

import argparse
import yaml
import os
import sys
import subprocess
from pathlib import Path

# Import all our modules
try:
    from detect_fusion import detect_events_multimodal
except ImportError:
    # Fallback to basic detection if fusion module doesn't exist yet
    from detect import EventDetector
    detect_events_multimodal = None

try:
    from effects import apply_pro_effects
except ImportError:
    apply_pro_effects = None

try:
    from overlays import (
        create_scorebug, create_goal_lowerthird,
        create_opening_slate, create_closing_slate,
        apply_scorebug, apply_lowerthird
    )
except ImportError:
    create_scorebug = create_goal_lowerthird = None
    create_opening_slate = create_closing_slate = None
    apply_scorebug = apply_lowerthird = None

try:
    from audio import normalize_loudness, duck_audio_during_overlays
except ImportError:
    normalize_loudness = duck_audio_during_overlays = None

try:
    from shorts import generate_vertical_shorts
except ImportError:
    generate_vertical_shorts = None

try:
    from captions import generate_srt_captions
except ImportError:
    generate_srt_captions = None

from ffmpeg_logger import FFmpegLogger


def load_config(config_path='config.yaml'):
    """Load configuration from YAML file."""
    with open(config_path, 'r') as f:
        return yaml.safe_load(f)


def load_match_metadata(json_path=None):
    """Load match metadata from JSON file."""
    if json_path and os.path.exists(json_path):
        import json
        with open(json_path, 'r') as f:
            return json.load(f)
    return {}


def extract_clip(video_path, output_path, start_time, duration):
    """Extract a clip from video using ffmpeg."""
    cmd = [
        'ffmpeg', '-y',
        '-ss', str(start_time),
        '-i', video_path,
        '-t', str(duration),
        '-c', 'copy',
        output_path
    ]
    try:
        subprocess.run(cmd, check=True, capture_output=True)
        return True
    except subprocess.CalledProcessError:
        return False


def main():
    parser = argparse.ArgumentParser(description='Enhanced Highlights Bot')
    parser.add_argument('--video', required=True, help='Path to input video')
    parser.add_argument('--json', help='Path to Apps Script JSON (optional)')
    parser.add_argument('--config', default='config.yaml', help='Path to config file')
    parser.add_argument('--output-dir', default='out', help='Output directory')
    parser.add_argument('--match-id', help='Match ID (for logging)')

    args = parser.parse_args()

    # Load configuration
    print("🔧 Loading configuration...")
    config = load_config(args.config)

    # Load match metadata
    print("📋 Loading match metadata...")
    match_meta = load_match_metadata(args.json)
    match_id = args.match_id or match_meta.get('match_id', 'unknown_match')

    # Initialize logger
    logger = FFmpegLogger(match_id)

    # Load brand assets
    print("🎨 Loading brand assets...")
    brand_assets = {
        'club_badge': config.get('brand', {}).get('club_badge'),
        'home_badge': config.get('brand', {}).get('home_badge'),
        'away_badge': config.get('brand', {}).get('away_badge'),
        'font_bold': config.get('brand', {}).get('font_bold'),
        'font_regular': config.get('brand', {}).get('font_regular'),
        'stinger_path': config.get('brand', {}).get('stinger_path'),
        'scorebug_template': config.get('brand', {}).get('scorebug_template'),
        'lower_third_template': config.get('brand', {}).get('lower_third_template'),
    }

    # Create output directories
    os.makedirs(args.output_dir, exist_ok=True)
    os.makedirs(os.path.join(args.output_dir, 'shorts'), exist_ok=True)
    os.makedirs(os.path.join(args.output_dir, 'temp'), exist_ok=True)

    # ========================================
    # PHASE 1: MULTI-SIGNAL EVENT DETECTION
    # ========================================
    print("\n" + "="*60)
    print("🔍 PHASE 1: Multi-Signal Event Detection")
    print("="*60)

    json_events = match_meta.get('events', None)

    if detect_events_multimodal:
        events = detect_events_multimodal(args.video, json_events, config)
    else:
        # Fallback to JSON events only if fusion not available
        print("⚠️  Multi-signal detection not available, using JSON events only")
        events = json_events if json_events else []

    print(f"\n✅ Detected {len(events)} events")
    for idx, event in enumerate(events[:10], 1):  # Show top 10
        event_type = event.get('type', 'unknown')
        timestamp = event.get('timestamp', 0)
        score = event.get('score', 0)
        print(f"  {idx}. {event_type} at {timestamp:.1f}s (score: {score:.2f})")

    if not events:
        print("\n⚠️  No events detected. Exiting.")
        return

    # ========================================
    # PHASE 2: CREATE OVERLAYS
    # ========================================
    print("\n" + "="*60)
    print("🎨 PHASE 2: Creating Overlays")
    print("="*60)

    opening_slate_path = None
    scorebug_path = None
    lowerthird_paths = []
    closing_slate_path = None

    # Opening slate
    if create_opening_slate and config.get('overlays', {}).get('opening_slate', {}).get('enabled', True):
        print("\n📽️ Creating opening slate...")
        opening_slate_path = os.path.join(args.output_dir, 'temp', 'opening_slate.mp4')
        try:
            create_opening_slate(match_meta, brand_assets, opening_slate_path,
                               duration=config['overlays']['opening_slate'].get('duration', 2.5))
        except Exception as e:
            print(f"⚠️  Failed to create opening slate: {e}")
            opening_slate_path = None

    # Scorebug
    if create_scorebug and config.get('overlays', {}).get('scorebug', {}).get('enabled', True):
        print("\n📊 Creating scorebug...")
        scorebug_path = os.path.join(args.output_dir, 'temp', 'scorebug.png')
        try:
            create_scorebug(match_meta, brand_assets, scorebug_path)
        except Exception as e:
            print(f"⚠️  Failed to create scorebug: {e}")
            scorebug_path = None

    # Goal lower-thirds
    goal_events = [e for e in events if e.get('type') == 'goal']

    if create_goal_lowerthird and config.get('overlays', {}).get('lower_thirds', {}).get('enabled', True):
        print(f"\n🏆 Creating {len(goal_events)} goal lower-thirds...")
        for idx, event in enumerate(goal_events):
            lt_path = os.path.join(args.output_dir, 'temp', f'lowerthird_goal_{idx}.png')
            try:
                create_goal_lowerthird(event, brand_assets, lt_path)
                lowerthird_paths.append((event.get('timestamp', 0), lt_path))
            except Exception as e:
                print(f"⚠️  Failed to create lower-third {idx}: {e}")

    # Closing slate
    if create_closing_slate and config.get('overlays', {}).get('closing_slate', {}).get('enabled', True):
        print("\n🎬 Creating closing slate...")
        closing_slate_path = os.path.join(args.output_dir, 'temp', 'closing_slate.mp4')
        try:
            create_closing_slate(match_meta, brand_assets, closing_slate_path,
                               duration=config['overlays']['closing_slate'].get('duration', 3.0))
        except Exception as e:
            print(f"⚠️  Failed to create closing slate: {e}")
            closing_slate_path = None

    # ========================================
    # PHASE 3: PROCESS CLIPS
    # ========================================
    print("\n" + "="*60)
    print("✂️ PHASE 3: Processing Clips")
    print("="*60)

    processed_clips = []

    for idx, event in enumerate(events):
        event_type = event.get('type', 'unknown')
        timestamp = event.get('timestamp', 0)
        print(f"\n📹 Processing clip {idx+1}/{len(events)}: {event_type} at {timestamp:.1f}s")

        # Get clip windows from config
        windows = config.get('detection', {}).get('windows', {})
        event_windows = windows.get(event_type, {'pre': 7, 'post': 10})
        pre = event_windows.get('pre', 7)
        post = event_windows.get('post', 10)

        start_time = max(0, timestamp - pre)
        duration = pre + post

        # Extract base clip
        clip_path = os.path.join(args.output_dir, 'temp', f'clip_{idx:03d}.mp4')

        if extract_clip(args.video, clip_path, start_time, duration):
            # Apply pro effects (stabilization, zoom, replay)
            if apply_pro_effects:
                try:
                    enhanced_path = apply_pro_effects(clip_path, event, config, brand_assets)
                    logger.log_command(f'03_{idx:03d}_effects',
                                      f'# Apply effects to clip {idx}',
                                      f'Stabilize, zoom, replay for {event_type}')
                    processed_clips.append(enhanced_path)
                except Exception as e:
                    print(f"⚠️  Effects failed, using original clip: {e}")
                    processed_clips.append(clip_path)
            else:
                processed_clips.append(clip_path)
        else:
            print(f"⚠️  Failed to extract clip {idx}")

    if not processed_clips:
        print("\n⚠️  No clips processed. Exiting.")
        return

    # ========================================
    # PHASE 4: ASSEMBLE MAIN HIGHLIGHTS
    # ========================================
    print("\n" + "="*60)
    print("🎬 PHASE 4: Assembling Main Highlights")
    print("="*60)

    # Concatenate clips
    concat_list = os.path.join(args.output_dir, 'temp', 'concat_list.txt')
    with open(concat_list, 'w') as f:
        # Opening slate
        if opening_slate_path and os.path.exists(opening_slate_path):
            f.write(f"file '{os.path.abspath(opening_slate_path)}'\n")

        # All clips
        for clip in processed_clips:
            f.write(f"file '{os.path.abspath(clip)}'\n")

        # Closing slate
        if closing_slate_path and os.path.exists(closing_slate_path):
            f.write(f"file '{os.path.abspath(closing_slate_path)}'\n")

    temp_concat = os.path.join(args.output_dir, 'temp', 'concatenated.mp4')
    concat_cmd = [
        'ffmpeg', '-y', '-f', 'concat', '-safe', '0', '-i', concat_list,
        '-c', 'copy', temp_concat
    ]
    logger.log_command('04_concatenate', concat_cmd, 'Concatenate all clips')

    try:
        subprocess.run(concat_cmd, check=True, capture_output=True)
        print(f"✅ Clips concatenated successfully")
    except subprocess.CalledProcessError as e:
        print(f"❌ Concatenation failed: {e}")
        return

    # Apply scorebug overlay
    if apply_scorebug and scorebug_path and config.get('overlays', {}).get('scorebug', {}).get('enabled'):
        print("\n📊 Applying scorebug overlay...")
        temp_scorebug = os.path.join(args.output_dir, 'temp', 'with_scorebug.mp4')
        try:
            apply_scorebug(temp_concat, scorebug_path, temp_scorebug)
            logger.log_command('05_scorebug', '# Apply scorebug', 'Add persistent scorebug')
            temp_concat = temp_scorebug
        except Exception as e:
            print(f"⚠️  Scorebug overlay failed: {e}")

    # Apply lower-thirds
    if apply_lowerthird:
        for timestamp, lt_path in lowerthird_paths:
            print(f"\n🏆 Applying lower-third at {timestamp:.1f}s...")
            temp_lt = os.path.join(args.output_dir, 'temp', f'with_lt_{int(timestamp)}.mp4')
            try:
                apply_lowerthird(temp_concat, lt_path, temp_lt, timestamp, duration=3.0)
                logger.log_command(f'06_lowerthird_{timestamp}', '# Apply lower-third',
                                  f'Add goal overlay at {timestamp}s')
                temp_concat = temp_lt
            except Exception as e:
                print(f"⚠️  Lower-third overlay failed: {e}")

    # ========================================
    # PHASE 5: AUDIO PROCESSING
    # ========================================
    print("\n" + "="*60)
    print("🔊 PHASE 5: Audio Processing")
    print("="*60)

    # Audio ducking during overlays
    if duck_audio_during_overlays and config.get('editing', {}).get('audio_ducking', False):
        print("\n🔉 Applying audio ducking...")
        overlay_times = [(ts, ts+3.0) for ts, _ in lowerthird_paths]
        temp_duck = os.path.join(args.output_dir, 'temp', 'ducked.mp4')
        try:
            duck_audio_during_overlays(temp_concat, temp_duck, overlay_times,
                                      duck_amount_db=config.get('editing', {}).get('audio_duck_amount_db', -3.0))
            logger.log_command('07_duck_audio', '# Duck audio', 'Reduce audio during overlays')
            temp_concat = temp_duck
        except Exception as e:
            print(f"⚠️  Audio ducking failed: {e}")

    # Loudness normalization
    final_highlights = os.path.join(args.output_dir, 'highlights_1080p.mp4')

    if normalize_loudness and config.get('editing', {}).get('audio_normalize', False):
        print("\n🎚️ Normalizing audio...")
        try:
            normalize_loudness(temp_concat, final_highlights,
                             target_lufs=config.get('editing', {}).get('audio_lufs', -14.0))
            logger.log_command('08_normalize', '# Normalize loudness',
                             f'Normalize to {config.get("editing", {}).get("audio_lufs", -14.0)} LUFS')
        except Exception as e:
            print(f"⚠️  Audio normalization failed, copying file: {e}")
            import shutil
            shutil.copy(temp_concat, final_highlights)
    else:
        import shutil
        shutil.copy(temp_concat, final_highlights)

    print(f"\n✅ Main highlights saved: {final_highlights}")

    # ========================================
    # PHASE 6: VERTICAL SHORTS
    # ========================================
    if generate_vertical_shorts and config.get('shorts', {}).get('enabled', False):
        print("\n" + "="*60)
        print("📱 PHASE 6: Generating Vertical Shorts")
        print("="*60)

        try:
            shorts = generate_vertical_shorts(
                events, args.video, match_meta, brand_assets, config,
                output_dir=os.path.join(args.output_dir, 'shorts')
            )
            print(f"\n✅ Generated {len(shorts)} vertical shorts")
        except Exception as e:
            print(f"⚠️  Shorts generation failed: {e}")

    # ========================================
    # PHASE 7: CAPTIONS
    # ========================================
    if generate_srt_captions and config.get('captions', {}).get('generate_srt', False):
        print("\n" + "="*60)
        print("💬 PHASE 7: Generating Captions")
        print("="*60)

        srt_path = os.path.join(args.output_dir, 'captions.srt')
        try:
            generate_srt_captions(events, match_meta, srt_path)
            print(f"\n✅ Captions saved: {srt_path}")
        except Exception as e:
            print(f"⚠️  Caption generation failed: {e}")

    # ========================================
    # FINALIZE
    # ========================================
    print("\n" + "="*60)
    print("📝 Writing Reproduction Guide")
    print("="*60)

    try:
        logger.write_reproduce_md()
    except Exception as e:
        print(f"⚠️  Failed to write reproduction guide: {e}")

    print("\n" + "="*60)
    print("✅ PROCESSING COMPLETE!")
    print("="*60)
    print(f"\n📁 Outputs:")
    print(f"  - Main highlights: {final_highlights}")
    if config.get('shorts', {}).get('enabled'):
        print(f"  - Vertical shorts: {os.path.join(args.output_dir, 'shorts')}/")
    if config.get('captions', {}).get('generate_srt'):
        srt_path = os.path.join(args.output_dir, 'captions.srt')
        if os.path.exists(srt_path):
            print(f"  - Captions: {srt_path}")
    print(f"  - Logs: ffmpeg_logs/{match_id}/")
    print()


if __name__ == '__main__':
    main()

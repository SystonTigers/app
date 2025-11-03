"""
Vertical shorts generation module for TikTok, Instagram Reels, YouTube Shorts
Handles smart cropping from 16:9 to 9:16 with action tracking
"""

import cv2
import numpy as np
import subprocess
import os
import tempfile
from PIL import Image, ImageDraw, ImageFont
from hashtag_generator import HashtagGenerator
from multilang_captions import MultiLanguageCaptionGenerator


def smart_crop_to_vertical(input_path, output_path, bbox_data=None, target_res=(1080, 1920)):
    """
    Crop horizontal video (16:9) to vertical (9:16) with smart centering.

    Parameters:
    - bbox_data: List of (timestamp, x, y, w, h) for action bounding boxes
    - target_res: (width, height) for output video

    Returns: Path to vertical video
    """
    cap = cv2.VideoCapture(input_path)
    fps = cap.get(cv2.CAP_PROP_FPS)
    orig_width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    orig_height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

    target_width, target_height = target_res

    # Calculate crop dimensions
    # Source is 16:9 (1920x1080), target is 9:16 (1080x1920)
    # We need to crop width and keep full height
    crop_width = int(orig_height * (target_width / target_height))
    crop_height = orig_height

    # Ensure crop fits within frame
    crop_width = min(crop_width, orig_width)

    # Use temp file for intermediate processing
    temp_cropped = tempfile.NamedTemporaryFile(suffix='.mp4', delete=False).name

    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    out = cv2.VideoWriter(temp_cropped, fourcc, fps, (crop_width, crop_height))

    frame_idx = 0
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

    print(f"  ├─ Smart cropping to vertical: {target_res}")
    print(f"  ├─ Original: {orig_width}x{orig_height}")
    print(f"  ├─ Crop region: {crop_width}x{crop_height}")

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        timestamp = frame_idx / fps

        # Find action center for this timestamp
        cx = orig_width // 2  # Default to center

        if bbox_data:
            # Find closest bbox in time
            closest_bbox = min(bbox_data, key=lambda b: abs(b[0] - timestamp))
            if abs(closest_bbox[0] - timestamp) < 2.0:  # Within 2 seconds
                x, y, w, h = closest_bbox[1:]
                cx = int(x + w / 2)

        # Calculate crop window centered on action
        crop_x = cx - crop_width // 2
        crop_x = max(0, min(crop_x, orig_width - crop_width))

        # Crop frame
        cropped = frame[:, crop_x:crop_x+crop_width]

        out.write(cropped)
        frame_idx += 1

        # Progress indicator
        if frame_idx % 30 == 0:
            progress = (frame_idx / total_frames) * 100
            print(f"  ├─ Progress: {progress:.1f}%", end='\r')

    cap.release()
    out.release()

    # Re-encode to target resolution with proper codec
    cmd = [
        'ffmpeg', '-i', temp_cropped,
        '-vf', f'scale={target_width}:{target_height}',
        '-c:v', 'libx264', '-crf', '18',
        '-c:a', 'copy',
        '-y', output_path
    ]

    subprocess.run(cmd, check=True, capture_output=True)

    # Cleanup temp file
    os.remove(temp_cropped)

    print(f"  └─ Vertical crop complete: {output_path}")
    return output_path


def add_vertical_overlays(input_path, output_path, event, match_meta, brand_assets):
    """
    Add vertical-optimized overlays to short clip.

    Overlays:
    - Team badge (top center)
    - Event title (top, below badge)
    - Timestamp/minute (top)
    - CTA (bottom)

    Returns: Path to output video
    """
    # Create overlay image (1080x1920, transparent)
    overlay = Image.new('RGBA', (1080, 1920), (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)

    # Load fonts
    try:
        font_title = ImageFont.truetype('brand/fonts/Inter-Bold.ttf', 56)
        font_info = ImageFont.truetype('brand/fonts/Inter-Regular.ttf', 42)
    except:
        font_title = ImageFont.load_default()
        font_info = font_title

    # Badge (top center)
    badge_path = brand_assets.get('club_badge')
    if badge_path and os.path.exists(badge_path):
        badge = Image.open(badge_path).convert('RGBA')
        badge = badge.resize((150, 150), Image.Resampling.LANCZOS)
        overlay.paste(badge, ((1080-150)//2, 60), badge)

    # Event title
    event_type = event.get('type', 'highlight')
    if event_type == 'goal':
        title = f"⚽ GOAL - {event.get('player', 'Unknown')}"
    elif event_type == 'chance':
        title = "🎯 Big Chance"
    elif event_type == 'card':
        card_type = event.get('card_type', 'yellow')
        emoji = '🟨' if card_type == 'yellow' else '🟥'
        title = f"{emoji} Card - {event.get('player', 'Unknown')}"
    elif event_type == 'skill':
        title = f"⭐ Skill - {event.get('player', 'Unknown')}"
    else:
        title = event_type.upper()

    bbox = draw.textbbox((0, 0), title, font=font_title)
    text_width = bbox[2] - bbox[0]

    # Add semi-transparent background for text
    padding = 20
    bg_rect = Image.new('RGBA', (text_width + padding*2, 80), (0, 0, 0, 180))
    overlay.paste(bg_rect, ((1080 - text_width - padding*2)//2, 240), bg_rect)

    draw.text(((1080-text_width)//2, 250), title, fill=(255, 255, 255), font=font_title)

    # Minute
    if 'minute' in event and event['minute']:
        minute_text = f"{event['minute']}'"
        bbox = draw.textbbox((0, 0), minute_text, font=font_info)
        text_width = bbox[2] - bbox[0]
        draw.text(((1080-text_width)//2, 350), minute_text,
                 fill=(255, 255, 255, 200), font=font_info)

    # CTA (bottom)
    cta = match_meta.get('cta_short', 'Follow for more highlights!')
    bbox = draw.textbbox((0, 0), cta, font=font_info)
    text_width = bbox[2] - bbox[0]

    bg_rect_bottom = Image.new('RGBA', (text_width + padding*2, 60), (0, 0, 0, 180))
    overlay.paste(bg_rect_bottom, ((1080 - text_width - padding*2)//2, 1790), bg_rect_bottom)

    draw.text(((1080-text_width)//2, 1800), cta,
             fill=(255, 255, 255, 200), font=font_info)

    # Save overlay
    temp_overlay = tempfile.NamedTemporaryFile(suffix='.png', delete=False).name
    overlay.save(temp_overlay, 'PNG')

    # Apply overlay to video
    cmd = [
        'ffmpeg', '-i', input_path, '-i', temp_overlay,
        '-filter_complex', '[0:v][1:v]overlay=(W-w)/2:(H-h)/2[outv]',
        '-map', '[outv]', '-map', '0:a',
        '-c:a', 'copy', '-c:v', 'libx264', '-crf', '18',
        '-y', output_path
    ]

    subprocess.run(cmd, check=True, capture_output=True)

    # Cleanup
    os.remove(temp_overlay)

    print(f"  ├─ Vertical overlays applied")
    return output_path


def extract_clip(input_path, start_time, end_time, output_path):
    """
    Extract clip segment from video.
    """
    cmd = [
        'ffmpeg', '-i', input_path,
        '-ss', str(start_time), '-to', str(end_time),
        '-c', 'copy', '-y', output_path
    ]
    subprocess.run(cmd, check=True, capture_output=True)
    return output_path


def generate_vertical_shorts(events, video_path, match_meta, brand_assets,
                             config, output_dir='out/shorts/'):
    """
    Generate vertical shorts from top events.

    Returns: List of generated short clips with metadata
    """
    from audio import normalize_loudness

    os.makedirs(output_dir, exist_ok=True)

    # Select top events
    count = config.get('shorts', {}).get('count', 10)
    min_score = config.get('shorts', {}).get('min_score', 2.0)

    # Filter and sort events
    if isinstance(events, list):
        # If events is a list of dicts
        top_events = [e for e in events if e.get('score', 0) >= min_score]
        top_events = sorted(top_events, key=lambda e: e.get('score', 0), reverse=True)[:count]
    else:
        # If events is a different format, handle appropriately
        top_events = events[:count] if hasattr(events, '__len__') else []

    shorts = []

    # Initialize hashtag generator
    hashtag_generator = HashtagGenerator()

    # Initialize multi-language caption generator
    multilang_config = config.get('shorts', {}).get('multilang', {})
    multilang_enabled = multilang_config.get('enabled', False)

    if multilang_enabled:
        multilang_generator = MultiLanguageCaptionGenerator(use_api=multilang_config.get('use_api', False))
        languages = multilang_config.get('languages', ['en', 'es', 'pt'])
        print(f"  ✓ Multi-language captions enabled for: {', '.join(languages)}")
    else:
        multilang_generator = None
        languages = []

    print(f"\n📱 Generating {len(top_events)} vertical shorts...")

    for idx, event in enumerate(top_events):
        print(f"\n📱 Creating vertical short {idx+1}/{len(top_events)}...")

        # Extract clip
        clip_path = os.path.join(output_dir, f'temp_clip_{idx}.mp4')
        start = event.get('start', event.get('abs_ts', 0) - 3)
        end = event.get('end', event.get('abs_ts', 0) + 3)

        extract_clip(video_path, start, end, clip_path)

        # Smart crop to vertical
        vertical_path = os.path.join(output_dir, f'temp_vertical_{idx}.mp4')

        # Check if AI cropping is enabled
        ai_cropping_config = config.get('shorts', {}).get('ai_cropping', {})
        use_ai_cropping = ai_cropping_config.get('enabled', True)

        if use_ai_cropping:
            # Use AI-powered cropping with YOLOv8
            try:
                from ai_cropping import ai_smart_crop_to_vertical

                resolution = config.get('shorts', {}).get('resolution', [1080, 1920])
                ai_smart_crop_to_vertical(
                    clip_path,
                    vertical_path,
                    target_res=tuple(resolution),
                    config=ai_cropping_config
                )
            except ImportError as e:
                print(f"⚠️  AI cropping not available: {e}")
                print("   Falling back to manual bbox cropping...")
                bbox_data = event.get('bbox_data', [])
                smart_crop_to_vertical(clip_path, vertical_path, bbox_data)
        else:
            # Use manual bbox cropping (legacy)
            bbox_data = event.get('bbox_data', [])
            smart_crop_to_vertical(clip_path, vertical_path, bbox_data)

        # Add vertical-optimized overlays
        overlay_path = os.path.join(output_dir, f'temp_overlay_{idx}.mp4')
        add_vertical_overlays(
            vertical_path, overlay_path, event, match_meta, brand_assets
        )

        # Normalize audio
        final_path = os.path.join(output_dir, f'short_{idx+1:02d}.mp4')
        normalize_loudness(overlay_path, final_path, target_lufs=-14)

        # Generate hashtags for this short
        hashtags = hashtag_generator.generate_hashtags(event, match_meta, max_hashtags=30)
        print(f"  ├─ Generated {len(hashtags)} hashtags")

        # Save hashtags to files for different platforms
        hashtag_files = {}
        for platform in ['tiktok', 'instagram', 'youtube']:
            hashtag_path = os.path.join(output_dir, f'short_{idx+1:02d}_hashtags_{platform}.txt')
            hashtag_generator.save_to_file(hashtags, hashtag_path, platform)
            hashtag_files[platform] = hashtag_path

        # Generate multi-language captions if enabled
        caption_files = {}
        if multilang_enabled and multilang_generator:
            caption_files = multilang_generator.generate_multilingual_captions_for_short(
                final_path,
                event,
                match_meta,
                output_dir,
                languages=languages
            )
            print(f"  ├─ Generated captions in {len(caption_files)} languages")

        shorts.append({
            'path': final_path,
            'event': event,
            'duration': end - start,
            'score': event.get('score', 0),
            'hashtags': hashtags,
            'hashtag_files': hashtag_files,
            'caption_files': caption_files
        })

        # Cleanup temp files
        for temp in [clip_path, vertical_path, overlay_path]:
            if os.path.exists(temp):
                os.remove(temp)

        print(f"  ✅ Short created: {final_path}")

    print(f"\n✅ Generated {len(shorts)} vertical shorts")
    return shorts


def add_trending_effects(input_path, output_path, effect_type='zoom_pulse'):
    """
    Add trending social media effects to vertical shorts.

    Effects:
    - zoom_pulse: Ken Burns zoom with pulse
    - speed_ramp: Slow-motion into normal speed
    - glitch: Glitch transition effect

    Returns: Path to output video
    """
    if effect_type == 'zoom_pulse':
        # Ken Burns zoom with subtle pulse
        filter_str = (
            "zoompan=z='min(zoom+0.0015,1.5)':d=1:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':"
            "s=1080x1920"
        )
    elif effect_type == 'speed_ramp':
        # Slow-motion in first 30%, normal speed after
        filter_str = "setpts='if(lt(T,2),2.5*PTS,PTS-1.5/TB)'"
    else:
        # No effect
        filter_str = "null"

    cmd = [
        'ffmpeg', '-i', input_path,
        '-vf', filter_str,
        '-c:a', 'copy', '-c:v', 'libx264', '-crf', '18',
        '-y', output_path
    ]

    subprocess.run(cmd, check=True, capture_output=True)

    print(f"  ├─ Trending effect applied: {effect_type}")
    return output_path


def generate_thumbnail(video_path, output_path, timestamp=None):
    """
    Generate thumbnail from video for social media.

    Parameters:
    - timestamp: Specific timestamp to extract (default: middle of video)

    Returns: Path to thumbnail image
    """
    if timestamp is None:
        # Get video duration and use middle frame
        probe_cmd = [
            'ffprobe', '-v', 'error', '-show_entries', 'format=duration',
            '-of', 'default=noprint_wrappers=1:nokey=1', video_path
        ]
        result = subprocess.run(probe_cmd, capture_output=True, text=True)
        duration = float(result.stdout.strip())
        timestamp = duration / 2

    cmd = [
        'ffmpeg', '-i', video_path,
        '-ss', str(timestamp),
        '-vframes', '1',
        '-q:v', '2',
        '-y', output_path
    ]

    subprocess.run(cmd, check=True, capture_output=True)

    print(f"  ├─ Thumbnail generated: {output_path}")
    return output_path


def batch_export_for_platforms(short_path, output_dir, platforms=['tiktok', 'reels', 'shorts']):
    """
    Export short to multiple platform-specific formats.

    Platforms:
    - tiktok: 1080x1920, max 60s, high quality
    - reels: 1080x1920, max 90s, high quality
    - shorts: 1080x1920, max 60s, optimized for YouTube

    Returns: Dict of platform -> file path
    """
    os.makedirs(output_dir, exist_ok=True)
    exports = {}

    base_name = os.path.splitext(os.path.basename(short_path))[0]

    for platform in platforms:
        output_path = os.path.join(output_dir, f'{base_name}_{platform}.mp4')

        if platform == 'tiktok':
            # TikTok: max 60s, 1080x1920, optimized for mobile
            cmd = [
                'ffmpeg', '-i', short_path, '-t', '60',
                '-vf', 'scale=1080:1920',
                '-c:v', 'libx264', '-preset', 'slow', '-crf', '18',
                '-c:a', 'aac', '-b:a', '192k',
                '-y', output_path
            ]
        elif platform == 'reels':
            # Instagram Reels: max 90s, 1080x1920
            cmd = [
                'ffmpeg', '-i', short_path, '-t', '90',
                '-vf', 'scale=1080:1920',
                '-c:v', 'libx264', '-preset', 'slow', '-crf', '18',
                '-c:a', 'aac', '-b:a', '192k',
                '-y', output_path
            ]
        elif platform == 'shorts':
            # YouTube Shorts: max 60s, 1080x1920
            cmd = [
                'ffmpeg', '-i', short_path, '-t', '60',
                '-vf', 'scale=1080:1920',
                '-c:v', 'libx264', '-preset', 'slow', '-crf', '18',
                '-c:a', 'aac', '-b:a', '192k',
                '-y', output_path
            ]
        else:
            continue

        subprocess.run(cmd, check=True, capture_output=True)
        exports[platform] = output_path
        print(f"  ├─ Exported for {platform}: {output_path}")

    return exports

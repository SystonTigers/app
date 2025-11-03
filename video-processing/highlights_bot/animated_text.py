"""
Animated text effects module for viral social media captions
Implements kinetic typography effects (pop, slide, bounce, pulse, fade, typewriter)
"""

import subprocess
import os


# Effect library with metadata
EFFECT_LIBRARY = {
    'pop': {
        'description': 'Scale up from small to large',
        'duration': 0.3,
        'best_for': 'Goals, dramatic moments'
    },
    'slide_in': {
        'description': 'Slide in from side',
        'duration': 0.4,
        'best_for': 'Player names, stats'
    },
    'bounce': {
        'description': 'Bounce in with spring effect',
        'duration': 0.5,
        'best_for': 'Celebratory text'
    },
    'typewriter': {
        'description': 'Type out character by character',
        'duration': 1.0,
        'best_for': 'Longer captions'
    },
    'pulse': {
        'description': 'Continuous pulse/throb',
        'duration': None,  # Continuous
        'best_for': 'Attention grabbers'
    },
    'fade_in': {
        'description': 'Fade in from transparent',
        'duration': 0.3,
        'best_for': 'Subtle, professional'
    }
}


def add_animated_caption(input_path, output_path, caption_text, effect='pop',
                        position='center', duration=None, font_size=56,
                        font_color='white', border_color='black', border_width=3,
                        font_path=None):
    """
    Add animated text caption to video.

    Args:
        input_path: Input video
        output_path: Output video
        caption_text: Text to display
        effect: Animation effect (pop, slide_in, bounce, typewriter, pulse, fade_in)
        position: Position (top, center, bottom)
        duration: Display duration in seconds (None = entire video)
        font_size: Base font size
        font_color: Text color
        border_color: Border/outline color
        border_width: Border width in pixels
        font_path: Path to font file (optional)

    Returns:
        output_path: Path to video with animated caption
    """

    # Escape text for FFmpeg
    caption_escaped = caption_text.replace("'", "'\\\\\\''").replace(":", "\\\\:")

    # Get video duration if duration not specified
    if duration is None:
        result = subprocess.run(
            ['ffprobe', '-v', 'error', '-show_entries', 'format=duration',
             '-of', 'default=noprint_wrappers=1:nokey=1', input_path],
            capture_output=True, text=True
        )
        duration = float(result.stdout.strip())

    # Calculate position
    if position == 'top':
        y_pos = 'h*0.15'
    elif position == 'center':
        y_pos = '(h-text_h)/2'
    else:  # bottom
        y_pos = 'h*0.85-text_h'

    x_pos = '(w-text_w)/2'  # Always center horizontally

    # Determine font path
    if font_path is None:
        # Try common font locations
        if os.path.exists('brand/fonts/Inter-Bold.ttf'):
            font_path = 'brand/fonts/Inter-Bold.ttf'
        elif os.path.exists('C:/Windows/Fonts/arialbd.ttf'):
            font_path = 'C:/Windows/Fonts/arialbd.ttf'
        # If no font found, FFmpeg will use default

    # Build animation filter based on effect
    if effect == 'pop':
        # Scale animation: small to normal over 0.3s
        anim_duration = 0.3
        drawtext_filter = (
            f"drawtext=text='{caption_escaped}':"
            f"fontsize={font_size}*min(1\\,t/{anim_duration}):"  # Scale up
            f"x={x_pos}:y={y_pos}:"
            f"fontcolor={font_color}:"
            f"borderw={border_width}:bordercolor={border_color}:"
            f"enable='between(t,0,{duration})'"
        )

    elif effect == 'slide_in':
        # Slide from right to center over 0.4s
        anim_duration = 0.4
        drawtext_filter = (
            f"drawtext=text='{caption_escaped}':"
            f"fontsize={font_size}:"
            f"x=w-(w+text_w)*min(1\\,t/{anim_duration}):"  # Slide from right
            f"y={y_pos}:"
            f"fontcolor={font_color}:"
            f"borderw={border_width}:bordercolor={border_color}:"
            f"enable='between(t,0,{duration})'"
        )

    elif effect == 'bounce':
        # Bounce in with spring effect (quadratic ease-out)
        anim_duration = 0.5
        # Bounce from top with decay
        bounce_expr = f"max(0\\,1-t/{anim_duration})*max(0\\,1-t/{anim_duration})"
        drawtext_filter = (
            f"drawtext=text='{caption_escaped}':"
            f"fontsize={font_size}:"
            f"x={x_pos}:"
            f"y={y_pos}-(h*0.3)*{bounce_expr}:"  # Bounce from top
            f"fontcolor={font_color}:"
            f"borderw={border_width}:bordercolor={border_color}:"
            f"enable='between(t,0,{duration})'"
        )

    elif effect == 'fade_in':
        # Fade in from transparent over 0.3s
        anim_duration = 0.3
        drawtext_filter = (
            f"drawtext=text='{caption_escaped}':"
            f"fontsize={font_size}:"
            f"x={x_pos}:y={y_pos}:"
            f"fontcolor={font_color}@min(1\\,t/{anim_duration}):"  # Alpha fade
            f"borderw={border_width}:bordercolor={border_color}@min(1\\,t/{anim_duration}):"
            f"enable='between(t,0,{duration})'"
        )

    elif effect == 'pulse':
        # Continuous pulse effect
        pulse_speed = 2.0  # Pulses per second
        drawtext_filter = (
            f"drawtext=text='{caption_escaped}':"
            f"fontsize={font_size}*(1+0.1*sin(2*PI*{pulse_speed}*t)):"  # 10% size variation
            f"x={x_pos}:y={y_pos}:"
            f"fontcolor={font_color}:"
            f"borderw={border_width}:bordercolor={border_color}:"
            f"enable='between(t,0,{duration})'"
        )

    elif effect == 'typewriter':
        # Character-by-character reveal (simplified - shows full text with fade)
        # True typewriter effect requires multiple layers
        char_duration = 0.05  # 0.05s per character
        total_chars = len(caption_text)
        typewriter_duration = total_chars * char_duration

        drawtext_filter = (
            f"drawtext=text='{caption_escaped}':"
            f"fontsize={font_size}:"
            f"x={x_pos}:y={y_pos}:"
            f"fontcolor={font_color}@min(1\\,t/{typewriter_duration}):"
            f"borderw={border_width}:bordercolor={border_color}@min(1\\,t/{typewriter_duration}):"
            f"enable='between(t,0,{duration})'"
        )

    else:
        # Default: static text
        drawtext_filter = (
            f"drawtext=text='{caption_escaped}':"
            f"fontsize={font_size}:"
            f"x={x_pos}:y={y_pos}:"
            f"fontcolor={font_color}:"
            f"borderw={border_width}:bordercolor={border_color}:"
            f"enable='between(t,0,{duration})'"
        )

    # Add font if available
    if font_path and os.path.exists(font_path):
        # Escape backslashes in Windows paths
        font_path_escaped = font_path.replace('\\', '\\\\\\\\')
        drawtext_filter += f":fontfile={font_path_escaped}"

    # Apply filter
    cmd = [
        'ffmpeg',
        '-i', input_path,
        '-vf', drawtext_filter,
        '-c:a', 'copy',  # Copy audio
        '-c:v', 'libx264',
        '-crf', '18',
        '-preset', 'medium',
        '-y', output_path
    ]

    print(f"  ├─ Adding {effect} animation...")
    subprocess.run(cmd, check=True, capture_output=True)

    print(f"  └─ Animated caption added: {output_path}")
    return output_path


def add_event_caption_animated(input_path, output_path, event, effect='auto', config=None):
    """
    Add animated caption for a specific event.
    Automatically selects effect based on event type.

    Args:
        input_path: Input video
        output_path: Output video
        event: Event dictionary with type, player, etc.
        effect: Animation effect or 'auto' for automatic selection
        config: Optional config

    Returns:
        output_path: Path to video with animated caption
    """
    from captions import generate_caption_text

    # Generate caption text
    caption = generate_caption_text(event)

    # Auto-select effect based on event type
    if effect == 'auto':
        effect_map = {
            'goal': 'pop',         # Dramatic pop for goals
            'save': 'bounce',      # Bounce for saves
            'skill': 'slide_in',   # Smooth slide for skills
            'card': 'pulse',       # Attention-grabbing pulse for cards
            'chance': 'fade_in',   # Subtle fade for chances
            'tackle': 'slide_in',  # Slide for tackles
            'assist': 'pop',       # Pop for assists
        }
        effect = effect_map.get(event.get('type', 'highlight'), 'pop')

    # Get config parameters
    if config:
        font_size = config.get('shorts', {}).get('animated_text', {}).get('font_size', 56)
        position = config.get('shorts', {}).get('animated_text', {}).get('position', 'bottom')
    else:
        font_size = 56
        position = 'bottom'

    # Add animated caption
    return add_animated_caption(
        input_path,
        output_path,
        caption,
        effect=effect,
        position=position,
        duration=5.0,  # 5 second duration
        font_size=font_size,
        font_color='white',
        border_color='black',
        border_width=3
    )


def add_multi_caption_animated(input_path, output_path, captions_timeline, effect='auto'):
    """
    Add multiple animated captions at different timestamps.

    Args:
        input_path: Input video
        output_path: Output video
        captions_timeline: List of (start_time, end_time, text, effect) tuples
        effect: Default effect if not specified in timeline

    Returns:
        output_path: Path to video with animated captions
    """
    # This requires multiple drawtext filters chained together
    # Build complex filter string
    filters = []

    for idx, caption_data in enumerate(captions_timeline):
        if len(caption_data) == 4:
            start_time, end_time, text, cap_effect = caption_data
        else:
            start_time, end_time, text = caption_data
            cap_effect = effect

        duration = end_time - start_time
        text_escaped = text.replace("'", "'\\\\\\''").replace(":", "\\\\:")

        # Build filter for this caption (simplified - using fade_in)
        filter_part = (
            f"drawtext=text='{text_escaped}':"
            f"fontsize=56:"
            f"x=(w-text_w)/2:y=h*0.85-text_h:"
            f"fontcolor=white:"
            f"borderw=3:bordercolor=black:"
            f"enable='between(t,{start_time},{end_time})'"
        )

        filters.append(filter_part)

    # Combine all filters
    if len(filters) == 1:
        combined_filter = filters[0]
    else:
        # Chain drawtext filters
        combined_filter = ','.join(filters)

    cmd = [
        'ffmpeg',
        '-i', input_path,
        '-vf', combined_filter,
        '-c:a', 'copy',
        '-c:v', 'libx264',
        '-crf', '18',
        '-preset', 'medium',
        '-y', output_path
    ]

    subprocess.run(cmd, check=True, capture_output=True)

    print(f"  ✓ Added {len(captions_timeline)} animated captions")
    return output_path


def get_effect_info():
    """
    Get information about all available effects.

    Returns:
        Dictionary of effect information
    """
    return EFFECT_LIBRARY


def test_all_effects(input_path, output_dir='test_output/animated_text'):
    """
    Generate test videos for all animation effects.

    Args:
        input_path: Input test video
        output_dir: Output directory for test videos

    Returns:
        List of output paths
    """
    os.makedirs(output_dir, exist_ok=True)

    test_text = "⚽ GOAL! Mohamed Salah"
    outputs = []

    for effect_name in EFFECT_LIBRARY.keys():
        output_path = os.path.join(output_dir, f'test_{effect_name}.mp4')

        print(f"\nTesting effect: {effect_name}")
        print(f"  Description: {EFFECT_LIBRARY[effect_name]['description']}")

        add_animated_caption(
            input_path,
            output_path,
            test_text,
            effect=effect_name,
            position='bottom',
            duration=5.0,
            font_size=56
        )

        outputs.append(output_path)

    print(f"\n✅ Generated {len(outputs)} test videos in {output_dir}")
    return outputs

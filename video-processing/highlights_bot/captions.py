"""
SRT caption generation and text burn-in module
Generates subtitle files and burns captions into video
"""

import subprocess
import os


def format_srt_time(seconds):
    """
    Format seconds to SRT timestamp format: HH:MM:SS,mmm
    """
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    milliseconds = int((seconds % 1) * 1000)

    return f"{hours:02d}:{minutes:02d}:{secs:02d},{milliseconds:03d}"


def generate_srt_captions(events, match_meta, output_path):
    """
    Generate SRT caption file from events.

    Returns: Path to SRT file
    """
    srt_entries = []

    for idx, event in enumerate(events, start=1):
        # Calculate timestamps
        video_timestamp = event.get('video_timestamp', event.get('abs_ts', event.get('timestamp', 0)))
        duration = event.get('duration', 5.0)

        start_time = format_srt_time(video_timestamp)
        end_time = format_srt_time(video_timestamp + duration)

        # Generate caption text based on event type
        event_type = event.get('type', 'highlight')

        if event_type == 'goal':
            player = event.get('player', 'Unknown')
            team = event.get('team', '')
            minute = event.get('minute', '')
            text = f"⚽ GOAL! {player} ({team}) {minute}'"

            if event.get('assister') or event.get('assist'):
                assister = event.get('assister', event.get('assist'))
                text += f"\nAssist: {assister}"

        elif event_type == 'chance':
            team = event.get('team', 'Team')
            text = f"🎯 Big chance for {team}"

        elif event_type == 'card':
            player = event.get('player', 'Unknown')
            card_type = event.get('card_type', 'yellow')
            minute = event.get('minute', '')
            emoji = '🟨' if card_type == 'yellow' else '🟥'
            text = f"{emoji} {player} {minute}'"

        elif event_type == 'skill':
            player = event.get('player', 'Player')
            text = f"⭐ Great skill from {player}"

        elif event_type == 'save':
            player = event.get('player', 'Keeper')
            text = f"🧤 Save by {player}"

        elif event_type == 'tackle':
            player = event.get('player', 'Player')
            text = f"💪 Tackle by {player}"

        else:
            # Generic caption from notes or type
            notes = event.get('notes', '')
            minute = event.get('minute', '')
            if notes:
                text = notes
            else:
                text = f"{event_type.title()}"
                if minute:
                    text += f" - {minute}'"

        srt_entries.append({
            'index': idx,
            'start': start_time,
            'end': end_time,
            'text': text
        })

    # Write SRT file
    with open(output_path, 'w', encoding='utf-8') as f:
        for entry in srt_entries:
            f.write(f"{entry['index']}\n")
            f.write(f"{entry['start']} --> {entry['end']}\n")
            f.write(f"{entry['text']}\n")
            f.write("\n")

    print(f"✅ SRT captions generated: {output_path} ({len(srt_entries)} entries)")
    return output_path


def burn_caption(input_path, output_path, caption_text, position='top',
                duration=None, font_size=48, font_path=None):
    """
    Burn caption text into video.

    Parameters:
    - caption_text: Text to burn in
    - position: 'top', 'bottom', or 'center'
    - duration: How long to show caption (None = entire video)
    - font_size: Size of the font
    - font_path: Path to font file (optional)

    Returns: Path to output video
    """
    # Calculate position
    if position == 'top':
        y_pos = 'h*0.15'
    elif position == 'bottom':
        y_pos = 'h*0.85'
    else:
        y_pos = 'h*0.5'

    # Escape special characters for FFmpeg
    # Replace single quotes and colons which are problematic in FFmpeg
    caption_text = caption_text.replace("'", "'\\\\\\''")
    caption_text = caption_text.replace(":", "\\\\:")

    # Determine font path
    if font_path is None:
        # Try common font locations
        if os.path.exists('brand/fonts/Inter-Bold.ttf'):
            font_path = 'brand/fonts/Inter-Bold.ttf'
        elif os.path.exists('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'):
            font_path = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
        elif os.path.exists('C:/Windows/Fonts/arialbd.ttf'):
            font_path = 'C:/Windows/Fonts/arialbd.ttf'
        else:
            # Fall back to default font (no fontfile parameter)
            font_path = None

    # Build drawtext filter
    drawtext = (
        f"drawtext=text='{caption_text}':"
        f"fontsize={font_size}:fontcolor=white:bordercolor=black:borderw=3:"
        f"x=(w-text_w)/2:y={y_pos}"
    )

    if font_path:
        # Escape backslashes in Windows paths
        font_path_escaped = font_path.replace('\\', '\\\\\\\\')
        drawtext += f":fontfile={font_path_escaped}"

    if duration:
        drawtext += f":enable='between(t,0,{duration})'"

    cmd = [
        'ffmpeg', '-i', input_path,
        '-vf', drawtext,
        '-c:a', 'copy', '-c:v', 'libx264', '-crf', '18',
        '-y', output_path
    ]

    subprocess.run(cmd, check=True, capture_output=True)

    print(f"  ✓ Caption burned into video: {output_path}")
    return output_path


def burn_srt_file(input_path, output_path, srt_path, font_size=24, font_path=None):
    """
    Burn SRT subtitle file into video.

    Parameters:
    - srt_path: Path to SRT subtitle file
    - font_size: Size of the font
    - font_path: Path to font file (optional)

    Returns: Path to output video
    """
    if not os.path.exists(srt_path):
        raise FileNotFoundError(f"SRT file not found: {srt_path}")

    # Escape path for FFmpeg (especially for Windows)
    srt_path_escaped = srt_path.replace('\\', '\\\\\\\\').replace(':', '\\\\:')

    # Build subtitles filter
    subtitles_filter = f"subtitles={srt_path_escaped}:force_style='FontSize={font_size},PrimaryColour=&HFFFFFF,OutlineColour=&H000000,BorderStyle=1,Outline=2'"

    cmd = [
        'ffmpeg', '-i', input_path,
        '-vf', subtitles_filter,
        '-c:a', 'copy', '-c:v', 'libx264', '-crf', '18',
        '-y', output_path
    ]

    subprocess.run(cmd, check=True, capture_output=True)

    print(f"  ✓ SRT captions burned into video: {output_path}")
    return output_path


def generate_caption_text(event):
    """
    Generate caption text for a single event (used in shorts).

    Returns: String caption text
    """
    event_type = event.get('type', 'highlight')

    if event_type == 'goal':
        player = event.get('player', 'Unknown')
        team = event.get('team', '')
        return f"⚽ GOAL! {player}"

    elif event_type == 'chance':
        team = event.get('team', 'Team')
        return f"🎯 Big Chance - {team}"

    elif event_type == 'card':
        player = event.get('player', 'Unknown')
        card_type = event.get('card_type', 'yellow')
        emoji = '🟨' if card_type == 'yellow' else '🟥'
        return f"{emoji} Card - {player}"

    elif event_type == 'skill':
        player = event.get('player', 'Player')
        return f"⭐ Skill - {player}"

    elif event_type == 'save':
        player = event.get('player', 'Keeper')
        return f"🧤 Save - {player}"

    else:
        return event_type.title()


def add_auto_captions(input_path, output_path, events, style='modern'):
    """
    Add automatic captions to video based on events timeline.

    Parameters:
    - events: List of event dictionaries with timestamps
    - style: 'modern' (TikTok-style) or 'classic' (traditional subtitles)

    Returns: Path to output video
    """
    # Generate SRT file first
    import tempfile
    srt_temp = tempfile.NamedTemporaryFile(suffix='.srt', delete=False).name

    match_meta = {}
    generate_srt_captions(events, match_meta, srt_temp)

    # Burn SRT with appropriate styling
    if style == 'modern':
        # Modern TikTok-style large captions
        burn_srt_file(input_path, output_path, srt_temp, font_size=36)
    else:
        # Classic broadcast subtitles
        burn_srt_file(input_path, output_path, srt_temp, font_size=24)

    # Cleanup temp SRT
    os.remove(srt_temp)

    return output_path


def validate_srt_file(srt_path):
    """
    Validate SRT file format and return any errors.

    Returns: List of error messages (empty if valid)
    """
    errors = []

    if not os.path.exists(srt_path):
        errors.append(f"File not found: {srt_path}")
        return errors

    try:
        with open(srt_path, 'r', encoding='utf-8') as f:
            content = f.read()

        # Basic validation
        entries = content.strip().split('\n\n')

        for idx, entry in enumerate(entries, 1):
            lines = entry.strip().split('\n')

            if len(lines) < 3:
                errors.append(f"Entry {idx}: Incomplete entry (needs index, timestamp, text)")
                continue

            # Check index
            try:
                index = int(lines[0])
                if index != idx:
                    errors.append(f"Entry {idx}: Index mismatch (expected {idx}, got {index})")
            except ValueError:
                errors.append(f"Entry {idx}: Invalid index (not a number)")

            # Check timestamp format
            if '-->' not in lines[1]:
                errors.append(f"Entry {idx}: Invalid timestamp format (missing -->)")

        if not errors:
            print(f"✅ SRT file is valid: {len(entries)} entries")

    except Exception as e:
        errors.append(f"Error reading file: {str(e)}")

    return errors

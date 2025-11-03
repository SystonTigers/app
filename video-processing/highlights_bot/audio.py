"""
Professional audio processing module for broadcast-quality audio
Includes loudness normalization, ducking, and peak limiting
"""

import subprocess
import json
import re


def normalize_loudness(input_path, output_path, target_lufs=-14.0, true_peak=-1.5):
    """
    Normalize audio to broadcast standard (-14 LUFS).

    Parameters:
    - target_lufs: Target integrated loudness (-14 LUFS is broadcast standard)
    - true_peak: Maximum true peak level (-1.5 dBTP prevents clipping)

    Returns: Path to normalized audio video
    """
    # Two-pass loudnorm
    # Pass 1: Measure loudness
    cmd_measure = [
        'ffmpeg', '-i', input_path,
        '-af', f'loudnorm=I={target_lufs}:TP={true_peak}:LRA=11:print_format=json',
        '-f', 'null', '-'
    ]

    print(f"  ├─ Pass 1: Measuring loudness...")
    result = subprocess.run(cmd_measure, capture_output=True, text=True)

    # Parse JSON output from stderr
    output_lines = result.stderr.split('\n')
    json_start = False
    json_lines = []

    for line in output_lines:
        if '{' in line:
            json_start = True
        if json_start:
            json_lines.append(line)
        if '}' in line and json_start:
            break

    try:
        stats = json.loads(''.join(json_lines))
        measured_i = stats.get('input_i', target_lufs)
        measured_tp = stats.get('input_tp', true_peak)
        measured_lra = stats.get('input_lra', '11.0')
        measured_thresh = stats.get('input_thresh', '-24.0')
    except:
        # Fallback if parsing fails
        measured_i = target_lufs
        measured_tp = true_peak
        measured_lra = '11.0'
        measured_thresh = '-24.0'

    print(f"  ├─ Measured: {measured_i} LUFS, {measured_tp} dBTP")

    # Pass 2: Apply normalization with measured values
    cmd_normalize = [
        'ffmpeg', '-i', input_path,
        '-af', f'loudnorm=I={target_lufs}:TP={true_peak}:LRA=11:' +
               f'measured_I={measured_i}:measured_TP={measured_tp}:' +
               f'measured_LRA={measured_lra}:measured_thresh={measured_thresh}:' +
               f'linear=true:print_format=summary',
        '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k',
        '-y', output_path
    ]

    print(f"  └─ Pass 2: Applying normalization...")
    subprocess.run(cmd_normalize, check=True, capture_output=True)

    print(f"  ✓ Audio normalized to {target_lufs} LUFS")
    return output_path


def duck_audio_during_overlays(input_path, output_path, overlay_times,
                               duck_amount_db=-3.0, fade_duration=0.5):
    """
    Duck (reduce) audio during overlay/voiceover segments.

    Parameters:
    - overlay_times: List of (start, end) tuples in seconds
    - duck_amount_db: How much to reduce audio (-3 dB = half volume)
    - fade_duration: Crossfade duration in seconds

    Returns: Path to ducked audio video
    """
    if not overlay_times:
        # No ducking needed, just copy
        import shutil
        shutil.copy(input_path, output_path)
        print(f"  ✓ No ducking needed (no overlay times)")
        return output_path

    # Build complex filter for ducking
    # We'll use volume filter with enable expressions

    filter_parts = []

    for idx, (start, end) in enumerate(overlay_times):
        # Calculate linear volume factor from dB
        duck_factor = 10 ** (duck_amount_db / 20)

        # Create filter with smooth transitions
        filter_expr = (
            f"volume='{duck_factor}:"
            f"enable=between(t,{start},{end}):"
            f"eval=frame'"
        )
        filter_parts.append(filter_expr)

    if filter_parts:
        full_filter = ','.join(filter_parts)
    else:
        full_filter = 'anull'  # No ducking

    cmd = [
        'ffmpeg', '-i', input_path,
        '-af', full_filter,
        '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k',
        '-y', output_path
    ]

    subprocess.run(cmd, check=True, capture_output=True)

    print(f"  ✓ Audio ducked at {len(overlay_times)} segments ({duck_amount_db} dB)")
    return output_path


def apply_peak_limiter(input_path, output_path, threshold_db=-2.0, release_ms=50):
    """
    Apply peak limiter to prevent audio clipping.

    Parameters:
    - threshold_db: Threshold level in dB (default -2.0)
    - release_ms: Release time in milliseconds (default 50ms)

    Returns: Path to limited audio video
    """
    cmd = [
        'ffmpeg', '-i', input_path,
        '-af', f'alimiter=limit={threshold_db}dB:attack=5:release={release_ms}:level=false',
        '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k',
        '-y', output_path
    ]

    subprocess.run(cmd, check=True, capture_output=True)

    print(f"  ✓ Peak limiter applied (threshold: {threshold_db} dB)")
    return output_path


def add_audio_fade(input_path, output_path, fade_in_duration=0.5, fade_out_duration=1.0):
    """
    Add fade in/out to audio.

    Parameters:
    - fade_in_duration: Fade in duration in seconds
    - fade_out_duration: Fade out duration in seconds

    Returns: Path to faded audio video
    """
    # Get video duration
    probe_cmd = [
        'ffprobe', '-v', 'error', '-show_entries', 'format=duration',
        '-of', 'default=noprint_wrappers=1:nokey=1', input_path
    ]
    result = subprocess.run(probe_cmd, capture_output=True, text=True)
    duration = float(result.stdout.strip())

    # Calculate fade out start time
    fade_out_start = duration - fade_out_duration

    # Build filter
    audio_filter = f'afade=t=in:st=0:d={fade_in_duration},afade=t=out:st={fade_out_start}:d={fade_out_duration}'

    cmd = [
        'ffmpeg', '-i', input_path,
        '-af', audio_filter,
        '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k',
        '-y', output_path
    ]

    subprocess.run(cmd, check=True, capture_output=True)

    print(f"  ✓ Audio fades applied (in: {fade_in_duration}s, out: {fade_out_duration}s)")
    return output_path


def mix_audio_tracks(video_path, music_path, output_path, video_volume=1.0, music_volume=0.3):
    """
    Mix background music with video audio.

    Parameters:
    - video_path: Main video with audio
    - music_path: Background music file
    - output_path: Output video path
    - video_volume: Volume multiplier for video audio (1.0 = original)
    - music_volume: Volume multiplier for music (0.3 = 30% volume)

    Returns: Path to mixed audio video
    """
    # Build filter complex for mixing
    filter_complex = (
        f'[0:a]volume={video_volume}[a0];'
        f'[1:a]volume={music_volume}[a1];'
        f'[a0][a1]amix=inputs=2:duration=first:dropout_transition=2[aout]'
    )

    cmd = [
        'ffmpeg', '-i', video_path, '-i', music_path,
        '-filter_complex', filter_complex,
        '-map', '0:v', '-map', '[aout]',
        '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k',
        '-shortest',  # End when shortest input ends
        '-y', output_path
    ]

    subprocess.run(cmd, check=True, capture_output=True)

    print(f"  ✓ Audio tracks mixed (video: {video_volume*100:.0f}%, music: {music_volume*100:.0f}%)")
    return output_path


def extract_audio_info(input_path):
    """
    Extract detailed audio information from video.

    Returns: Dictionary with audio stats
    """
    cmd = [
        'ffprobe', '-v', 'error',
        '-show_entries', 'stream=codec_name,sample_rate,channels,bit_rate',
        '-select_streams', 'a:0',
        '-of', 'json',
        input_path
    ]

    result = subprocess.run(cmd, capture_output=True, text=True)

    try:
        data = json.loads(result.stdout)
        if 'streams' in data and len(data['streams']) > 0:
            stream = data['streams'][0]
            return {
                'codec': stream.get('codec_name', 'unknown'),
                'sample_rate': int(stream.get('sample_rate', 0)),
                'channels': int(stream.get('channels', 0)),
                'bit_rate': int(stream.get('bit_rate', 0)) if stream.get('bit_rate') else None
            }
    except:
        pass

    return None


def apply_professional_audio_chain(input_path, output_path, config=None):
    """
    Apply complete professional audio processing chain.

    Chain: Normalize → Limit → Fade

    Parameters:
    - config: Optional configuration dict with processing parameters

    Returns: Path to processed audio video
    """
    import tempfile
    import os

    if config is None:
        config = {}

    # Create temp files for intermediate steps
    temp_dir = tempfile.gettempdir()
    temp1 = os.path.join(temp_dir, f'audio_temp1_{os.getpid()}.mp4')
    temp2 = os.path.join(temp_dir, f'audio_temp2_{os.getpid()}.mp4')

    print("  🎵 Applying professional audio chain...")

    try:
        # Step 1: Normalize loudness
        target_lufs = config.get('target_lufs', -14.0)
        true_peak = config.get('true_peak', -1.5)
        normalize_loudness(input_path, temp1, target_lufs, true_peak)

        # Step 2: Peak limiter
        threshold_db = config.get('limiter_threshold', -2.0)
        apply_peak_limiter(temp1, temp2, threshold_db)

        # Step 3: Fades
        fade_in = config.get('fade_in', 0.5)
        fade_out = config.get('fade_out', 1.0)
        add_audio_fade(temp2, output_path, fade_in, fade_out)

        print("  ✓ Professional audio chain complete")

    finally:
        # Cleanup temp files
        for temp_file in [temp1, temp2]:
            if os.path.exists(temp_file):
                os.remove(temp_file)

    return output_path

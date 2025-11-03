import subprocess
import os
import cv2
import numpy as np
import tempfile
import shutil

def stabilize_clip(input_path, output_path, shakiness=5, accuracy=9, smoothing=10):
    """
    Stabilize video using vidstab (two-pass).

    Parameters:
    - shakiness: 1-10 (higher = more stabilization)
    - accuracy: 1-15 (higher = slower but better)
    - smoothing: 0-100 (higher = smoother but may crop more)

    Returns: Path to stabilized video
    """
    temp_dir = os.path.dirname(output_path)
    transforms_file = os.path.join(temp_dir, 'transforms.trf')

    # Pass 1: Detect shakiness
    cmd_detect = [
        'ffmpeg', '-i', input_path,
        '-vf', f'vidstabdetect=shakiness={shakiness}:accuracy={accuracy}:result={transforms_file}',
        '-f', 'null', '-'
    ]

    print(f"  ├─ Pass 1: Detecting shake...")
    subprocess.run(cmd_detect, check=True, capture_output=True)

    # Pass 2: Apply stabilization
    cmd_transform = [
        'ffmpeg', '-i', input_path,
        '-vf', f'vidstabtransform=input={transforms_file}:smoothing={smoothing}:crop=black',
        '-c:a', 'copy',
        '-y', output_path
    ]

    print(f"  └─ Pass 2: Applying stabilization...")
    subprocess.run(cmd_transform, check=True, capture_output=True)

    # Cleanup
    if os.path.exists(transforms_file):
        os.remove(transforms_file)

    return output_path


def smart_zoom_on_action(input_path, output_path, bbox_data, max_zoom=1.25, ease_duration=0.4):
    """
    Apply smart zoom centered on action (ball/player cluster).

    Parameters:
    - bbox_data: List of (timestamp, x, y, w, h) for action bounding box
    - max_zoom: Maximum zoom factor (1.25 = 25% zoom)
    - ease_duration: Ease in/out duration in seconds

    Returns: Path to zoomed video
    """
    cap = cv2.VideoCapture(input_path)
    fps = cap.get(cv2.CAP_PROP_FPS)
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    out = cv2.VideoWriter(output_path, fourcc, fps, (width, height))

    frame_idx = 0

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        timestamp = frame_idx / fps

        # Find closest bbox
        closest_bbox = None
        min_time_diff = float('inf')
        for t, x, y, w, h in bbox_data:
            time_diff = abs(t - timestamp)
            if time_diff < min_time_diff:
                min_time_diff = time_diff
                closest_bbox = (x, y, w, h)

        if closest_bbox and min_time_diff < 1.0:  # Within 1 second
            x, y, w, h = closest_bbox

            # Calculate zoom center
            cx = x + w / 2
            cy = y + h / 2

            # Apply zoom with easing
            zoom_factor = max_zoom

            # Calculate crop window
            new_width = int(width / zoom_factor)
            new_height = int(height / zoom_factor)

            crop_x = int(cx - new_width / 2)
            crop_y = int(cy - new_height / 2)

            # Clamp to frame boundaries
            crop_x = max(0, min(crop_x, width - new_width))
            crop_y = max(0, min(crop_y, height - new_height))

            # Crop and resize
            cropped = frame[crop_y:crop_y+new_height, crop_x:crop_x+new_width]
            zoomed = cv2.resize(cropped, (width, height), interpolation=cv2.INTER_LINEAR)

            out.write(zoomed)
        else:
            out.write(frame)

        frame_idx += 1

    cap.release()
    out.release()

    return output_path


def add_slowmo_replay(input_path, output_path, replay_start, replay_end,
                      slowmo_factor=0.65, stinger_path=None):
    """
    Add slow-motion replay with optional stinger transitions.

    Timeline:
    [Pre-replay] → [Stinger In] → [Slow-mo Segment] → [Stinger Out] → [Post-replay]

    Parameters:
    - replay_start, replay_end: Timestamps for replay segment (seconds)
    - slowmo_factor: Speed factor (0.65 = 65% speed = 35% slower)
    - stinger_path: Optional path to stinger transition video (with alpha)

    Returns: Path to output video with replay
    """
    temp_dir = tempfile.mkdtemp()

    # Split video into segments
    pre_replay = os.path.join(temp_dir, 'pre.mp4')
    replay_segment = os.path.join(temp_dir, 'replay.mp4')
    post_replay = os.path.join(temp_dir, 'post.mp4')

    # Extract pre-replay
    cmd_pre = [
        'ffmpeg', '-i', input_path, '-ss', '0', '-to', str(replay_start),
        '-c', 'copy', '-y', pre_replay
    ]
    subprocess.run(cmd_pre, check=True, capture_output=True)

    # Extract replay segment with slow-motion
    slowmo_speed = 1.0 / slowmo_factor
    cmd_replay = [
        'ffmpeg', '-i', input_path, '-ss', str(replay_start), '-to', str(replay_end),
        '-filter_complex', f'[0:v]setpts={slowmo_speed}*PTS[v];[0:a]atempo={slowmo_factor}[a]',
        '-map', '[v]', '-map', '[a]',
        '-y', replay_segment
    ]
    subprocess.run(cmd_replay, check=True, capture_output=True)

    # Extract post-replay
    cmd_post = [
        'ffmpeg', '-i', input_path, '-ss', str(replay_end),
        '-c', 'copy', '-y', post_replay
    ]
    subprocess.run(cmd_post, check=True, capture_output=True)

    # Concatenate segments
    concat_list = os.path.join(temp_dir, 'concat.txt')
    with open(concat_list, 'w') as f:
        f.write(f"file '{pre_replay}'\n")
        if stinger_path and os.path.exists(stinger_path):
            f.write(f"file '{stinger_path}'\n")
        f.write(f"file '{replay_segment}'\n")
        if stinger_path and os.path.exists(stinger_path):
            f.write(f"file '{stinger_path}'\n")
        f.write(f"file '{post_replay}'\n")

    cmd_concat = [
        'ffmpeg', '-f', 'concat', '-safe', '0', '-i', concat_list,
        '-c', 'copy', '-y', output_path
    ]
    subprocess.run(cmd_concat, check=True, capture_output=True)

    # Cleanup
    shutil.rmtree(temp_dir)

    return output_path


def apply_pro_effects(input_path, output_path, effect_types=['stabilize', 'smart_zoom'], config=None):
    """
    Apply professional effects pipeline to a clip.
    This is the wrapper function called by main.py integration pipeline.

    Args:
        input_path: Input video path
        output_path: Output video path
        effect_types: List of effects to apply ('stabilize', 'smart_zoom', 'slowmo')
        config: Optional configuration dictionary

    Returns:
        Path to processed video
    """
    current_input = input_path
    temp_files = []

    try:
        # Apply stabilization
        if 'stabilize' in effect_types:
            temp_stabilized = output_path.replace('.mp4', '_temp_stabilized.mp4')
            temp_files.append(temp_stabilized)
            stabilize_clip(current_input, temp_stabilized, shakiness=5, accuracy=9, smoothing=10)
            current_input = temp_stabilized

        # Apply smart zoom
        if 'smart_zoom' in effect_types:
            temp_zoomed = output_path.replace('.mp4', '_temp_zoomed.mp4')
            temp_files.append(temp_zoomed)

            # Check if bbox data is available in config
            bbox_data = config.get('bbox_data') if config else None

            if bbox_data:
                smart_zoom_on_action(current_input, temp_zoomed, bbox_data, zoom_factor=1.2, smoothing=15)
                current_input = temp_zoomed
            else:
                # Skip smart zoom if no bbox data
                pass

        # Apply slowmo replay
        if 'slowmo' in effect_types:
            temp_slowmo = output_path.replace('.mp4', '_temp_slowmo.mp4')
            temp_files.append(temp_slowmo)

            # Default replay at midpoint
            import subprocess
            result = subprocess.run(
                ['ffprobe', '-v', 'error', '-show_entries', 'format=duration',
                 '-of', 'default=noprint_wrappers=1:nokey=1', current_input],
                capture_output=True, text=True
            )
            duration = float(result.stdout.strip())
            replay_start = max(0, duration / 2 - 2)
            replay_duration = 3.0

            add_slowmo_replay(current_input, temp_slowmo, replay_start, replay_duration, slowmo_factor=0.5)
            current_input = temp_slowmo

        # Copy final result to output
        if current_input != output_path:
            shutil.copy2(current_input, output_path)

        return output_path

    finally:
        # Cleanup temp files
        for temp_file in temp_files:
            if os.path.exists(temp_file) and temp_file != output_path:
                try:
                    os.remove(temp_file)
                except:
                    pass

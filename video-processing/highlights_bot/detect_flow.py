"""
Optical flow-based event detection for highlights extraction.

This module analyzes video motion to detect:
- Flow Bursts: Sudden movement spikes (shots, scrambles)
- Goal Area Activity: Activity detection in scoring zones

Part of Phase 1: Multi-Signal Event Detection
Created: 2025-11-03
"""

import cv2
import numpy as np
from typing import List, Dict, Optional


def detect_flow_bursts(video_path: str, roi: str = 'goal_area', threshold: float = 2.5, sample_rate: int = 2) -> List[Dict]:
    """
    Detect high-velocity optical flow bursts indicating action moments.

    Optical flow measures apparent motion between consecutive frames.
    High flow magnitude indicates rapid movement (shots, tackles, scrambles).

    Args:
        video_path: Path to video file
        roi: Region of interest ('goal_area', 'full_frame', or 'center')
        threshold: Flow magnitude threshold (default 2.5)
        sample_rate: Process every Nth frame (default 2 for speed)

    Returns:
        List of dictionaries with:
        - timestamp: Event time (seconds)
        - magnitude: Flow magnitude (pixels/frame)
        - type: Always 'flow_burst'

    Example:
        >>> bursts = detect_flow_bursts('match.mp4', roi='goal_area', threshold=2.5)
        >>> print(f"Found {len(bursts)} movement bursts")
        >>> for burst in bursts[:5]:
        ...     print(f"{burst['timestamp']:.1f}s - Magnitude: {burst['magnitude']:.2f}")
    """
    print(f"  📊 Analyzing optical flow (ROI={roi}, threshold={threshold}, sample_rate={sample_rate})")

    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        print(f"  ❌ Failed to open video: {video_path}")
        return []

    fps = cap.get(cv2.CAP_PROP_FPS)
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

    # Read first frame
    ret, prev_frame = cap.read()
    if not ret:
        print("  ❌ Failed to read first frame")
        cap.release()
        return []

    prev_gray = cv2.cvtColor(prev_frame, cv2.COLOR_BGR2GRAY)
    height, width = prev_gray.shape

    # Create ROI mask
    roi_mask = create_roi_mask(height, width, roi)

    bursts = []
    frame_idx = 0
    processed_frames = 0

    print(f"  ⏳ Processing {total_frames} frames (sampling every {sample_rate} frames)...")

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        frame_idx += 1

        # Sample frames for speed
        if frame_idx % sample_rate != 0:
            continue

        processed_frames += 1

        # Convert to grayscale
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)

        # Calculate dense optical flow using Farneback method
        flow = cv2.calcOpticalFlowFarneback(
            prev_gray, gray, None,
            pyr_scale=0.5,  # Image pyramid scale
            levels=3,       # Pyramid levels
            winsize=15,     # Window size
            iterations=3,   # Iterations per level
            poly_n=5,       # Polynomial neighborhood size
            poly_sigma=1.2, # Gaussian std for polynomial expansion
            flags=0
        )

        # Calculate flow magnitude
        magnitude = np.sqrt(flow[:, :, 0] ** 2 + flow[:, :, 1] ** 2)

        # Apply ROI mask
        roi_magnitude = magnitude * roi_mask
        roi_pixels = roi_mask > 0

        if np.any(roi_pixels):
            avg_magnitude = float(np.mean(roi_magnitude[roi_pixels]))
        else:
            avg_magnitude = 0.0

        # Detect burst
        if avg_magnitude > threshold:
            timestamp = float(frame_idx / fps)
            bursts.append({
                'timestamp': timestamp,
                'magnitude': avg_magnitude,
                'type': 'flow_burst'
            })

        prev_gray = gray

        # Progress indicator
        if processed_frames % 100 == 0:
            progress = (frame_idx / total_frames) * 100
            print(f"  ⏳ Progress: {progress:.1f}% ({frame_idx}/{total_frames} frames)")

    cap.release()

    print(f"  ✅ Processed {processed_frames} frames, found {len(bursts)} raw bursts")

    # Merge nearby bursts (within 2 seconds)
    merged = merge_nearby_events(bursts, time_window=2.0, merge_key='magnitude', merge_fn=max)

    print(f"  ✅ Merged to {len(merged)} distinct flow bursts")
    return merged


def create_roi_mask(height: int, width: int, roi: str) -> np.ndarray:
    """
    Create a binary mask for region of interest.

    Args:
        height: Frame height
        width: Frame width
        roi: ROI type ('goal_area', 'full_frame', 'center')

    Returns:
        Binary mask (1 = include, 0 = exclude)
    """
    mask = np.zeros((height, width), dtype=np.uint8)

    if roi == 'goal_area':
        # Top 30% and bottom 30% (goal areas)
        mask[0:int(height * 0.3), :] = 1
        mask[int(height * 0.7):, :] = 1
    elif roi == 'center':
        # Center 50% of frame
        y_start = int(height * 0.25)
        y_end = int(height * 0.75)
        x_start = int(width * 0.25)
        x_end = int(width * 0.75)
        mask[y_start:y_end, x_start:x_end] = 1
    elif roi == 'full_frame':
        # Entire frame
        mask[:, :] = 1
    else:
        # Default to full frame
        mask[:, :] = 1

    return mask


def detect_scene_cuts(video_path: str, threshold: float = 30.0, sample_rate: int = 1) -> List[Dict]:
    """
    Detect scene cuts/transitions using histogram difference.

    Scene cuts often indicate production switches to replays or
    different camera angles, which can signal important moments.

    Args:
        video_path: Path to video file
        threshold: Histogram difference threshold (default 30.0)
        sample_rate: Process every Nth frame (default 1)

    Returns:
        List of dictionaries with:
        - timestamp: Cut time (seconds)
        - difference: Histogram difference score
        - type: Always 'scene_cut'

    Example:
        >>> cuts = detect_scene_cuts('match.mp4', threshold=30.0)
        >>> print(f"Found {len(cuts)} scene cuts")
    """
    print(f"  ✂️  Detecting scene cuts (threshold={threshold})")

    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        print(f"  ❌ Failed to open video")
        return []

    fps = cap.get(cv2.CAP_PROP_FPS)

    ret, prev_frame = cap.read()
    if not ret:
        cap.release()
        return []

    prev_hist = cv2.calcHist([prev_frame], [0, 1, 2], None, [8, 8, 8], [0, 256, 0, 256, 0, 256])
    cv2.normalize(prev_hist, prev_hist, alpha=0, beta=1, norm_type=cv2.NORM_MINMAX)

    cuts = []
    frame_idx = 0

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        frame_idx += 1

        if frame_idx % sample_rate != 0:
            continue

        # Calculate histogram
        hist = cv2.calcHist([frame], [0, 1, 2], None, [8, 8, 8], [0, 256, 0, 256, 0, 256])
        cv2.normalize(hist, hist, alpha=0, beta=1, norm_type=cv2.NORM_MINMAX)

        # Compare histograms
        diff = cv2.compareHist(prev_hist, hist, cv2.HISTCMP_BHATTACHARYYA) * 100

        if diff > threshold:
            timestamp = float(frame_idx / fps)
            cuts.append({
                'timestamp': timestamp,
                'difference': float(diff),
                'type': 'scene_cut'
            })

        prev_hist = hist

    cap.release()

    # Merge cuts within 1 second
    merged = merge_nearby_events(cuts, time_window=1.0, merge_key='difference', merge_fn=max)

    print(f"  ✅ Found {len(merged)} scene cuts")
    return merged


def merge_nearby_events(events: List[Dict], time_window: float, merge_key: str, merge_fn=max) -> List[Dict]:
    """
    Merge events that occur within a time window.

    Args:
        events: List of event dictionaries with 'timestamp'
        time_window: Time window in seconds
        merge_key: Key to merge (e.g., 'magnitude', 'confidence')
        merge_fn: Function to merge values (max, min, mean)

    Returns:
        Merged list of events
    """
    if not events:
        return []

    # Sort by timestamp
    sorted_events = sorted(events, key=lambda x: x['timestamp'])

    merged = []
    current = sorted_events[0].copy()

    for event in sorted_events[1:]:
        if event['timestamp'] - current['timestamp'] < time_window:
            # Merge: update key using merge function
            current[merge_key] = merge_fn(current[merge_key], event[merge_key])
        else:
            # Save current and start new
            merged.append(current)
            current = event.copy()

    # Don't forget the last event
    merged.append(current)

    return merged


# For testing
if __name__ == '__main__':
    import sys

    if len(sys.argv) < 2:
        print("Usage: python detect_flow.py <video_path>")
        sys.exit(1)

    video_path = sys.argv[1]
    print(f"\n🎬 Testing optical flow detection on: {video_path}\n")

    # Test flow bursts
    print("=" * 60)
    print("TEST 1: Optical Flow Bursts")
    print("=" * 60)
    bursts = detect_flow_bursts(video_path, roi='goal_area', threshold=2.5, sample_rate=2)
    print(f"\nResults: {len(bursts)} flow bursts detected\n")
    for i, burst in enumerate(bursts[:5], 1):
        print(f"  {i}. {burst['timestamp']:.1f}s - Magnitude: {burst['magnitude']:.2f}")
    if len(bursts) > 5:
        print(f"  ... and {len(bursts) - 5} more")

    # Test scene cuts
    print("\n" + "=" * 60)
    print("TEST 2: Scene Cut Detection")
    print("=" * 60)
    cuts = detect_scene_cuts(video_path, threshold=30.0, sample_rate=2)
    print(f"\nResults: {len(cuts)} scene cuts detected\n")
    for i, cut in enumerate(cuts[:5], 1):
        print(f"  {i}. {cut['timestamp']:.1f}s - Difference: {cut['difference']:.2f}")
    if len(cuts) > 5:
        print(f"  ... and {len(cuts) - 5} more")

    print("\n✅ Optical flow detection tests complete!\n")

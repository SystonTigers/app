#!/usr/bin/env python3
"""
AI-Powered Smart Cropping for Vertical Shorts
Uses YOLOv8 for automatic ball/player detection and tracking

Part of Phase 9: High-Value Enhancements
Created: 2025-11-03
"""

import cv2
import numpy as np
from typing import Optional, Dict, Tuple
import os


def ai_smart_crop_to_vertical(input_path: str, output_path: str,
                              target_res: Tuple[int, int] = (1080, 1920),
                              config: Optional[Dict] = None) -> str:
    """
    AI-powered smart cropping using YOLOv8 for automatic action detection.

    Features:
    - Automatic ball/player detection
    - Dynamic action tracking
    - Smooth panning (EMA smoothing)
    - Fallback to center if no detections

    Args:
        input_path: Input video (16:9)
        output_path: Output video (9:16)
        target_res: Target resolution (default 1080x1920)
        config: Optional config with model settings

    Returns:
        output_path: Path to cropped video
    """
    try:
        from ultralytics import YOLO
    except ImportError:
        print("⚠️  YOLOv8 (ultralytics) not installed. Install with: pip install ultralytics")
        print("   Falling back to center crop...")
        return _fallback_center_crop(input_path, output_path, target_res)

    # Load YOLOv8 model
    model_name = config.get('yolo_model', 'yolov8n.pt') if config else 'yolov8n.pt'

    try:
        print(f"📦 Loading YOLO model: {model_name}")
        model = YOLO(model_name)
    except Exception as e:
        print(f"⚠️  Failed to load YOLO model: {e}")
        print("   Falling back to center crop...")
        return _fallback_center_crop(input_path, output_path, target_res)

    # Open video
    cap = cv2.VideoCapture(input_path)
    if not cap.isOpened():
        raise ValueError(f"Cannot open video: {input_path}")

    fps = int(cap.get(cv2.CAP_PROP_FPS))
    frame_width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    frame_height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

    # Calculate crop dimensions (9:16 aspect ratio)
    target_width, target_height = target_res
    crop_width = int(frame_height * (target_width / target_height))
    crop_height = frame_height

    # Check if crop width is valid
    if crop_width > frame_width:
        print(f"⚠️  Warning: Crop width ({crop_width}) exceeds frame width ({frame_width})")
        crop_width = frame_width
        crop_height = int(crop_width * (target_height / target_width))
        print(f"   Adjusted crop to: {crop_width}x{crop_height}")

    # Prepare output writer
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    out = cv2.VideoWriter(output_path, fourcc, fps, target_res)

    if not out.isOpened():
        raise ValueError(f"Cannot create output video: {output_path}")

    # Tracking variables
    smooth_center_x = frame_width // 2  # Start at center
    alpha = config.get('smoothing', 0.3) if config else 0.3  # EMA smoothing factor
    priority = config.get('priority', 'ball') if config else 'ball'

    frame_count = 0
    detection_count = 0

    print(f"\n🎬 AI Smart Cropping: {input_path}")
    print(f"   Original: {frame_width}x{frame_height}")
    print(f"   Crop to: {crop_width}x{crop_height}")
    print(f"   Resize to: {target_res}")
    print(f"   Model: {model_name}")
    print(f"   Smoothing: {alpha}")
    print(f"   Priority: {priority}")
    print(f"   Total frames: {total_frames}")

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        frame_count += 1

        # Progress indicator every 30 frames
        if frame_count % 30 == 0 or frame_count == 1:
            progress = (frame_count / total_frames) * 100
            print(f"   Progress: {progress:.1f}% ({frame_count}/{total_frames} frames) - Detections: {detection_count}")

        # Run YOLO detection (every frame for smoothest tracking)
        # Classes: 0=person, 32=sports ball, 37=sports equipment
        try:
            results = model(frame, classes=[0, 32, 37], verbose=False, conf=0.3)
        except Exception as e:
            # If detection fails, use previous center
            results = []

        # Calculate action center from detections
        action_center_x = None

        if len(results) > 0 and len(results[0].boxes) > 0:
            boxes = results[0].boxes
            detection_count += 1

            # Priority: ball > players
            ball_boxes = [box for box in boxes if int(box.cls[0]) == 32]  # sports ball
            player_boxes = [box for box in boxes if int(box.cls[0]) == 0]  # person

            if priority == 'ball' or priority == 'ball_first':
                if ball_boxes:
                    # If ball detected, center on ball
                    ball_box = ball_boxes[0]  # Use first ball detection
                    x_center = float(ball_box.xywh[0][0])
                    action_center_x = x_center
                elif player_boxes:
                    # If no ball, use center of mass of all players
                    x_coords = [float(box.xywh[0][0]) for box in player_boxes]
                    action_center_x = np.mean(x_coords)
            elif priority == 'players' or priority == 'center_of_mass':
                if player_boxes:
                    # Use center of mass of all players
                    x_coords = [float(box.xywh[0][0]) for box in player_boxes]
                    action_center_x = np.mean(x_coords)
                elif ball_boxes:
                    # Fallback to ball if no players
                    ball_box = ball_boxes[0]
                    x_center = float(ball_box.xywh[0][0])
                    action_center_x = x_center

        # Update smooth center with EMA
        if action_center_x is not None:
            smooth_center_x = alpha * action_center_x + (1 - alpha) * smooth_center_x
        # else: keep previous smooth_center_x (no detection, maintain last position)

        # Calculate crop region
        crop_x_start = int(smooth_center_x - crop_width / 2)

        # Boundary checks
        if crop_x_start < 0:
            crop_x_start = 0
        elif crop_x_start + crop_width > frame_width:
            crop_x_start = frame_width - crop_width

        # Crop frame
        cropped = frame[0:crop_height, crop_x_start:crop_x_start+crop_width]

        # Resize to target resolution
        resized = cv2.resize(cropped, target_res, interpolation=cv2.INTER_LANCZOS4)

        # Write frame
        out.write(resized)

    # Cleanup
    cap.release()
    out.release()

    detection_rate = (detection_count / frame_count) * 100 if frame_count > 0 else 0
    print(f"\n   ✅ AI cropping complete: {output_path}")
    print(f"   📊 Detection rate: {detection_rate:.1f}% ({detection_count}/{frame_count} frames)")

    return output_path


def _fallback_center_crop(input_path: str, output_path: str,
                          target_res: Tuple[int, int] = (1080, 1920)) -> str:
    """
    Fallback center crop if YOLO is not available.

    Args:
        input_path: Input video
        output_path: Output video
        target_res: Target resolution

    Returns:
        output_path: Path to cropped video
    """
    print("🎬 Center Crop (Fallback): {input_path}")

    # Open video
    cap = cv2.VideoCapture(input_path)
    if not cap.isOpened():
        raise ValueError(f"Cannot open video: {input_path}")

    fps = int(cap.get(cv2.CAP_PROP_FPS))
    frame_width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    frame_height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

    # Calculate crop dimensions
    target_width, target_height = target_res
    crop_width = int(frame_height * (target_width / target_height))
    crop_height = frame_height

    if crop_width > frame_width:
        crop_width = frame_width
        crop_height = int(crop_width * (target_height / target_width))

    # Center crop position
    crop_x_start = (frame_width - crop_width) // 2
    crop_y_start = (frame_height - crop_height) // 2

    # Prepare output
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    out = cv2.VideoWriter(output_path, fourcc, fps, target_res)

    frame_count = 0

    print(f"   Original: {frame_width}x{frame_height}")
    print(f"   Crop to: {crop_width}x{crop_height} (center)")
    print(f"   Resize to: {target_res}")

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        frame_count += 1

        if frame_count % 30 == 0:
            progress = (frame_count / total_frames) * 100
            print(f"   Progress: {progress:.1f}% ({frame_count}/{total_frames} frames)")

        # Center crop
        cropped = frame[crop_y_start:crop_y_start+crop_height,
                       crop_x_start:crop_x_start+crop_width]

        # Resize
        resized = cv2.resize(cropped, target_res, interpolation=cv2.INTER_LANCZOS4)

        # Write
        out.write(resized)

    cap.release()
    out.release()

    print(f"\n   ✅ Center crop complete: {output_path}")

    return output_path


def test_yolo_availability():
    """
    Test if YOLOv8 is available and working.

    Returns:
        bool: True if YOLO is available, False otherwise
    """
    try:
        from ultralytics import YOLO

        # Try to load the nano model
        model = YOLO('yolov8n.pt')
        print("✅ YOLOv8 is available and working")
        return True
    except ImportError:
        print("❌ YOLOv8 not installed. Install with: pip install ultralytics")
        return False
    except Exception as e:
        print(f"❌ YOLOv8 error: {e}")
        return False


if __name__ == '__main__':
    """Test YOLO availability when run directly"""
    print("\n" + "="*60)
    print("AI CROPPING MODULE TEST")
    print("="*60)

    test_yolo_availability()

    print("\n" + "="*60)
    print("USAGE")
    print("="*60)
    print("\nTo use AI cropping:")
    print("  from ai_cropping import ai_smart_crop_to_vertical")
    print("  ai_smart_crop_to_vertical('input.mp4', 'output.mp4')")
    print("\nTo test with sample video:")
    print("  python test_ai_cropping.py --input sample.mp4 --output test_crop.mp4")

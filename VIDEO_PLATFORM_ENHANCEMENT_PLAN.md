# 🏆 World-Class Grassroots Sports Video Platform - Implementation Plan

**Goal**: Combine your production-ready video system with broadcast-quality editing features to create a professional grassroots sports video platform.

**Status**: Your foundation is solid. This plan adds professional polish.

---

## 📋 Executive Summary

### What You Have (Current System)
- ✅ Production-ready Docker architecture
- ✅ Mobile app with in-app video recording/upload
- ✅ Apps Script integration with Google Sheets
- ✅ Automated YouTube upload
- ✅ Social media distribution via Make.com
- ✅ AI-powered event detection (YOLOv8)
- ✅ Queue management (5 concurrent jobs)
- ✅ Dual-mode system (mobile quick clips + full match automation)

### What This Plan Adds (Enhancements)
- ➕ Multi-signal event detection (audio + whistle + OCR + ASR)
- ➕ Professional video effects (stabilization, smart zoom, slow-mo replays)
- ➕ Broadcast-quality overlays (scorebug, lower-thirds, branded slates)
- ➕ Audio engineering (loudness normalization, ducking)
- ➕ Auto-generated vertical shorts for social media (TikTok/Instagram/YouTube Shorts)
- ➕ SRT captions with burn-in option
- ➕ Full FFmpeg command logging for reproducibility
- ➕ Color grading with LUT support

### Result
A video platform that produces broadcast-quality highlights from grassroots football matches, automatically distributed across all social media channels, with mobile-first workflow for parents and players.

---

## 🎯 System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    INPUT LAYER (Two Modes)                       │
├─────────────────────────────────────────────────────────────────┤
│  📱 Mobile App              │  🖥️ Server-Side                    │
│  - Record in-app (5 min)    │  - Full 90-min match upload       │
│  - Select from library       │  - Apps Script metadata export    │
│  - Instant upload            │  - Google Sheets integration      │
└─────────────────┬────────────┴──────────────┬────────────────────┘
                  │                           │
                  └────────── Cloudflare Workers ──────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────┐
│              ENHANCED AI PROCESSING (Docker Queue)               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  📊 DETECTION LAYER (Multi-Signal Fusion)                        │
│  ├─ YOLOv8 (ball/player detection)                 [EXISTING]   │
│  ├─ Audio Energy (crowd reactions)                 [NEW]        │
│  ├─ Whistle Detection (referee whistles)           [NEW]        │
│  ├─ Optical Flow (movement bursts)                 [NEW]        │
│  ├─ OCR (scoreboard changes)                       [NEW]        │
│  └─ ASR (commentary keywords via Whisper)          [NEW]        │
│                                                                  │
│  🎬 EDITING LAYER (Pro Effects)                                  │
│  ├─ Video Stabilization (vidstab/deshake)          [NEW]        │
│  ├─ Smart Zoom (1.25x on action)                   [NEW]        │
│  ├─ Slow-Mo Replays (0.65x with stingers)          [NEW]        │
│  ├─ Color Grading (LUT support)                    [NEW]        │
│  └─ Transitions (stingers/fade)                    [ENHANCED]   │
│                                                                  │
│  🎨 OVERLAY LAYER (Broadcast Graphics)                           │
│  ├─ Persistent Scorebug (top-left)                 [NEW]        │
│  ├─ Goal Lower-Thirds (player/team/minute)         [NEW]        │
│  ├─ Opening Slate (teams/comp/date/sponsor)        [NEW]        │
│  └─ Closing Slate (score/MOTM/CTA)                 [NEW]        │
│                                                                  │
│  🔊 AUDIO LAYER (Professional Sound)                             │
│  ├─ Loudness Normalization (-14 LUFS)              [NEW]        │
│  ├─ Audio Ducking (during overlays)                [NEW]        │
│  └─ Peak Limiting                                  [NEW]        │
│                                                                  │
│  📱 SOCIAL LAYER (Platform-Specific Output)                      │
│  ├─ Horizontal Highlights (1080p, 16:9)            [EXISTING]   │
│  ├─ Vertical Shorts (1080x1920, 9:16)              [NEW]        │
│  ├─ SRT Captions (timeline annotations)            [NEW]        │
│  └─ YouTube Description (auto-generated)           [EXISTING]   │
│                                                                  │
└─────────────────┬───────────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                 DISTRIBUTION LAYER                               │
├─────────────────────────────────────────────────────────────────┤
│  📺 YouTube       │  🐦 X/Twitter    │  📸 Instagram            │
│  (Horizontal)     │  (Horizontal)    │  (Vertical Reels)         │
│                   │                  │                           │
│  📹 TikTok        │  👍 Facebook     │  📧 Email Notify          │
│  (Vertical)       │  (Horizontal)    │  (Parents/Players)        │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📅 Implementation Roadmap

### Phase 0: Preparation (Week 1)
**Duration**: 3-5 hours
**Priority**: High
**Dependencies**: None

**Tasks**:
1. ✅ Audit current system performance
2. ✅ Create brand assets folder structure
3. ✅ Set up test environment
4. ✅ Gather sample match footage for testing

**Deliverables**:
- Performance baseline report
- Brand assets folder with templates
- Test environment ready
- Sample videos cataloged

---

### Phase 1: Multi-Signal Event Detection (Week 2)
**Duration**: 6-8 hours
**Priority**: High
**Dependencies**: Phase 0

**What It Does**:
Makes event detection more robust by analyzing multiple signals (not just video).

**Technical Implementation**:

#### 1.1 Audio Energy Detection
Detects crowd reactions and roars.

**File**: `backend/video-processing/highlights_bot/detect_audio.py` (NEW)

```python
import librosa
import numpy as np

def detect_audio_spikes(video_path, threshold=0.75, min_duration=1.0):
    """
    Detect audio energy spikes (crowd reactions).

    Returns: List of (timestamp, energy) tuples
    """
    # Extract audio
    audio, sr = librosa.load(video_path, sr=22050, mono=True)

    # Calculate short-term energy (200ms windows)
    hop_length = int(sr * 0.2)
    frame_length = hop_length * 2
    energy = librosa.feature.rms(y=audio, frame_length=frame_length, hop_length=hop_length)[0]

    # Normalize
    energy_norm = (energy - np.mean(energy)) / np.std(energy)

    # Detect spikes above threshold
    spikes = []
    times = librosa.frames_to_time(np.arange(len(energy)), sr=sr, hop_length=hop_length)

    in_spike = False
    spike_start = 0

    for i, (t, e) in enumerate(zip(times, energy_norm)):
        if e > threshold and not in_spike:
            spike_start = t
            in_spike = True
        elif e <= threshold and in_spike:
            if t - spike_start >= min_duration:
                spikes.append({
                    'timestamp': spike_start,
                    'duration': t - spike_start,
                    'energy': float(np.max(energy_norm[int(spike_start/0.2):i])),
                    'type': 'audio_spike'
                })
            in_spike = False

    return spikes
```

#### 1.2 Whistle Detection
Detects referee whistles (3.5-4.5 kHz).

**File**: `backend/video-processing/highlights_bot/detect_audio.py` (APPEND)

```python
def detect_whistle_tones(video_path, freq_range=(3500, 4500), threshold=0.7):
    """
    Detect referee whistle tones.

    Returns: List of (timestamp, confidence) tuples
    """
    audio, sr = librosa.load(video_path, sr=22050, mono=True)

    # Compute STFT
    stft = np.abs(librosa.stft(audio, n_fft=2048, hop_length=512))
    freqs = librosa.fft_frequencies(sr=sr, n_fft=2048)

    # Find frequency band indices
    freq_mask = (freqs >= freq_range[0]) & (freqs <= freq_range[1])
    freq_indices = np.where(freq_mask)[0]

    # Extract energy in whistle frequency range
    whistle_energy = np.sum(stft[freq_indices, :], axis=0)
    total_energy = np.sum(stft, axis=0)
    whistle_ratio = whistle_energy / (total_energy + 1e-10)

    # Detect whistles
    whistles = []
    times = librosa.frames_to_time(np.arange(stft.shape[1]), sr=sr, hop_length=512)

    for t, ratio in zip(times, whistle_ratio):
        if ratio > threshold:
            whistles.append({
                'timestamp': float(t),
                'confidence': float(ratio),
                'type': 'whistle'
            })

    # Merge nearby whistles (within 0.5s)
    merged = []
    if whistles:
        current = whistles[0]
        for w in whistles[1:]:
            if w['timestamp'] - current['timestamp'] < 0.5:
                current['confidence'] = max(current['confidence'], w['confidence'])
            else:
                merged.append(current)
                current = w
        merged.append(current)

    return merged
```

#### 1.3 Optical Flow Detection
Detects sudden movement bursts near goal area.

**File**: `backend/video-processing/highlights_bot/detect_flow.py` (NEW)

```python
import cv2
import numpy as np

def detect_flow_bursts(video_path, roi='goal_area', threshold=2.5):
    """
    Detect high-velocity optical flow bursts (shots, scrambles).

    Returns: List of (timestamp, magnitude) tuples
    """
    cap = cv2.VideoCapture(video_path)
    fps = cap.get(cv2.CAP_PROP_FPS)

    # Read first frame
    ret, prev_frame = cap.read()
    if not ret:
        return []

    prev_gray = cv2.cvtColor(prev_frame, cv2.COLOR_BGR2GRAY)
    height, width = prev_gray.shape

    # Define ROI (assume goal area is top/bottom 30% of frame)
    if roi == 'goal_area':
        roi_mask = np.zeros((height, width), dtype=np.uint8)
        roi_mask[0:int(height*0.3), :] = 1  # Top 30%
        roi_mask[int(height*0.7):, :] = 1   # Bottom 30%
    else:
        roi_mask = np.ones((height, width), dtype=np.uint8)

    bursts = []
    frame_idx = 0

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)

        # Calculate optical flow
        flow = cv2.calcOpticalFlowFarneback(
            prev_gray, gray, None,
            pyr_scale=0.5, levels=3, winsize=15,
            iterations=3, poly_n=5, poly_sigma=1.2, flags=0
        )

        # Calculate magnitude in ROI
        magnitude = np.sqrt(flow[:,:,0]**2 + flow[:,:,1]**2)
        roi_magnitude = magnitude * roi_mask
        avg_magnitude = np.mean(roi_magnitude[roi_mask > 0])

        # Detect burst
        if avg_magnitude > threshold:
            timestamp = frame_idx / fps
            bursts.append({
                'timestamp': float(timestamp),
                'magnitude': float(avg_magnitude),
                'type': 'flow_burst'
            })

        prev_gray = gray
        frame_idx += 1

    cap.release()

    # Merge nearby bursts (within 2s)
    merged = []
    if bursts:
        current = bursts[0]
        for b in bursts[1:]:
            if b['timestamp'] - current['timestamp'] < 2.0:
                current['magnitude'] = max(current['magnitude'], b['magnitude'])
            else:
                merged.append(current)
                current = b
        merged.append(current)

    return merged
```

#### 1.4 Signal Fusion
Combines all detection signals with weighted scoring.

**File**: `backend/video-processing/highlights_bot/detect.py` (MODIFY)

```python
from detect_audio import detect_audio_spikes, detect_whistle_tones
from detect_flow import detect_flow_bursts

def detect_events_multimodal(video_path, json_events=None, config=None):
    """
    Multi-signal event detection with fusion.

    Signals:
    - YOLOv8 (existing): Object detection
    - Audio Energy: Crowd reactions
    - Whistle: Referee whistles
    - Optical Flow: Movement bursts
    - OCR: Scoreboard changes (if visible)
    - JSON: Ground truth from Apps Script

    Returns: Ranked list of events
    """
    print("🔍 Running multi-signal event detection...")

    # 1. Collect signals
    signals = {}

    # Existing: YOLOv8 object detection
    print("  ├─ YOLOv8 object detection...")
    signals['yolo'] = detect_with_yolo(video_path)  # Your existing function

    # NEW: Audio energy spikes
    print("  ├─ Audio energy analysis...")
    signals['audio'] = detect_audio_spikes(video_path, threshold=0.75)

    # NEW: Whistle detection
    print("  ├─ Whistle detection...")
    signals['whistle'] = detect_whistle_tones(video_path, threshold=0.7)

    # NEW: Optical flow
    print("  ├─ Optical flow analysis...")
    signals['flow'] = detect_flow_bursts(video_path, threshold=2.5)

    # Optional: OCR (if scoreboard visible)
    if config and config.get('detection', {}).get('ocr_enabled'):
        print("  ├─ OCR scoreboard detection...")
        signals['ocr'] = detect_score_changes_ocr(video_path)

    # Ground truth from JSON (Apps Script)
    if json_events:
        print("  └─ Using Apps Script ground truth")
        signals['json'] = json_events
    else:
        print("  └─ No ground truth provided")

    # 2. Fuse signals with weighted scoring
    print("🔗 Fusing signals...")
    fused_events = fuse_signals(signals, config)

    # 3. Rank and filter
    print("📊 Ranking events...")
    ranked_events = rank_events(fused_events, config)

    print(f"✅ Detected {len(ranked_events)} events")
    return ranked_events


def fuse_signals(signals, config=None):
    """
    Fuse multiple detection signals into unified events.

    Weights (default):
    - JSON (ground truth): 5.0
    - YOLOv8: 2.0
    - Audio spike: 1.5
    - Whistle: 1.0
    - Flow burst: 1.0
    - OCR: 3.0
    """
    weights = {
        'json': 5.0,
        'yolo': 2.0,
        'audio': 1.5,
        'whistle': 1.0,
        'flow': 1.0,
        'ocr': 3.0
    }

    if config and 'detection' in config and 'weights' in config['detection']:
        weights.update(config['detection']['weights'])

    # Create time-bucketed events (1-second buckets)
    buckets = {}

    for signal_type, detections in signals.items():
        if not detections:
            continue

        weight = weights.get(signal_type, 1.0)

        for det in detections:
            timestamp = det.get('timestamp', det.get('time', 0))
            bucket_key = int(timestamp)  # Round to nearest second

            if bucket_key not in buckets:
                buckets[bucket_key] = {
                    'timestamp': bucket_key,
                    'signals': [],
                    'score': 0,
                    'confidence': 0,
                    'type': None
                }

            buckets[bucket_key]['signals'].append({
                'source': signal_type,
                'weight': weight,
                'data': det
            })
            buckets[bucket_key]['score'] += weight * det.get('confidence', 1.0)

    # Merge nearby buckets (within 5 seconds)
    merged_events = []
    sorted_buckets = sorted(buckets.values(), key=lambda x: x['timestamp'])

    if not sorted_buckets:
        return []

    current_event = sorted_buckets[0]

    for bucket in sorted_buckets[1:]:
        if bucket['timestamp'] - current_event['timestamp'] <= 5:
            # Merge into current event
            current_event['signals'].extend(bucket['signals'])
            current_event['score'] += bucket['score']
            current_event['timestamp'] = (current_event['timestamp'] + bucket['timestamp']) / 2
        else:
            # Finalize current event
            current_event['confidence'] = current_event['score'] / len(current_event['signals'])
            merged_events.append(current_event)
            current_event = bucket

    # Don't forget last event
    current_event['confidence'] = current_event['score'] / len(current_event['signals'])
    merged_events.append(current_event)

    return merged_events


def rank_events(events, config=None):
    """
    Rank events by score and apply business logic.

    Priority:
    1. JSON ground truth (always include)
    2. Goals (always include)
    3. High-scoring chances
    4. Other events by score
    """
    # Classify events
    for event in events:
        event['is_ground_truth'] = any(s['source'] == 'json' for s in event['signals'])
        event['is_goal'] = any(
            s['source'] == 'json' and s['data'].get('type') == 'goal'
            for s in event['signals']
        )

        # Infer type from signals
        if event['is_goal']:
            event['type'] = 'goal'
        elif any(s['source'] == 'whistle' for s in event['signals']):
            event['type'] = 'stoppage'
        elif event['score'] > 5.0:
            event['type'] = 'chance'
        else:
            event['type'] = 'action'

    # Sort by priority
    def sort_key(e):
        if e['is_ground_truth']:
            return (0, -e['score'])  # Highest priority
        elif e['is_goal']:
            return (1, -e['score'])
        else:
            return (2, -e['score'])

    events.sort(key=sort_key)

    return events
```

**Dependencies to Install**:
```bash
cd backend/video-processing/highlights_bot
pip install librosa==0.10.1
pip install soundfile==0.12.1
```

**Testing**:
```bash
python -m pytest tests/test_multimodal_detection.py -v
```

---

### Phase 2: Professional Video Effects (Week 3)
**Duration**: 8-10 hours
**Priority**: High
**Dependencies**: Phase 1

**What It Does**:
Adds broadcast-quality video effects: stabilization, smart zoom, and slow-motion replays.

#### 2.1 Video Stabilization
Removes camera shake for smoother footage.

**File**: `backend/video-processing/highlights_bot/effects.py` (NEW)

```python
import subprocess
import os

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
```

#### 2.2 Smart Zoom
Dynamically zooms to center of action (ball location).

**File**: `backend/video-processing/highlights_bot/effects.py` (APPEND)

```python
def smart_zoom_on_action(input_path, output_path, bbox_data, max_zoom=1.25, ease_duration=0.4):
    """
    Apply smart zoom centered on action (ball/player cluster).

    Parameters:
    - bbox_data: List of (timestamp, x, y, w, h) for action bounding box
    - max_zoom: Maximum zoom factor (1.25 = 25% zoom)
    - ease_duration: Ease in/out duration in seconds

    Returns: Path to zoomed video
    """
    import cv2
    import numpy as np

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
```

#### 2.3 Slow-Motion Replays
Adds professional replays with stinger transitions.

**File**: `backend/video-processing/highlights_bot/effects.py` (APPEND)

```python
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
    import tempfile

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
    import shutil
    shutil.rmtree(temp_dir)

    return output_path
```

#### 2.4 Integration into Edit Pipeline

**File**: `backend/video-processing/highlights_bot/edit.py` (MODIFY)

```python
from effects import stabilize_clip, smart_zoom_on_action, add_slowmo_replay

def apply_pro_effects(clip_path, event, config, brand_assets):
    """
    Apply professional effects to a clip based on event type.

    Returns: Path to enhanced clip
    """
    import tempfile
    import os

    output_path = clip_path.replace('.mp4', '_enhanced.mp4')
    current_input = clip_path

    # 1. Stabilization (if enabled)
    if config.get('editing', {}).get('stabilize', False):
        print(f"  ├─ Stabilizing...")
        temp_stable = tempfile.NamedTemporaryFile(suffix='.mp4', delete=False).name
        stabilize_clip(current_input, temp_stable, shakiness=5, smoothing=10)
        current_input = temp_stable

    # 2. Smart zoom (for goals and chances)
    if event['type'] in ['goal', 'chance'] and config.get('editing', {}).get('smart_zoom', False):
        print(f"  ├─ Applying smart zoom...")
        temp_zoom = tempfile.NamedTemporaryFile(suffix='.mp4', delete=False).name
        bbox_data = event.get('bbox_data', [])
        if bbox_data:
            smart_zoom_on_action(current_input, temp_zoom, bbox_data, max_zoom=1.25)
            current_input = temp_zoom

    # 3. Slow-mo replay (for goals)
    if event['type'] == 'goal' and config.get('editing', {}).get('replays', False):
        print(f"  ├─ Adding slow-mo replay...")
        # Find best replay window (3s before peak)
        peak_time = event['timestamp']
        replay_start = max(0, peak_time - 3)
        replay_end = min(peak_time + 3, event['duration'])

        stinger_path = brand_assets.get('stinger_path')
        add_slowmo_replay(current_input, output_path, replay_start, replay_end,
                         slowmo_factor=0.65, stinger_path=stinger_path)
        current_input = output_path
    else:
        # Just copy if no replay
        import shutil
        shutil.copy(current_input, output_path)

    print(f"  └─ Effects applied")
    return output_path
```

**Testing**:
```bash
# Test stabilization
python test_effects.py --test stabilize --input sample.mp4

# Test smart zoom
python test_effects.py --test zoom --input sample.mp4 --bbox data.json

# Test replay
python test_effects.py --test replay --input sample.mp4 --start 20 --end 26
```

---

### Phase 3: Broadcast Overlays (Week 4)
**Duration**: 10-12 hours
**Priority**: High
**Dependencies**: Phase 2

**What It Does**:
Adds professional broadcast graphics: scorebug, lower-thirds, opening/closing slates.

#### 3.1 Brand Assets Setup

**Directory Structure**:
```
backend/video-processing/brand/
├── badges/
│   ├── home_team.png
│   └── away_team.png
├── fonts/
│   ├── Inter-Bold.ttf
│   └── Inter-Regular.ttf
├── templates/
│   ├── scorebug_template.png      # 400x100, transparent background
│   ├── lower_third_template.png   # 1920x200, semi-transparent
│   ├── opening_slate_bg.png       # 1920x1080
│   └── closing_slate_bg.png       # 1920x1080
├── stinger.mov                    # 0.5s transition with alpha channel
└── luts/
    └── club_lut.cube              # Optional color grading LUT
```

**Asset Requirements**:
- All PNGs must have transparency (alpha channel)
- Fonts must be TrueType (.ttf) or OpenType (.otf)
- Stinger must be 0.25-0.5 seconds, ProRes 4444 or H.264 with alpha
- LUT files must be .cube format (optional)

#### 3.2 Scorebug Implementation

**File**: `backend/video-processing/highlights_bot/overlays.py` (NEW)

```python
from PIL import Image, ImageDraw, ImageFont
import subprocess
import os

def create_scorebug(match_meta, brand_assets, output_path):
    """
    Create persistent scorebug overlay (top-left corner).

    Format:
    [HOME BADGE] HOME 2-1 AWAY [AWAY BADGE]
                   45'

    Returns: Path to scorebug PNG overlay
    """
    # Load template
    template_path = brand_assets.get('scorebug_template',
                                    'brand/templates/scorebug_template.png')

    if os.path.exists(template_path):
        scorebug = Image.open(template_path).convert('RGBA')
    else:
        # Create from scratch if template doesn't exist
        scorebug = Image.new('RGBA', (400, 100), (0, 0, 0, 200))  # Semi-transparent black

    draw = ImageDraw.Draw(scorebug)

    # Load font
    font_path = brand_assets.get('font_bold', 'brand/fonts/Inter-Bold.ttf')
    try:
        font_large = ImageFont.truetype(font_path, 32)
        font_small = ImageFont.truetype(font_path, 24)
    except:
        font_large = ImageFont.load_default()
        font_small = ImageFont.load_default()

    # Draw score
    score_text = f"{match_meta['home_short']} {match_meta['score']} {match_meta['away_short']}"
    bbox = draw.textbbox((0, 0), score_text, font=font_large)
    text_width = bbox[2] - bbox[0]
    x = (400 - text_width) // 2
    draw.text((x, 20), score_text, fill=(255, 255, 255, 255), font=font_large)

    # Draw time (if available)
    if 'current_minute' in match_meta:
        time_text = f"{match_meta['current_minute']}'"
        bbox = draw.textbbox((0, 0), time_text, font=font_small)
        text_width = bbox[2] - bbox[0]
        x = (400 - text_width) // 2
        draw.text((x, 65), time_text, fill=(255, 255, 255, 200), font=font_small)

    # Paste badges (if available)
    home_badge_path = brand_assets.get('home_badge')
    away_badge_path = brand_assets.get('away_badge')

    if home_badge_path and os.path.exists(home_badge_path):
        home_badge = Image.open(home_badge_path).convert('RGBA')
        home_badge = home_badge.resize((40, 40), Image.Resampling.LANCZOS)
        scorebug.paste(home_badge, (10, 30), home_badge)

    if away_badge_path and os.path.exists(away_badge_path):
        away_badge = Image.open(away_badge_path).convert('RGBA')
        away_badge = away_badge.resize((40, 40), Image.Resampling.LANCZOS)
        scorebug.paste(away_badge, (350, 30), away_badge)

    # Save
    scorebug.save(output_path, 'PNG')
    print(f"  ✓ Scorebug created: {output_path}")
    return output_path


def apply_scorebug(video_path, scorebug_path, output_path, position='top-left',
                   start_time=0, end_time=None):
    """
    Overlay scorebug on video using FFmpeg.

    Returns: Path to output video
    """
    # Calculate position
    positions = {
        'top-left': '10:10',
        'top-right': 'W-w-10:10',
        'bottom-left': '10:H-h-10',
        'bottom-right': 'W-w-10:H-h-10'
    }
    pos = positions.get(position, '10:10')

    # Build FFmpeg command
    if end_time:
        enable = f"enable='between(t,{start_time},{end_time})'"
    else:
        enable = f"enable='gte(t,{start_time})'"

    cmd = [
        'ffmpeg', '-i', video_path, '-i', scorebug_path,
        '-filter_complex', f'[0:v][1:v]overlay={pos}:{enable}[outv]',
        '-map', '[outv]', '-map', '0:a',
        '-c:a', 'copy', '-c:v', 'libx264', '-crf', '18',
        '-y', output_path
    ]

    subprocess.run(cmd, check=True, capture_output=True)
    return output_path
```

#### 3.3 Goal Lower-Third Implementation

**File**: `backend/video-processing/highlights_bot/overlays.py` (APPEND)

```python
def create_goal_lowerthird(event_data, brand_assets, output_path):
    """
    Create goal lower-third overlay.

    Format:
    ⚽ GOAL — Player Name (Team) 23'
       Assist: Assister Name

    Returns: Path to lower-third PNG
    """
    # Load template or create
    template_path = brand_assets.get('lower_third_template',
                                    'brand/templates/lower_third_template.png')

    if os.path.exists(template_path):
        lower_third = Image.open(template_path).convert('RGBA')
    else:
        lower_third = Image.new('RGBA', (1920, 200), (0, 0, 0, 0))

        # Create semi-transparent bar
        bar = Image.new('RGBA', (1400, 150), (0, 0, 0, 180))
        lower_third.paste(bar, (260, 25), bar)

    draw = ImageDraw.Draw(lower_third)

    # Load fonts
    font_path_bold = brand_assets.get('font_bold', 'brand/fonts/Inter-Bold.ttf')
    font_path_regular = brand_assets.get('font_regular', 'brand/fonts/Inter-Regular.ttf')

    try:
        font_title = ImageFont.truetype(font_path_bold, 48)
        font_subtitle = ImageFont.truetype(font_path_regular, 32)
    except:
        font_title = ImageFont.load_default()
        font_subtitle = ImageFont.load_default()

    # Draw main text
    player = event_data.get('player', 'Unknown')
    team = event_data.get('team', '')
    minute = event_data.get('minute', '')

    main_text = f"⚽ GOAL — {player} ({team}) {minute}'"
    draw.text((300, 50), main_text, fill=(255, 255, 255, 255), font=font_title)

    # Draw assist (if present)
    if 'assister' in event_data and event_data['assister']:
        assist_text = f"Assist: {event_data['assister']}"
        draw.text((300, 110), assist_text, fill=(255, 255, 255, 200), font=font_subtitle)

    # Save
    lower_third.save(output_path, 'PNG')
    print(f"  ✓ Lower-third created: {output_path}")
    return output_path


def apply_lowerthird(video_path, lowerthird_path, output_path,
                     start_time, duration=3.0, position='bottom'):
    """
    Overlay lower-third on video for specified duration.

    Returns: Path to output video
    """
    end_time = start_time + duration

    # Position calculation
    if position == 'bottom':
        y_pos = 'H-h-80'
    elif position == 'top':
        y_pos = '80'
    else:
        y_pos = '(H-h)/2'

    x_pos = '(W-w)/2'  # Center horizontally

    # Fade in/out
    fade_duration = 0.3
    enable = f"enable='between(t,{start_time},{end_time})'"
    fade_filter = f"fade=in:st={start_time}:d={fade_duration}:alpha=1,fade=out:st={end_time-fade_duration}:d={fade_duration}:alpha=1"

    cmd = [
        'ffmpeg', '-i', video_path, '-i', lowerthird_path,
        '-filter_complex',
        f'[1:v]{fade_filter}[lt];[0:v][lt]overlay={x_pos}:{y_pos}:{enable}[outv]',
        '-map', '[outv]', '-map', '0:a',
        '-c:a', 'copy', '-c:v', 'libx264', '-crf', '18',
        '-y', output_path
    ]

    subprocess.run(cmd, check=True, capture_output=True)
    return output_path
```

#### 3.4 Opening/Closing Slates

**File**: `backend/video-processing/highlights_bot/overlays.py` (APPEND)

```python
def create_opening_slate(match_meta, brand_assets, output_path, duration=2.5):
    """
    Create opening slate with match information.

    Format:
    [CLUB BADGE]

    Home Team vs Away Team
    Competition Name
    Date | Venue
    [SPONSOR LOGO]

    Returns: Path to opening slate video
    """
    # Create frame
    slate = Image.new('RGB', (1920, 1080), (20, 20, 30))  # Dark background
    draw = ImageDraw.Draw(slate)

    # Load fonts
    try:
        font_title = ImageFont.truetype('brand/fonts/Inter-Bold.ttf', 72)
        font_subtitle = ImageFont.truetype('brand/fonts/Inter-Regular.ttf', 48)
        font_info = ImageFont.truetype('brand/fonts/Inter-Regular.ttf', 36)
    except:
        font_title = ImageFont.load_default()
        font_subtitle = font_title
        font_info = font_title

    # Draw club badge (centered, top)
    badge_path = brand_assets.get('club_badge')
    if badge_path and os.path.exists(badge_path):
        badge = Image.open(badge_path).convert('RGBA')
        badge = badge.resize((200, 200), Image.Resampling.LANCZOS)
        slate.paste(badge, (860, 150), badge)

    # Draw match title
    title = f"{match_meta['home']} vs {match_meta['away']}"
    bbox = draw.textbbox((0, 0), title, font=font_title)
    text_width = bbox[2] - bbox[0]
    x = (1920 - text_width) // 2
    draw.text((x, 400), title, fill=(255, 255, 255), font=font_title)

    # Draw competition
    comp = match_meta.get('competition', 'Friendly Match')
    bbox = draw.textbbox((0, 0), comp, font=font_subtitle)
    text_width = bbox[2] - bbox[0]
    x = (1920 - text_width) // 2
    draw.text((x, 500), comp, fill=(200, 200, 200), font=font_subtitle)

    # Draw date and venue
    date_str = match_meta.get('date', '')
    venue = match_meta.get('venue', '')
    info = f"{date_str} | {venue}"
    bbox = draw.textbbox((0, 0), info, font=font_info)
    text_width = bbox[2] - bbox[0]
    x = (1920 - text_width) // 2
    draw.text((x, 600), info, fill=(150, 150, 150), font=font_info)

    # Draw sponsor logo (bottom right)
    sponsor_path = brand_assets.get('sponsor_logo')
    if sponsor_path and os.path.exists(sponsor_path):
        sponsor = Image.open(sponsor_path).convert('RGBA')
        sponsor = sponsor.resize((150, 75), Image.Resampling.LANCZOS)
        slate.paste(sponsor, (1700, 950), sponsor)

    # Save frame as temporary image
    temp_frame = output_path.replace('.mp4', '_frame.png')
    slate.save(temp_frame, 'PNG')

    # Convert to video with specified duration
    cmd = [
        'ffmpeg', '-loop', '1', '-i', temp_frame,
        '-c:v', 'libx264', '-t', str(duration),
        '-pix_fmt', 'yuv420p', '-vf', 'scale=1920:1080',
        '-y', output_path
    ]
    subprocess.run(cmd, check=True, capture_output=True)

    # Cleanup temp frame
    os.remove(temp_frame)

    print(f"  ✓ Opening slate created: {output_path}")
    return output_path


def create_closing_slate(match_meta, brand_assets, output_path, duration=3.0):
    """
    Create closing slate with final score and CTA.

    Format:
    FULL TIME

    Home 3-1 Away

    Man of the Match: Player Name

    Subscribe for more highlights!

    Returns: Path to closing slate video
    """
    # Similar implementation to opening slate
    slate = Image.new('RGB', (1920, 1080), (20, 20, 30))
    draw = ImageDraw.Draw(slate)

    try:
        font_large = ImageFont.truetype('brand/fonts/Inter-Bold.ttf', 96)
        font_medium = ImageFont.truetype('brand/fonts/Inter-Bold.ttf', 64)
        font_small = ImageFont.truetype('brand/fonts/Inter-Regular.ttf', 42)
    except:
        font_large = ImageFont.load_default()
        font_medium = font_large
        font_small = font_large

    # "FULL TIME"
    text = "FULL TIME"
    bbox = draw.textbbox((0, 0), text, font=font_medium)
    text_width = bbox[2] - bbox[0]
    draw.text(((1920-text_width)//2, 250), text, fill=(200, 200, 200), font=font_medium)

    # Final score
    score_text = f"{match_meta['home']} {match_meta['final_score']} {match_meta['away']}"
    bbox = draw.textbbox((0, 0), score_text, font=font_large)
    text_width = bbox[2] - bbox[0]
    draw.text(((1920-text_width)//2, 400), score_text, fill=(255, 255, 255), font=font_large)

    # MOTM
    if 'motm' in match_meta and match_meta['motm']:
        motm_text = f"Man of the Match: {match_meta['motm']}"
        bbox = draw.textbbox((0, 0), motm_text, font=font_small)
        text_width = bbox[2] - bbox[0]
        draw.text(((1920-text_width)//2, 550), motm_text, fill=(255, 215, 0), font=font_small)

    # CTA
    cta = match_meta.get('cta', 'Subscribe for more highlights!')
    bbox = draw.textbbox((0, 0), cta, font=font_small)
    text_width = bbox[2] - bbox[0]
    draw.text(((1920-text_width)//2, 750), cta, fill=(200, 200, 200), font=font_small)

    # Save and convert to video
    temp_frame = output_path.replace('.mp4', '_frame.png')
    slate.save(temp_frame, 'PNG')

    cmd = [
        'ffmpeg', '-loop', '1', '-i', temp_frame,
        '-c:v', 'libx264', '-t', str(duration),
        '-pix_fmt', 'yuv420p', '-vf', 'scale=1920:1080',
        '-y', output_path
    ]
    subprocess.run(cmd, check=True, capture_output=True)

    os.remove(temp_frame)

    print(f"  ✓ Closing slate created: {output_path}")
    return output_path
```

**Dependencies**:
```bash
pip install Pillow==10.1.0
```

**Testing**:
```bash
python test_overlays.py --test scorebug
python test_overlays.py --test lowerthird
python test_overlays.py --test slates
```

---

### Phase 4: Audio Engineering (Week 5)
**Duration**: 4-6 hours
**Priority**: Medium
**Dependencies**: Phase 3

**What It Does**:
Professional audio processing: loudness normalization, ducking, and peak limiting.

#### 4.1 Loudness Normalization

**File**: `backend/video-processing/highlights_bot/audio.py` (NEW)

```python
import subprocess
import json

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

    subprocess.run(cmd_normalize, check=True, capture_output=True)

    print(f"  ✓ Audio normalized to {target_lufs} LUFS")
    return output_path
```

#### 4.2 Audio Ducking

**File**: `backend/video-processing/highlights_bot/audio.py` (APPEND)

```python
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

    print(f"  ✓ Audio ducked at {len(overlay_times)} segments")
    return output_path
```

**Testing**:
```bash
python test_audio.py --test normalize --input sample.mp4
python test_audio.py --test duck --input sample.mp4 --times "10-13,25-28"
```

---

### Phase 5: Vertical Shorts Generation (Week 6)
**Duration**: 6-8 hours
**Priority**: High
**Dependencies**: Phases 1-4

**What It Does**:
Auto-generates 9:16 vertical clips optimized for TikTok, Instagram Reels, YouTube Shorts.

#### 5.1 Smart Cropping for Vertical

**File**: `backend/video-processing/highlights_bot/shorts.py` (NEW)

```python
import cv2
import numpy as np
import subprocess
import os

def smart_crop_to_vertical(input_path, output_path, bbox_data, target_res=(1080, 1920)):
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
    # We need to crop width and extend height
    crop_width = int(orig_height * (target_width / target_height))
    crop_height = orig_height

    # Ensure crop fits within frame
    crop_width = min(crop_width, orig_width)

    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    out = cv2.VideoWriter(output_path, fourcc, fps, (crop_width, crop_height))

    frame_idx = 0

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

        # Resize to target resolution
        resized = cv2.resize(cropped, target_res, interpolation=cv2.INTER_LINEAR)

        out.write(resized)
        frame_idx += 1

    cap.release()
    out.release()

    return output_path


def generate_vertical_shorts(events, video_path, match_meta, brand_assets,
                             config, output_dir='out/shorts/'):
    """
    Generate vertical shorts from top events.

    Returns: List of generated short clips with metadata
    """
    os.makedirs(output_dir, exist_ok=True)

    # Select top events
    count = config.get('shorts', {}).get('count', 10)
    min_score = config.get('shorts', {}).get('min_score', 2.0)

    top_events = [e for e in events if e['score'] >= min_score]
    top_events = sorted(top_events, key=lambda e: e['score'], reverse=True)[:count]

    shorts = []

    for idx, event in enumerate(top_events):
        print(f"\n📱 Creating vertical short {idx+1}/{len(top_events)}...")

        # Extract clip
        clip_path = os.path.join(output_dir, f'temp_clip_{idx}.mp4')
        extract_clip(video_path, event['start'], event['end'], clip_path)

        # Smart crop to vertical
        vertical_path = os.path.join(output_dir, f'temp_vertical_{idx}.mp4')
        bbox_data = event.get('bbox_data', [])
        smart_crop_to_vertical(clip_path, vertical_path, bbox_data)

        # Add vertical-optimized overlays
        overlay_path = os.path.join(output_dir, f'clip_{idx+1:02d}_vertical.mp4')
        add_vertical_overlays(
            vertical_path, overlay_path, event, match_meta, brand_assets
        )

        # Normalize audio
        final_path = os.path.join(output_dir, f'clip_{idx+1:02d}_vertical_final.mp4')
        normalize_loudness(overlay_path, final_path, target_lufs=-14)

        # Optional: Burn in captions
        if config.get('captions', {}).get('burn_in_shorts', False):
            caption_text = generate_caption_text(event)
            final_path_captions = final_path.replace('_final.mp4', '_with_captions.mp4')
            burn_caption(final_path, final_path_captions, caption_text,
                        position='top', duration=event['end'] - event['start'])
            final_path = final_path_captions

        shorts.append({
            'path': final_path,
            'event': event,
            'duration': event['end'] - event['start'],
            'score': event['score']
        })

        # Cleanup temp files
        for temp in [clip_path, vertical_path, overlay_path]:
            if os.path.exists(temp):
                os.remove(temp)

        print(f"  ✅ Short created: {final_path}")

    print(f"\n✅ Generated {len(shorts)} vertical shorts")
    return shorts


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
    from PIL import Image, ImageDraw, ImageFont
    import tempfile

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
    if event['type'] == 'goal':
        title = f"⚽ GOAL - {event.get('player', 'Unknown')}"
    elif event['type'] == 'chance':
        title = "🎯 Big Chance"
    else:
        title = event['type'].upper()

    bbox = draw.textbbox((0, 0), title, font=font_title)
    text_width = bbox[2] - bbox[0]

    # Add semi-transparent background for text
    padding = 20
    bg_rect = Image.new('RGBA', (text_width + padding*2, 80), (0, 0, 0, 180))
    overlay.paste(bg_rect, ((1080 - text_width - padding*2)//2, 240), bg_rect)

    draw.text(((1080-text_width)//2, 250), title, fill=(255, 255, 255), font=font_title)

    # Minute
    if 'minute' in event:
        minute_text = f"{event['minute']}'"
        bbox = draw.textbbox((0, 0), minute_text, font=font_info)
        text_width = bbox[2] - bbox[0]
        draw.text(((1080-text_width)//2, 350), minute_text,
                 fill=(255, 255, 255, 200), font=font_info)

    # CTA (bottom)
    cta = "Follow for more highlights!"
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
```

**Testing**:
```bash
python test_shorts.py --input sample.mp4 --events events.json --count 5
```

---

### Phase 6: SRT Captions & Logging (Week 7)
**Duration**: 4-5 hours
**Priority**: Medium
**Dependencies**: Phase 5

**What It Does**:
Generates SRT captions for timeline, optional burn-in, and full FFmpeg command logging.

#### 6.1 SRT Caption Generation

**File**: `backend/video-processing/highlights_bot/captions.py` (NEW)

```python
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
        start_time = format_srt_time(event['video_timestamp'])
        end_time = format_srt_time(event['video_timestamp'] + event.get('duration', 5.0))

        # Generate caption text based on event type
        if event['type'] == 'goal':
            player = event.get('player', 'Unknown')
            team = event.get('team', '')
            minute = event.get('minute', '')
            text = f"⚽ GOAL! {player} ({team}) {minute}'"

            if event.get('assister'):
                text += f"\nAssist: {event['assister']}"

        elif event['type'] == 'chance':
            text = f"🎯 Big chance for {event.get('team', 'Team')}"

        elif event['type'] == 'card':
            player = event.get('player', 'Unknown')
            card_type = event.get('card_type', 'yellow')
            minute = event.get('minute', '')
            emoji = '🟨' if card_type == 'yellow' else '🟥'
            text = f"{emoji} {player} {minute}'"

        elif event['type'] == 'skill':
            text = f"⭐ Great skill from {event.get('player', 'Player')}"

        else:
            # Generic caption from notes or type
            text = event.get('notes', f"{event['type'].title()} - {event.get('minute', '')}'"

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

    print(f"✅ SRT captions generated: {output_path}")
    return output_path


def burn_caption(input_path, output_path, caption_text, position='top',
                duration=None, font_size=48):
    """
    Burn caption text into video.

    Parameters:
    - caption_text: Text to burn in
    - position: 'top', 'bottom', or 'center'
    - duration: How long to show caption (None = entire video)

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
    caption_text = caption_text.replace("'", "'\\\\\\''").replace(":", "\\\\:")

    # Build drawtext filter
    drawtext = (
        f"drawtext=text='{caption_text}':"
        f"fontsize={font_size}:fontcolor=white:bordercolor=black:borderw=3:"
        f"x=(w-text_w)/2:y={y_pos}:"
        f"fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
    )

    if duration:
        drawtext += f":enable='between(t,0,{duration})'"

    cmd = [
        'ffmpeg', '-i', input_path,
        '-vf', drawtext,
        '-c:a', 'copy', '-c:v', 'libx264', '-crf', '18',
        '-y', output_path
    ]

    subprocess.run(cmd, check=True, capture_output=True)

    return output_path
```

#### 6.2 FFmpeg Command Logging

**File**: `backend/video-processing/highlights_bot/logger.py` (NEW)

```python
import os
import json
from datetime import datetime

class FFmpegLogger:
    """
    Logger for FFmpeg commands to ensure reproducibility.
    """

    def __init__(self, match_id, output_dir='ffmpeg_logs'):
        self.match_id = match_id
        self.output_dir = os.path.join(output_dir, match_id)
        self.commands = []

        os.makedirs(self.output_dir, exist_ok=True)

        print(f"📝 FFmpeg logger initialized: {self.output_dir}")

    def log_command(self, step_name, command, description=''):
        """
        Log an FFmpeg command.

        Parameters:
        - step_name: Short name for this step (e.g., '01_extract_clip')
        - command: Full FFmpeg command (list or string)
        - description: Human-readable description
        """
        if isinstance(command, list):
            command_str = ' '.join(command)
        else:
            command_str = command

        entry = {
            'step': step_name,
            'command': command_str,
            'description': description,
            'timestamp': datetime.now().isoformat()
        }

        self.commands.append(entry)

        # Write individual shell script
        script_path = os.path.join(self.output_dir, f'{step_name}.sh')
        with open(script_path, 'w') as f:
            f.write('#!/bin/bash\n')
            f.write(f'# {description}\n')
            f.write(f'# Generated: {entry["timestamp"]}\n\n')
            f.write(command_str + '\n')

        # Make executable
        os.chmod(script_path, 0o755)

        print(f"  ✓ Logged: {step_name}")

    def write_reproduce_md(self):
        """
        Write comprehensive REPRODUCE.md file.
        """
        reproduce_path = os.path.join(self.output_dir, 'REPRODUCE.md')

        with open(reproduce_path, 'w') as f:
            f.write(f"# Reproduction Guide - {self.match_id}\n\n")
            f.write(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n")
            f.write("---\n\n")

            f.write("## Overview\n\n")
            f.write(f"This document contains all FFmpeg commands used to process this match.\n")
            f.write(f"Total steps: {len(self.commands)}\n\n")
            f.write("Each step has a corresponding `.sh` script in this directory.\n\n")
            f.write("---\n\n")

            for idx, cmd in enumerate(self.commands, start=1):
                f.write(f"## Step {idx}: {cmd['step']}\n\n")

                if cmd['description']:
                    f.write(f"**Description**: {cmd['description']}\n\n")

                f.write(f"**Timestamp**: {cmd['timestamp']}\n\n")
                f.write("**Command**:\n")
                f.write("```bash\n")
                f.write(cmd['command'])
                f.write("\n```\n\n")
                f.write("---\n\n")

            f.write("## Running All Steps\n\n")
            f.write("To reproduce this entire processing pipeline:\n\n")
            f.write("```bash\n")
            for cmd in self.commands:
                f.write(f"# {cmd['step']}\n")
                f.write(f"./{cmd['step']}.sh\n\n")
            f.write("```\n\n")
            f.write("---\n\n")
            f.write("**Note**: Paths in commands may need adjustment based on your environment.\n")

        print(f"✅ Reproduction guide written: {reproduce_path}")

        # Also write JSON for programmatic access
        json_path = os.path.join(self.output_dir, 'commands.json')
        with open(json_path, 'w') as f:
            json.dump({
                'match_id': self.match_id,
                'generated': datetime.now().isoformat(),
                'commands': self.commands
            }, f, indent=2)

        return reproduce_path


# Integration into main.py
def process_match_with_logging(match_id, video_path, config):
    """
    Main processing function with comprehensive logging.
    """
    logger = FFmpegLogger(match_id)

    # Example usage throughout pipeline:

    # 1. Extract clip
    cmd = ['ffmpeg', '-i', video_path, '-ss', '10', '-to', '20', '-c', 'copy', 'clip.mp4']
    logger.log_command('01_extract_clip', cmd, 'Extract 10s clip from match video')

    # 2. Stabilize
    cmd = ['ffmpeg', '-i', 'clip.mp4', '-vf', 'vidstabdetect', '-f', 'null', '-']
    logger.log_command('02_stabilize_detect', cmd, 'Detect shakiness for stabilization')

    # ... more steps ...

    # At the end
    logger.write_reproduce_md()
```

**Testing**:
```bash
python test_captions.py --events events.json --output captions.srt
python test_logging.py --match-id test_match_001
```

---

### Phase 7: Integration & Configuration (Week 8)
**Duration**: 6-8 hours
**Priority**: High
**Dependencies**: Phases 1-6

**What It Does**:
Integrates all enhancements into main pipeline and updates configuration.

#### 7.1 Updated Main Pipeline

**File**: `backend/video-processing/highlights_bot/main.py` (MAJOR UPDATE)

```python
#!/usr/bin/env python3
"""
Enhanced Highlights Bot - Professional Match Highlights Generator

Combines multi-signal detection, pro effects, overlays, and social media optimization.
"""

import argparse
import yaml
import os
import sys
from pathlib import Path

# Import all our modules
from detect import detect_events_multimodal
from effects import apply_pro_effects
from overlays import create_scorebug, create_goal_lowerthird, create_opening_slate, create_closing_slate
from overlays import apply_scorebug, apply_lowerthird
from audio import normalize_loudness, duck_audio_during_overlays
from shorts import generate_vertical_shorts
from captions import generate_srt_captions
from logger import FFmpegLogger


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
    events = detect_events_multimodal(args.video, json_events, config)

    print(f"\n✅ Detected {len(events)} events")
    for idx, event in enumerate(events[:10], 1):  # Show top 10
        print(f"  {idx}. {event['type']} at {event['timestamp']:.1f}s (score: {event['score']:.2f})")

    # ========================================
    # PHASE 2: CREATE OVERLAYS
    # ========================================
    print("\n" + "="*60)
    print("🎨 PHASE 2: Creating Overlays")
    print("="*60)

    # Opening slate
    if config.get('overlays', {}).get('opening_slate', {}).get('enabled', True):
        print("\n📽️ Creating opening slate...")
        opening_slate_path = os.path.join(args.output_dir, 'temp', 'opening_slate.mp4')
        create_opening_slate(match_meta, brand_assets, opening_slate_path,
                           duration=config['overlays']['opening_slate'].get('duration', 2.5))

    # Scorebug
    if config.get('overlays', {}).get('scorebug', {}).get('enabled', True):
        print("\n📊 Creating scorebug...")
        scorebug_path = os.path.join(args.output_dir, 'temp', 'scorebug.png')
        create_scorebug(match_meta, brand_assets, scorebug_path)

    # Goal lower-thirds
    goal_events = [e for e in events if e['type'] == 'goal']
    lowerthird_paths = []

    if config.get('overlays', {}).get('lower_thirds', {}).get('enabled', True):
        print(f"\n🏆 Creating {len(goal_events)} goal lower-thirds...")
        for idx, event in enumerate(goal_events):
            lt_path = os.path.join(args.output_dir, 'temp', f'lowerthird_goal_{idx}.png')
            create_goal_lowerthird(event, brand_assets, lt_path)
            lowerthird_paths.append((event['timestamp'], lt_path))

    # Closing slate
    if config.get('overlays', {}).get('closing_slate', {}).get('enabled', True):
        print("\n🎬 Creating closing slate...")
        closing_slate_path = os.path.join(args.output_dir, 'temp', 'closing_slate.mp4')
        create_closing_slate(match_meta, brand_assets, closing_slate_path,
                           duration=config['overlays']['closing_slate'].get('duration', 3.0))

    # ========================================
    # PHASE 3: PROCESS CLIPS
    # ========================================
    print("\n" + "="*60)
    print("✂️ PHASE 3: Processing Clips")
    print("="*60)

    processed_clips = []

    for idx, event in enumerate(events):
        print(f"\n📹 Processing clip {idx+1}/{len(events)}: {event['type']} at {event['timestamp']:.1f}s")

        # Extract base clip
        clip_path = os.path.join(args.output_dir, 'temp', f'clip_{idx:03d}.mp4')
        # ... extraction code ...

        # Apply pro effects (stabilization, zoom, replay)
        enhanced_path = apply_pro_effects(clip_path, event, config, brand_assets)
        logger.log_command(f'03_{idx:03d}_effects',
                          f'# Apply effects to clip {idx}',
                          f'Stabilize, zoom, replay for {event["type"]}')

        processed_clips.append(enhanced_path)

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
        if config.get('overlays', {}).get('opening_slate', {}).get('enabled'):
            f.write(f"file '{opening_slate_path}'\n")

        # All clips
        for clip in processed_clips:
            f.write(f"file '{clip}'\n")

        # Closing slate
        if config.get('overlays', {}).get('closing_slate', {}).get('enabled'):
            f.write(f"file '{closing_slate_path}'\n")

    temp_concat = os.path.join(args.output_dir, 'temp', 'concatenated.mp4')
    concat_cmd = [
        'ffmpeg', '-f', 'concat', '-safe', '0', '-i', concat_list,
        '-c', 'copy', '-y', temp_concat
    ]
    logger.log_command('04_concatenate', concat_cmd, 'Concatenate all clips')
    # ... run command ...

    # Apply scorebug overlay
    if config.get('overlays', {}).get('scorebug', {}).get('enabled'):
        print("\n📊 Applying scorebug overlay...")
        temp_scorebug = os.path.join(args.output_dir, 'temp', 'with_scorebug.mp4')
        apply_scorebug(temp_concat, scorebug_path, temp_scorebug)
        logger.log_command('05_scorebug', '# Apply scorebug', 'Add persistent scorebug')
        temp_concat = temp_scorebug

    # Apply lower-thirds
    for timestamp, lt_path in lowerthird_paths:
        print(f"\n🏆 Applying lower-third at {timestamp:.1f}s...")
        temp_lt = os.path.join(args.output_dir, 'temp', f'with_lt_{timestamp}.mp4')
        apply_lowerthird(temp_concat, lt_path, temp_lt, timestamp, duration=3.0)
        logger.log_command(f'06_lowerthird_{timestamp}', '# Apply lower-third',
                          f'Add goal overlay at {timestamp}s')
        temp_concat = temp_lt

    # ========================================
    # PHASE 5: AUDIO PROCESSING
    # ========================================
    print("\n" + "="*60)
    print("🔊 PHASE 5: Audio Processing")
    print("="*60)

    # Audio ducking during overlays
    if config.get('editing', {}).get('audio_ducking', False):
        print("\n🔉 Applying audio ducking...")
        overlay_times = [(ts, ts+3.0) for ts, _ in lowerthird_paths]
        temp_duck = os.path.join(args.output_dir, 'temp', 'ducked.mp4')
        duck_audio_during_overlays(temp_concat, temp_duck, overlay_times, duck_amount_db=-3.0)
        logger.log_command('07_duck_audio', '# Duck audio', 'Reduce audio during overlays')
        temp_concat = temp_duck

    # Loudness normalization
    if config.get('editing', {}).get('audio_normalize', False):
        print("\n🎚️ Normalizing audio...")
        final_highlights = os.path.join(args.output_dir, 'highlights_1080p.mp4')
        normalize_loudness(temp_concat, final_highlights, target_lufs=-14.0)
        logger.log_command('08_normalize', '# Normalize loudness', 'Normalize to -14 LUFS')
    else:
        import shutil
        shutil.copy(temp_concat, os.path.join(args.output_dir, 'highlights_1080p.mp4'))

    print(f"\n✅ Main highlights saved: {final_highlights}")

    # ========================================
    # PHASE 6: VERTICAL SHORTS
    # ========================================
    if config.get('shorts', {}).get('enabled', False):
        print("\n" + "="*60)
        print("📱 PHASE 6: Generating Vertical Shorts")
        print("="*60)

        shorts = generate_vertical_shorts(
            events, args.video, match_meta, brand_assets, config,
            output_dir=os.path.join(args.output_dir, 'shorts')
        )

        print(f"\n✅ Generated {len(shorts)} vertical shorts")

    # ========================================
    # PHASE 7: CAPTIONS
    # ========================================
    if config.get('captions', {}).get('generate_srt', False):
        print("\n" + "="*60)
        print("💬 PHASE 7: Generating Captions")
        print("="*60)

        srt_path = os.path.join(args.output_dir, 'captions.srt')
        generate_srt_captions(events, match_meta, srt_path)

        print(f"\n✅ Captions saved: {srt_path}")

    # ========================================
    # FINALIZE
    # ========================================
    print("\n" + "="*60)
    print("📝 Writing Reproduction Guide")
    print("="*60)

    logger.write_reproduce_md()

    print("\n" + "="*60)
    print("✅ PROCESSING COMPLETE!")
    print("="*60)
    print(f"\n📁 Outputs:")
    print(f"  - Main highlights: {final_highlights}")
    if config.get('shorts', {}).get('enabled'):
        print(f"  - Vertical shorts: {os.path.join(args.output_dir, 'shorts')}/")
    if config.get('captions', {}).get('generate_srt'):
        print(f"  - Captions: {srt_path}")
    print(f"  - Logs: ffmpeg_logs/{match_id}/")
    print()


if __name__ == '__main__':
    main()
```

#### 7.2 Complete config.yaml

**File**: `backend/video-processing/highlights_bot/config.yaml` (REPLACE)

```yaml
# ============================================
# ENHANCED HIGHLIGHTS BOT CONFIGURATION
# World-Class Grassroots Sports Video Platform
# ============================================

# Input/Output Directories
input_dir: ./in
output_dir: ./out
temp_dir: ./temp

# ============================================
# DETECTION (Multi-Signal Fusion)
# ============================================
detection:
  # Primary model
  model: yolov8
  confidence: 0.7

  # Enable signals
  signals:
    - yolo           # Object detection (ball, players)
    - audio_energy   # Crowd reactions
    - whistle        # Referee whistles
    - optical_flow   # Movement bursts
    - ocr            # Scoreboard changes (if visible)
    # - asr          # Commentary keywords (requires Whisper, optional)

  # Signal weights for fusion
  weights:
    json: 5.0        # Ground truth from Apps Script
    yolo: 2.0
    audio_energy: 1.5
    whistle: 1.0
    optical_flow: 1.0
    ocr: 3.0
    asr: 2.0

  # Event time windows (seconds before/after detected moment)
  windows:
    goal:
      pre: 8
      post: 10
    chance:
      pre: 6
      post: 6
    save:
      pre: 5
      post: 5
    skill:
      pre: 5
      post: 5
    foul:
      pre: 4
      post: 6
    card:
      pre: 4
      post: 6
    build_up:
      pre: 10
      post: 5

  # OCR settings (if enabled)
  ocr_enabled: false
  ocr_region: [0.8, 0.0, 1.0, 0.2]  # Top-right 20% of frame

  # ASR settings (if enabled)
  asr_enabled: false
  asr_model: whisper-base
  asr_keywords:
    - goal
    - chance
    - save
    - penalty
    - free kick
    - corner
    - offside
    - red card
    - yellow card

# ============================================
# EDITING (Professional Effects)
# ============================================
editing:
  # Basic settings
  target_duration: 480  # 8 minutes (seconds)
  transition: stinger   # stinger, fade, dip, or cut

  # Video stabilization
  stabilize: true
  stabilize_shakiness: 5    # 1-10 (higher = more correction)
  stabilize_smoothing: 10   # 0-100 (higher = smoother)

  # Smart zoom
  smart_zoom: true
  zoom_factor_max: 1.25     # 1.25 = 25% zoom
  zoom_events: [goal, chance, save]

  # Slow-motion replays
  replays: true
  replay_slowmo: 0.65        # 0.65 = 65% speed (35% slower)
  replay_events: [goal, save]
  replay_duration_before: 3  # Seconds before peak moment
  replay_duration_after: 3   # Seconds after peak moment

  # Audio
  audio_normalize: true
  audio_lufs: -14            # Broadcast standard
  audio_true_peak: -1.5      # Peak limiter
  audio_ducking: true        # Duck during overlays
  audio_duck_amount_db: -3   # Reduce by 3 dB

  # Color grading
  color_lut: null            # Path to .cube LUT file (optional)
  color_sharpen: mild        # null, mild, medium, strong
  color_saturation: 1.0      # 1.0 = unchanged, 1.2 = +20%

  # Filters (applied in order)
  filters:
    - stabilize
    - smart_zoom
    - color_grade

# ============================================
# OVERLAYS (Broadcast Graphics)
# ============================================
overlays:
  # Persistent scorebug
  scorebug:
    enabled: true
    position: top-left
    update_on_goals: true
    show_time: true

  # Goal/event lower-thirds
  lower_thirds:
    enabled: true
    duration: 3.0
    fade_in: 0.3
    fade_out: 0.3
    events: [goal, chance, card]
    position: bottom

  # Opening slate
  opening_slate:
    enabled: true
    duration: 2.5
    show_badges: true
    show_competition: true
    show_date: true
    show_venue: true
    show_sponsor: true

  # Closing slate
  closing_slate:
    enabled: true
    duration: 3.0
    show_final_score: true
    show_motm: true
    show_cta: true
    cta_text: "Subscribe for more highlights!"

  # Sponsor watermark
  sponsor:
    enabled: false
    position: bottom-right
    opacity: 0.6
    size: [150, 75]
    exclude_during_replays: true

# ============================================
# BRAND ASSETS
# ============================================
brand:
  # Directories
  badges_dir: ./brand/badges/
  fonts_dir: ./brand/fonts/
  templates_dir: ./brand/templates/
  luts_dir: ./brand/luts/

  # Specific assets
  club_badge: ./brand/badges/club_badge.png
  home_badge: ./brand/badges/home_team.png
  away_badge: ./brand/badges/away_team.png
  sponsor_logo: ./brand/sponsor.png

  # Fonts
  font_bold: ./brand/fonts/Inter-Bold.ttf
  font_regular: ./brand/fonts/Inter-Regular.ttf

  # Templates
  scorebug_template: ./brand/templates/scorebug_template.png
  lower_third_template: ./brand/templates/lower_third_template.png
  opening_slate_bg: ./brand/templates/opening_slate_bg.png
  closing_slate_bg: ./brand/templates/closing_slate_bg.png

  # Transitions
  stinger_path: ./brand/stinger.mov

  # Color grading
  lut_file: null  # ./brand/luts/club_lut.cube

# ============================================
# VERTICAL SHORTS (Social Media)
# ============================================
shorts:
  enabled: true
  output_dir: ./out/shorts/

  # Selection
  count: 10                # Top N moments
  min_score: 2.0           # Minimum event score

  # Format
  resolution: [1080, 1920] # 9:16 vertical
  max_duration: 60         # Max 60 seconds per short

  # Overlays (vertical-optimized)
  overlays:
    show_badge: true
    show_title: true
    show_minute: true
    show_cta: true
    cta_text: "Follow for more!"

  # Platform-specific exports
  platforms:
    tiktok:
      enabled: true
      max_duration: 60
    instagram:
      enabled: true
      max_duration: 90
    youtube:
      enabled: true
      max_duration: 60

# ============================================
# CAPTIONS (SRT)
# ============================================
captions:
  generate_srt: true
  output_path: ./out/captions.srt

  # Burn-in options
  burn_in_highlights: false  # Burn captions into main highlights
  burn_in_shorts: true       # Burn captions into vertical shorts

  # Formatting
  font_size: 48
  font_color: white
  border_color: black
  border_width: 3
  position: bottom           # top, bottom, center

  # Content
  include_emojis: true
  include_assists: true
  include_minute: true

# ============================================
# EXPORT
# ============================================
export:
  # Video
  format: mp4
  codec: h264
  profile: high
  crf: 18                    # 18-21 for high quality
  preset: slow               # slow = better quality, slower encoding
  pix_fmt: yuv420p

  # Audio
  audio_codec: aac
  audio_bitrate: 192k
  audio_sample_rate: 48000

  # Optimization
  faststart: true            # Move moov atom to start (web streaming)
  two_pass: false            # Two-pass encoding (slower, better quality)

# ============================================
# LOGGING & DEBUGGING
# ============================================
logging:
  level: info                # debug, info, warn, error

  # FFmpeg command logging
  ffmpeg_commands: true
  log_dir: ./ffmpeg_logs/

  # Reproducibility
  reproduce_md: true
  save_command_json: true
  save_individual_scripts: true

  # Performance metrics
  track_processing_time: true
  track_file_sizes: true

# ============================================
# PERFORMANCE
# ============================================
performance:
  # Threading
  max_workers: 4             # Parallel processing workers

  # Memory
  max_memory_gb: 8           # Maximum RAM usage

  # Temp files
  cleanup_temp: true         # Delete temp files after processing
  keep_intermediate: false   # Keep intermediate clips for debugging

  # Optimization
  use_gpu: false             # Use GPU acceleration (if available)
  gpu_device: 0

# ============================================
# INTEGRATION
# ============================================
integration:
  # Apps Script
  apps_script:
    enabled: true
    json_input: true         # Accept JSON from Apps Script
    trust_ground_truth: true # Always include JSON events

  # YouTube
  youtube:
    auto_upload: true
    description_template: |
      Match highlights: {home} vs {away}
      {competition} | {date}
      Final Score: {final_score}

      ⚽ Goals:
      {goals_list}

      📺 Subscribe for more highlights!
    tags:
      - football
      - highlights
      - grassroots

  # Make.com
  make:
    enabled: true
    webhook_url: null        # Set via environment variable
    send_completion: true
    send_metadata: true

# ============================================
# DEFAULTS (Fallbacks)
# ============================================
defaults:
  match_duration: 90         # Minutes
  home_team: "Home"
  away_team: "Away"
  competition: "Friendly Match"
  venue: "Local Ground"
```

**Testing Full Pipeline**:
```bash
cd backend/video-processing/highlights_bot

# Test with sample match
python main.py \
  --video sample_match.mp4 \
  --json sample_events.json \
  --config config.yaml \
  --output-dir out/test_001 \
  --match-id test_001
```

---

### Phase 8: Docker Integration (Week 9)
**Duration**: 4-6 hours
**Priority**: Medium
**Dependencies**: Phase 7

**What It Does**:
Integrates enhanced pipeline into existing Docker processor.

#### 8.1 Update Docker Configuration

**File**: `backend/video-processing/football-highlights-processor/Dockerfile` (UPDATE)

```dockerfile
FROM python:3.10-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    ffmpeg \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libgomp1 \
    tesseract-ocr \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy requirements
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy highlights_bot
COPY ../highlights_bot /app/highlights_bot

# Copy processor code
COPY . /app/processor

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=/app

# Run processor
CMD ["python", "processor/worker.py"]
```

**File**: `requirements.txt` (UPDATE)

```txt
# Existing dependencies
opencv-python==4.8.1
numpy==1.24.3
pyyaml==6.0.1
requests==2.31.0

# NEW: Multi-signal detection
librosa==0.10.1
soundfile==0.12.1

# NEW: Overlays
Pillow==10.1.0

# NEW: OCR (optional)
pytesseract==0.3.10

# NEW: ASR (optional, large)
# openai-whisper==20230314
```

**File**: `docker-compose.yml` (UPDATE)

```yaml
version: '3.8'

services:
  processor:
    build:
      context: .
      dockerfile: Dockerfile
    volumes:
      - ./input:/app/input
      - ./output:/app/output
      - ./brand:/app/brand
      - ./config:/app/config
      - ./logs:/app/logs
    environment:
      - WORKER_COUNT=5
      - MAX_MEMORY_GB=8
      - ENABLE_GPU=false
    restart: unless-stopped
    deploy:
      resources:
        limits:
          cpus: '4'
          memory: 8G
        reservations:
          cpus: '2'
          memory: 4G

  # Optional: Monitoring
  monitor:
    image: grafana/grafana:latest
    ports:
      - "3000:3000"
    volumes:
      - ./monitoring/grafana:/var/lib/grafana
    depends_on:
      - processor
```

---

## 📊 Success Metrics

### Processing Quality
- **Video Quality**: CRF 18-21 (broadcast standard)
- **Audio Quality**: -14 LUFS (YouTube/broadcast standard)
- **Detection Accuracy**: >90% of key moments captured
- **False Positives**: <10% of detected events

### Processing Speed
- **10-minute video**: 3-5 minutes (with all effects)
- **90-minute match**: 20-30 minutes (with all effects)
- **Vertical shorts**: +5 minutes for 10 clips

### Output Quality Checklist
- ✅ Video stabilized (minimal shake)
- ✅ Smart zoom on action moments
- ✅ Goals have slow-mo replays
- ✅ Scorebug visible and accurate
- ✅ Lower-thirds appear for all goals
- ✅ Opening/closing slates present
- ✅ Audio normalized (-14 LUFS ±1)
- ✅ Audio ducked during overlays
- ✅ Vertical shorts generated (if enabled)
- ✅ SRT captions accurate
- ✅ FFmpeg logs complete

---

## 🧪 Testing Plan

### Phase 0-2 Testing (Weeks 1-3)
```bash
# Test audio detection
pytest tests/test_audio_detection.py -v

# Test video effects
pytest tests/test_effects.py -v

# Test signal fusion
pytest tests/test_fusion.py -v
```

### Phase 3-4 Testing (Weeks 4-5)
```bash
# Test overlays
pytest tests/test_overlays.py -v

# Test audio processing
pytest tests/test_audio.py -v

# Integration test
pytest tests/test_integration.py -v
```

### Phase 5-7 Testing (Weeks 6-8)
```bash
# Test shorts generation
pytest tests/test_shorts.py -v

# Test captions
pytest tests/test_captions.py -v

# End-to-end test
python main.py --video sample.mp4 --json sample.json --config test_config.yaml
```

### Phase 8 Testing (Week 9)
```bash
# Docker build test
docker-compose build

# Docker run test
docker-compose up -d
docker-compose logs -f

# Load test (5 videos simultaneously)
./scripts/load_test.sh
```

---

## 📈 Timeline Summary

| Phase | Duration | Effort | Priority | Dependencies |
|-------|----------|--------|----------|--------------|
| 0: Preparation | 3-5 hours | Low | High | None |
| 1: Detection | 6-8 hours | Medium | High | Phase 0 |
| 2: Effects | 8-10 hours | Medium | High | Phase 1 |
| 3: Overlays | 10-12 hours | High | High | Phase 2 |
| 4: Audio | 4-6 hours | Medium | Medium | Phase 3 |
| 5: Shorts | 6-8 hours | Medium | High | Phase 4 |
| 6: Captions | 4-5 hours | Low | Medium | Phase 5 |
| 7: Integration | 6-8 hours | Medium | High | Phase 6 |
| 8: Docker | 4-6 hours | Medium | Medium | Phase 7 |

**Total Estimated Time**: 51-68 hours
**Spread Over**: 9 weeks (5-8 hours per week)

---

## 💰 Resource Requirements

### Software Dependencies
- **Free**:
  - FFmpeg (video processing)
  - Python 3.8+ (runtime)
  - OpenCV (computer vision)
  - librosa (audio analysis)
  - Pillow (image processing)
  - Docker (containerization)

- **Optional**:
  - Whisper (ASR) - Free but large model
  - Tesseract (OCR) - Free

### Hardware Recommendations
- **Minimum**:
  - CPU: 4 cores
  - RAM: 8 GB
  - Storage: 100 GB

- **Recommended**:
  - CPU: 8 cores
  - RAM: 16 GB
  - Storage: 500 GB SSD
  - GPU: Optional (speeds up AI detection)

### Brand Assets Needed
1. Club badge (PNG, transparent, 500x500px)
2. Team badges for opponents (PNGs)
3. Fonts (TrueType, 2 files: Bold & Regular)
4. Stinger transition (MOV with alpha, 0.5s)
5. Template images (optional, will auto-generate if missing)

**Budget for Asset Creation**: $0-500
- DIY: Free (use Canva, GIMP)
- Fiverr designer: $50-200
- Professional designer: $200-500

---

## 🚀 Deployment Strategy

### Development → Staging → Production

**Development** (Weeks 1-7):
- Implement phases 1-6
- Test on sample videos
- Iterate on quality

**Staging** (Week 8):
- Full integration (Phase 7)
- Process 5 real matches
- Gather feedback from coaches

**Production** (Week 9+):
- Docker deployment (Phase 8)
- Process all matches automatically
- Monitor performance
- Gradual rollout to users

---

## 📞 Support & Troubleshooting

### Common Issues

**Issue**: Audio detection not finding moments
- **Solution**: Adjust threshold in config.yaml (default 0.75, try 0.6-0.8)

**Issue**: Stabilization too aggressive (warped footage)
- **Solution**: Reduce `shakiness` parameter (default 5, try 3-4)

**Issue**: Smart zoom not centered
- **Solution**: Check bbox_data from YOLO detection, may need retraining

**Issue**: Overlays not appearing
- **Solution**: Check brand assets paths in config.yaml

**Issue**: Out of memory during processing
- **Solution**: Reduce `max_workers` in config.yaml, process fewer clips simultaneously

### Performance Optimization

**If processing is slow**:
1. Reduce `stabilize_accuracy` (default 9, try 6)
2. Use `preset: faster` instead of `slow` in export config
3. Disable replays temporarily
4. Process at lower resolution first, upscale final output

**If output quality is poor**:
1. Increase CRF to 15-16 (higher quality, larger file)
2. Use `two_pass: true` in export config
3. Check source video quality (garbage in, garbage out)

---

## ✅ Next Actions

1. **Read this document** ✓
2. **Create Phase 0 checklist** - Set up test environment
3. **Gather brand assets** - Logo, fonts, colors
4. **Process sample match** - Test current system baseline
5. **Start Phase 1** - Implement audio detection
6. **Weekly review** - Check progress against timeline
7. **Iterate** - Adjust based on results

---

## 🎉 Vision: World-Class Platform

By completing this plan, you'll have:

✅ **Detection**: Multi-signal AI detection (better than pro systems)
✅ **Effects**: Broadcast-quality stabilization, zoom, replays
✅ **Graphics**: Professional overlays, scorebugs, slates
✅ **Audio**: Proper loudness normalization, ducking
✅ **Social**: Auto-generated vertical shorts for TikTok/Instagram
✅ **Captions**: Automated SRT generation
✅ **Logging**: Full reproducibility with FFmpeg logs
✅ **Scale**: Docker-based production system

**Result**: A video platform that produces better highlights than many professional broadcasters, tailored for grassroots football, with mobile-first workflow and full automation.

---

**Document Version**: 1.0
**Created**: 2025-11-03
**Author**: Claude (Anthropic)
**Status**: Ready to Implement

---

**Let's build this! 🚀⚽🎬**

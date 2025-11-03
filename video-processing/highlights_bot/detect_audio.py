"""
Audio-based event detection for highlights extraction.

This module provides multi-signal audio analysis:
- Audio Energy Detection: Detects crowd reactions and roars
- Whistle Detection: Detects referee whistles (3.5-4.5 kHz)

Part of Phase 1: Multi-Signal Event Detection
Created: 2025-11-03
"""

import librosa
import numpy as np
from typing import List, Dict, Tuple


def detect_audio_spikes(video_path: str, threshold: float = 0.75, min_duration: float = 1.0) -> List[Dict]:
    """
    Detect audio energy spikes indicating crowd reactions.

    This function analyzes the audio track for sudden increases in energy,
    which typically correspond to exciting moments like goals, near misses,
    or big saves.

    Args:
        video_path: Path to video file
        threshold: Energy threshold (normalized, default 0.75)
        min_duration: Minimum spike duration in seconds (default 1.0)

    Returns:
        List of dictionaries with:
        - timestamp: Start time of spike (seconds)
        - duration: Spike duration (seconds)
        - energy: Peak normalized energy level
        - type: Always 'audio_spike'

    Example:
        >>> spikes = detect_audio_spikes('match.mp4', threshold=0.75)
        >>> print(f"Found {len(spikes)} crowd reactions")
        >>> for spike in spikes[:5]:
        ...     print(f"{spike['timestamp']:.1f}s - Energy: {spike['energy']:.2f}")
    """
    print(f"  🔊 Analyzing audio energy (threshold={threshold}, min_duration={min_duration}s)")

    # Extract audio with librosa
    try:
        audio, sr = librosa.load(video_path, sr=22050, mono=True)
    except Exception as e:
        print(f"  ❌ Failed to load audio: {e}")
        return []

    # Calculate short-term energy using RMS (200ms windows)
    hop_length = int(sr * 0.2)  # 200ms hops
    frame_length = hop_length * 2  # 400ms frames
    energy = librosa.feature.rms(y=audio, frame_length=frame_length, hop_length=hop_length)[0]

    # Normalize energy (z-score normalization)
    energy_norm = (energy - np.mean(energy)) / (np.std(energy) + 1e-10)

    # Convert frame indices to timestamps
    times = librosa.frames_to_time(np.arange(len(energy)), sr=sr, hop_length=hop_length)

    # Detect spikes above threshold
    spikes = []
    in_spike = False
    spike_start = 0
    spike_start_idx = 0

    for i, (t, e) in enumerate(zip(times, energy_norm)):
        if e > threshold and not in_spike:
            # Start of new spike
            spike_start = t
            spike_start_idx = i
            in_spike = True
        elif e <= threshold and in_spike:
            # End of spike
            duration = t - spike_start
            if duration >= min_duration:
                # Calculate peak energy in this spike
                peak_energy = float(np.max(energy_norm[spike_start_idx:i]))

                spikes.append({
                    'timestamp': float(spike_start),
                    'duration': float(duration),
                    'energy': peak_energy,
                    'type': 'audio_spike'
                })
            in_spike = False

    # Handle spike at end of audio
    if in_spike and len(times) > 0:
        duration = times[-1] - spike_start
        if duration >= min_duration:
            peak_energy = float(np.max(energy_norm[spike_start_idx:]))
            spikes.append({
                'timestamp': float(spike_start),
                'duration': float(duration),
                'energy': peak_energy,
                'type': 'audio_spike'
            })

    print(f"  ✅ Found {len(spikes)} audio spikes")
    return spikes


def detect_whistle_tones(video_path: str, freq_range: Tuple[int, int] = (3500, 4500), threshold: float = 0.7) -> List[Dict]:
    """
    Detect referee whistle tones using frequency analysis.

    Referee whistles typically produce tones in the 3.5-4.5 kHz range.
    This function uses STFT to detect energy in this frequency band.

    Args:
        video_path: Path to video file
        freq_range: Frequency range in Hz (default 3500-4500 Hz)
        threshold: Detection threshold (0-1, default 0.7)

    Returns:
        List of dictionaries with:
        - timestamp: Whistle time (seconds)
        - confidence: Detection confidence (0-1)
        - type: Always 'whistle'

    Example:
        >>> whistles = detect_whistle_tones('match.mp4')
        >>> print(f"Found {len(whistles)} referee whistles")
        >>> for whistle in whistles:
        ...     print(f"{whistle['timestamp']:.1f}s - Confidence: {whistle['confidence']:.2f}")
    """
    print(f"  🎵 Detecting whistle tones ({freq_range[0]}-{freq_range[1]} Hz, threshold={threshold})")

    # Extract audio
    try:
        audio, sr = librosa.load(video_path, sr=22050, mono=True)
    except Exception as e:
        print(f"  ❌ Failed to load audio: {e}")
        return []

    # Compute Short-Time Fourier Transform
    n_fft = 2048
    hop_length = 512
    stft = np.abs(librosa.stft(audio, n_fft=n_fft, hop_length=hop_length))
    freqs = librosa.fft_frequencies(sr=sr, n_fft=n_fft)

    # Find frequency band indices for whistle range
    freq_mask = (freqs >= freq_range[0]) & (freqs <= freq_range[1])
    freq_indices = np.where(freq_mask)[0]

    # Extract energy in whistle frequency range
    whistle_energy = np.sum(stft[freq_indices, :], axis=0)
    total_energy = np.sum(stft, axis=0)
    whistle_ratio = whistle_energy / (total_energy + 1e-10)

    # Convert frame indices to timestamps
    times = librosa.frames_to_time(np.arange(stft.shape[1]), sr=sr, hop_length=hop_length)

    # Detect whistles above threshold
    whistles = []
    for t, ratio in zip(times, whistle_ratio):
        if ratio > threshold:
            whistles.append({
                'timestamp': float(t),
                'confidence': float(ratio),
                'type': 'whistle'
            })

    # Merge nearby whistles (within 0.5s) to avoid duplicates
    merged = []
    if whistles:
        current = whistles[0]
        for w in whistles[1:]:
            if w['timestamp'] - current['timestamp'] < 0.5:
                # Merge: keep higher confidence
                current['confidence'] = max(current['confidence'], w['confidence'])
            else:
                # Save current and start new
                merged.append(current)
                current = w
        merged.append(current)

    print(f"  ✅ Found {len(merged)} whistle tones")
    return merged


def detect_commentary_keywords(video_path: str, keywords: List[str] = None, model: str = 'tiny') -> List[Dict]:
    """
    Detect commentary keywords using Whisper ASR (Automatic Speech Recognition).

    This function transcribes audio and detects keywords like "goal", "save",
    "penalty", etc. to identify exciting moments.

    Args:
        video_path: Path to video file
        keywords: List of keywords to detect (default: football-specific)
        model: Whisper model size ('tiny', 'base', 'small', 'medium', 'large')

    Returns:
        List of dictionaries with:
        - timestamp: Keyword detection time (seconds)
        - keyword: The detected keyword
        - confidence: ASR confidence (0-1)
        - type: Always 'commentary'

    Example:
        >>> keywords = detect_commentary_keywords('match.mp4')
        >>> for kw in keywords:
        ...     print(f"{kw['timestamp']:.1f}s - '{kw['keyword']}' ({kw['confidence']:.2f})")

    Note:
        Requires 'openai-whisper' package. Install with:
        pip install openai-whisper

        This function is computationally expensive. Use 'tiny' or 'base'
        models for faster processing.
    """
    if keywords is None:
        keywords = [
            'goal', 'score', 'save', 'penalty', 'foul', 'card',
            'yellow', 'red', 'corner', 'free kick', 'offside',
            'shot', 'miss', 'keeper', 'goalkeeper', 'brilliant'
        ]

    print(f"  🎙️ Detecting commentary keywords (model={model}, {len(keywords)} keywords)")
    print(f"     Keywords: {', '.join(keywords[:10])}...")

    try:
        import whisper
    except ImportError:
        print("  ⚠️  Whisper not installed. Skipping commentary detection.")
        print("     Install with: pip install openai-whisper")
        return []

    # Load Whisper model
    try:
        model_obj = whisper.load_model(model)
    except Exception as e:
        print(f"  ❌ Failed to load Whisper model: {e}")
        return []

    # Transcribe audio
    try:
        result = model_obj.transcribe(video_path, language='en')
    except Exception as e:
        print(f"  ❌ Failed to transcribe audio: {e}")
        return []

    # Search for keywords in transcription
    detections = []
    segments = result.get('segments', [])

    for segment in segments:
        text = segment['text'].lower()
        timestamp = segment['start']

        for keyword in keywords:
            if keyword.lower() in text:
                detections.append({
                    'timestamp': float(timestamp),
                    'keyword': keyword,
                    'confidence': 0.85,  # Whisper doesn't provide per-word confidence
                    'text': segment['text'],
                    'type': 'commentary'
                })

    print(f"  ✅ Found {len(detections)} keyword mentions")
    return detections


# For testing
if __name__ == '__main__':
    import sys

    if len(sys.argv) < 2:
        print("Usage: python detect_audio.py <video_path>")
        sys.exit(1)

    video_path = sys.argv[1]
    print(f"\n🎬 Testing audio detection on: {video_path}\n")

    # Test audio spikes
    print("=" * 60)
    print("TEST 1: Audio Energy Spikes")
    print("=" * 60)
    spikes = detect_audio_spikes(video_path, threshold=0.75, min_duration=1.0)
    print(f"\nResults: {len(spikes)} spikes detected\n")
    for i, spike in enumerate(spikes[:5], 1):
        print(f"  {i}. {spike['timestamp']:.1f}s - Energy: {spike['energy']:.2f} - Duration: {spike['duration']:.1f}s")
    if len(spikes) > 5:
        print(f"  ... and {len(spikes) - 5} more")

    # Test whistle detection
    print("\n" + "=" * 60)
    print("TEST 2: Whistle Detection")
    print("=" * 60)
    whistles = detect_whistle_tones(video_path, freq_range=(3500, 4500), threshold=0.7)
    print(f"\nResults: {len(whistles)} whistles detected\n")
    for i, whistle in enumerate(whistles[:5], 1):
        print(f"  {i}. {whistle['timestamp']:.1f}s - Confidence: {whistle['confidence']:.2f}")
    if len(whistles) > 5:
        print(f"  ... and {len(whistles) - 5} more")

    print("\n✅ Audio detection tests complete!\n")

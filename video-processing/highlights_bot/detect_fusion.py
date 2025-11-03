"""
Multi-signal fusion for robust event detection.

This module combines detection signals from multiple sources:
- YOLOv8 (visual object detection)
- Audio energy spikes (crowd reactions)
- Whistle detection (referee signals)
- Optical flow bursts (movement analysis)
- Scene cuts (production switches)
- JSON events (ground truth from Apps Script)

Part of Phase 1: Multi-Signal Event Detection
Created: 2025-11-03
"""

import numpy as np
from typing import List, Dict, Optional, Tuple
from collections import defaultdict


class SignalFusion:
    """
    Multi-signal event detection fusion engine.

    Combines detection signals with weighted scoring to produce
    a unified, ranked list of highlight moments.
    """

    def __init__(self, config: Optional[Dict] = None):
        """
        Initialize fusion engine with configuration.

        Args:
            config: Configuration dictionary with 'detection' section
        """
        self.config = config or {}

        # Default signal weights
        self.weights = {
            'json': 5.0,      # Ground truth (Apps Script)
            'yolo': 2.0,      # Visual object detection
            'audio': 1.5,     # Crowd reactions
            'whistle': 1.0,   # Referee whistles
            'flow': 1.0,      # Movement bursts
            'scene_cut': 0.5, # Production cuts
            'commentary': 1.2 # ASR keywords
        }

        # Override with config if provided
        if 'detection' in self.config and 'weights' in self.config['detection']:
            self.weights.update(self.config['detection']['weights'])

        # Time bucketing (in seconds)
        self.bucket_size = self.config.get('detection', {}).get('bucket_size', 1.0)

        # Minimum confidence threshold
        self.min_confidence = self.config.get('detection', {}).get('min_confidence', 0.3)

    def fuse_signals(self, signals: Dict[str, List[Dict]]) -> List[Dict]:
        """
        Fuse multiple detection signals into unified events.

        Args:
            signals: Dictionary of signal_type -> list of detections
                    Each detection should have 'timestamp' key

        Returns:
            List of fused events with scores and contributing signals

        Example:
            >>> signals = {
            ...     'audio': [{'timestamp': 10.5, 'energy': 2.3, 'type': 'audio_spike'}],
            ...     'yolo': [{'timestamp': 10.8, 'confidence': 0.9, 'type': 'ball_near_goal'}],
            ...     'whistle': [{'timestamp': 11.2, 'confidence': 0.8, 'type': 'whistle'}]
            ... }
            >>> fused = fusion.fuse_signals(signals)
            >>> print(f"Fused {len(fused)} events")
        """
        print("🔗 Fusing detection signals...")

        # Create time-bucketed events
        buckets = defaultdict(lambda: {
            'signals': [],
            'score': 0.0,
            'timestamps': [],
            'types': set()
        })

        # Add all signals to buckets
        for signal_type, detections in signals.items():
            if not detections:
                continue

            weight = self.weights.get(signal_type, 1.0)
            print(f"  ├─ Processing {len(detections)} {signal_type} detections (weight={weight})")

            for detection in detections:
                timestamp = detection.get('timestamp', 0)
                bucket_idx = int(timestamp / self.bucket_size)

                # Add signal to bucket
                bucket = buckets[bucket_idx]
                bucket['signals'].append({
                    'type': signal_type,
                    'detection': detection,
                    'weight': weight
                })
                bucket['timestamps'].append(timestamp)
                bucket['types'].add(detection.get('type', signal_type))

                # Add weighted score
                confidence = self._get_confidence(detection, signal_type)
                bucket['score'] += weight * confidence

        print(f"  ├─ Created {len(buckets)} time buckets")

        # Convert buckets to events
        fused_events = []
        for bucket_idx, bucket in buckets.items():
            # Calculate average timestamp
            avg_timestamp = float(np.mean(bucket['timestamps']))

            # Normalize score by number of signals
            num_signals = len(bucket['signals'])
            normalized_score = bucket['score'] / max(num_signals, 1)

            event = {
                'timestamp': avg_timestamp,
                'bucket_idx': bucket_idx,
                'score': normalized_score,
                'raw_score': bucket['score'],
                'num_signals': num_signals,
                'signal_types': list(bucket['types']),
                'signals': bucket['signals']
            }

            fused_events.append(event)

        print(f"  ├─ Generated {len(fused_events)} fused events")

        # Filter by minimum confidence
        filtered = [e for e in fused_events if e['score'] >= self.min_confidence]
        print(f"  └─ Kept {len(filtered)} events above threshold ({self.min_confidence})")

        return filtered

    def rank_events(self, events: List[Dict], top_k: Optional[int] = None) -> List[Dict]:
        """
        Rank events by score and optionally return top K.

        Args:
            events: List of fused events
            top_k: Return only top K events (None = all)

        Returns:
            Sorted list of events (highest score first)
        """
        # Sort by score (descending)
        sorted_events = sorted(events, key=lambda x: x['score'], reverse=True)

        if top_k is not None:
            sorted_events = sorted_events[:top_k]

        # Add rank
        for i, event in enumerate(sorted_events, 1):
            event['rank'] = i

        return sorted_events

    def _get_confidence(self, detection: Dict, signal_type: str) -> float:
        """
        Extract confidence/strength from detection.

        Different signals have different confidence measures:
        - audio: 'energy'
        - whistle: 'confidence'
        - flow: 'magnitude'
        - yolo: 'confidence'
        - json: always 1.0 (ground truth)
        """
        if signal_type == 'json':
            return 1.0

        if signal_type == 'audio':
            # Normalize energy (typically 0.75-3.0 range)
            energy = detection.get('energy', 1.0)
            return min(energy / 3.0, 1.0)

        if signal_type == 'flow':
            # Normalize magnitude (typically 2.5-10.0 range)
            magnitude = detection.get('magnitude', 2.5)
            return min(magnitude / 10.0, 1.0)

        if signal_type == 'scene_cut':
            # Normalize difference (typically 30-100 range)
            diff = detection.get('difference', 30.0)
            return min(diff / 100.0, 1.0)

        # Default: use 'confidence' key
        return float(detection.get('confidence', 0.5))

    def merge_nearby_events(self, events: List[Dict], time_window: float = 3.0) -> List[Dict]:
        """
        Merge events that occur within a time window.

        This prevents creating multiple clips for the same moment.

        Args:
            events: List of fused events
            time_window: Merge window in seconds (default 3.0)

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
                # Merge: combine signals and sum scores
                current['signals'].extend(event['signals'])
                current['signal_types'] = list(set(current['signal_types']) | set(event['signal_types']))
                current['raw_score'] += event['raw_score']
                current['score'] = max(current['score'], event['score'])
                current['num_signals'] += event['num_signals']
            else:
                # Save current and start new
                merged.append(current)
                current = event.copy()

        # Don't forget the last event
        merged.append(current)

        return merged

    def generate_event_summary(self, event: Dict) -> str:
        """
        Generate human-readable summary of fused event.

        Args:
            event: Fused event dictionary

        Returns:
            Summary string

        Example:
            >>> summary = fusion.generate_event_summary(event)
            >>> print(summary)
            "10.5s [Score: 8.2] - Audio spike + YOLO detection + Whistle (3 signals)"
        """
        timestamp = event['timestamp']
        score = event['score']
        num_signals = event['num_signals']
        signal_types = ', '.join(sorted(set([s['type'] for s in event['signals']])))

        return f"{timestamp:.1f}s [Score: {score:.1f}] - {signal_types} ({num_signals} signals)"

    def export_to_json_events(self, fused_events: List[Dict]) -> List[Dict]:
        """
        Convert fused events to JSON events format for main pipeline.

        Args:
            fused_events: List of fused events

        Returns:
            List of JSON event dictionaries compatible with existing pipeline
        """
        json_events = []

        for i, event in enumerate(fused_events, 1):
            # Determine event type from signals
            types = event['signal_types']

            # Prioritize certain types
            if 'goal' in ' '.join(types):
                event_type = 'goal'
            elif 'save' in ' '.join(types) or 'big_save' in ' '.join(types):
                event_type = 'save'
            elif 'whistle' in types:
                event_type = 'foul'
            elif 'audio_spike' in types and event['score'] > 3.0:
                event_type = 'goal_like'
            else:
                event_type = 'highlight'

            # Convert to JSON event
            json_event = {
                'id': f"auto_{i}",
                'timestamp': event['timestamp'],
                'minute': int(event['timestamp'] / 60),
                'type': event_type,
                'confidence': event['score'],
                'signals': [s['type'] for s in event['signals']],
                'auto_detected': True
            }

            json_events.append(json_event)

        return json_events


def create_fusion_engine(config: Optional[Dict] = None) -> SignalFusion:
    """
    Factory function to create a fusion engine.

    Args:
        config: Optional configuration dictionary

    Returns:
        Configured SignalFusion instance
    """
    return SignalFusion(config)


# For testing
if __name__ == '__main__':
    print("\n🔗 Testing Signal Fusion Engine\n")

    # Create test signals
    test_signals = {
        'audio': [
            {'timestamp': 10.5, 'energy': 2.3, 'type': 'audio_spike'},
            {'timestamp': 25.8, 'energy': 3.1, 'type': 'audio_spike'},
        ],
        'whistle': [
            {'timestamp': 11.2, 'confidence': 0.8, 'type': 'whistle'},
            {'timestamp': 26.0, 'confidence': 0.9, 'type': 'whistle'},
        ],
        'flow': [
            {'timestamp': 10.8, 'magnitude': 4.5, 'type': 'flow_burst'},
        ],
        'json': [
            {'timestamp': 300.0, 'type': 'goal', 'team': 'home'},
        ]
    }

    # Create fusion engine
    fusion = SignalFusion()

    # Fuse signals
    print("=" * 60)
    print("TEST 1: Signal Fusion")
    print("=" * 60)
    fused = fusion.fuse_signals(test_signals)
    print(f"\nResults: {len(fused)} fused events\n")

    for event in fused:
        print(f"  {fusion.generate_event_summary(event)}")

    # Rank events
    print("\n" + "=" * 60)
    print("TEST 2: Event Ranking")
    print("=" * 60)
    ranked = fusion.rank_events(fused)
    print(f"\nTop 5 events:\n")

    for event in ranked[:5]:
        print(f"  #{event['rank']}: {fusion.generate_event_summary(event)}")

    # Convert to JSON
    print("\n" + "=" * 60)
    print("TEST 3: JSON Export")
    print("=" * 60)
    json_events = fusion.export_to_json_events(ranked[:5])
    print(f"\nExported {len(json_events)} events:\n")

    for je in json_events:
        print(f"  {je['minute']}min - {je['type']} (confidence: {je['confidence']:.2f})")

    print("\n✅ Signal fusion tests complete!\n")


def detect_events_multimodal(video_path: str, json_events: Optional[List[Dict]] = None, config: Optional[Dict] = None) -> List[Dict]:
    """
    Main entry point for multi-signal event detection.
    This is the function called by main.py integration pipeline.

    Args:
        video_path: Path to video file
        json_events: Optional pre-existing JSON events (ground truth)
        config: Optional configuration dictionary

    Returns:
        List of detected events with scores and metadata
    """
    from detect_audio import detect_audio_spikes, detect_whistle_tones
    from detect_flow import detect_flow_bursts, detect_scene_cuts

    # Initialize signals dictionary
    signals = {}

    # Add JSON events as a signal
    if json_events:
        signals['json'] = json_events

    # Get detection config
    det_config = config.get('detection', {}) if config else {}
    enabled_signals = det_config.get('signals', ['yolo', 'audio_energy', 'whistle', 'optical_flow'])

    # Audio energy detection
    if 'audio_energy' in enabled_signals or 'audio' in enabled_signals:
        try:
            signals['audio'] = detect_audio_spikes(video_path, threshold=0.75, min_duration=1.0)
        except Exception as e:
            print(f"⚠️  Audio detection failed: {e}")
            signals['audio'] = []

    # Whistle detection
    if 'whistle' in enabled_signals:
        try:
            signals['whistle'] = detect_whistle_tones(video_path, freq_range=(3500, 4500), threshold=0.7)
        except Exception as e:
            print(f"⚠️  Whistle detection failed: {e}")
            signals['whistle'] = []

    # Optical flow detection
    if 'optical_flow' in enabled_signals or 'flow' in enabled_signals:
        try:
            signals['flow'] = detect_flow_bursts(video_path, threshold=3.0, min_duration=0.5)
        except Exception as e:
            print(f"⚠️  Flow detection failed: {e}")
            signals['flow'] = []

    # Scene cut detection
    if 'scene_cuts' in enabled_signals:
        try:
            signals['scene_cuts'] = detect_scene_cuts(video_path, threshold=30.0)
        except Exception as e:
            print(f"⚠️  Scene cut detection failed: {e}")
            signals['scene_cuts'] = []

    # Create fusion engine and process signals
    fusion = SignalFusion(config)
    fused_events = fusion.fuse_signals(signals)
    ranked_events = fusion.rank_events(fused_events)

    # Convert to JSON events format for pipeline
    return fusion.export_to_json_events(ranked_events)

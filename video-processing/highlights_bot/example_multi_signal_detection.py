"""
Example: Multi-Signal Event Detection

This example demonstrates how to use the new Phase 1 multi-signal
detection system to find highlights in a football match video.

Usage:
    python example_multi_signal_detection.py <video_path> [--config config.yaml]

Example:
    python example_multi_signal_detection.py in/match.mp4
    python example_multi_signal_detection.py in/match.mp4 --config config.yaml

Part of Phase 1: Multi-Signal Event Detection
Created: 2025-11-03
"""

import argparse
import yaml
from pathlib import Path

# Import our new detection modules
from detect_audio import detect_audio_spikes, detect_whistle_tones, detect_commentary_keywords
from detect_flow import detect_flow_bursts, detect_scene_cuts
from detect_fusion import SignalFusion


def load_config(config_path: str = 'config.yaml') -> dict:
    """Load configuration from YAML file."""
    try:
        with open(config_path, 'r') as f:
            return yaml.safe_load(f)
    except FileNotFoundError:
        print(f"⚠️  Config file not found: {config_path}")
        print("   Using default configuration")
        return {}


def run_multi_signal_detection(video_path: str, config: dict = None):
    """
    Run complete multi-signal detection pipeline.

    Args:
        video_path: Path to video file
        config: Configuration dictionary (from config.yaml)
    """
    print("\n" + "=" * 70)
    print("🎬 MULTI-SIGNAL EVENT DETECTION")
    print("=" * 70)
    print(f"\n📹 Video: {video_path}")
    print(f"⚙️  Config: {config is not None}\n")

    # Get multi-signal config
    ms_config = config.get('detection', {}).get('multi_signal', {}) if config else {}

    # Check if multi-signal is enabled
    if not ms_config.get('enabled', True):
        print("⚠️  Multi-signal detection is disabled in config")
        return

    # Initialize signals dictionary
    signals = {}

    # ========================================================================
    # STEP 1: Audio Energy Detection
    # ========================================================================
    if ms_config.get('audio', {}).get('enabled', True):
        print("\n" + "-" * 70)
        print("1️⃣  AUDIO ENERGY DETECTION")
        print("-" * 70)

        audio_threshold = ms_config.get('audio', {}).get('threshold', 0.75)
        audio_min_dur = ms_config.get('audio', {}).get('min_duration', 1.0)

        signals['audio'] = detect_audio_spikes(
            video_path,
            threshold=audio_threshold,
            min_duration=audio_min_dur
        )

        print(f"\n   ✅ Found {len(signals['audio'])} audio spikes")
        if signals['audio']:
            print("\n   Top 5 audio spikes:")
            for i, spike in enumerate(signals['audio'][:5], 1):
                print(f"      {i}. {spike['timestamp']:.1f}s - Energy: {spike['energy']:.2f}")

    # ========================================================================
    # STEP 2: Whistle Detection
    # ========================================================================
    if ms_config.get('whistle', {}).get('enabled', True):
        print("\n" + "-" * 70)
        print("2️⃣  WHISTLE DETECTION")
        print("-" * 70)

        whistle_freq = tuple(ms_config.get('whistle', {}).get('freq_range', [3500, 4500]))
        whistle_threshold = ms_config.get('whistle', {}).get('threshold', 0.7)

        signals['whistle'] = detect_whistle_tones(
            video_path,
            freq_range=whistle_freq,
            threshold=whistle_threshold
        )

        print(f"\n   ✅ Found {len(signals['whistle'])} whistle tones")
        if signals['whistle']:
            print("\n   Top 5 whistles:")
            for i, whistle in enumerate(signals['whistle'][:5], 1):
                print(f"      {i}. {whistle['timestamp']:.1f}s - Confidence: {whistle['confidence']:.2f}")

    # ========================================================================
    # STEP 3: Optical Flow Detection
    # ========================================================================
    if ms_config.get('flow', {}).get('enabled', True):
        print("\n" + "-" * 70)
        print("3️⃣  OPTICAL FLOW DETECTION")
        print("-" * 70)

        flow_roi = ms_config.get('flow', {}).get('roi', 'goal_area')
        flow_threshold = ms_config.get('flow', {}).get('threshold', 2.5)
        flow_sample_rate = ms_config.get('flow', {}).get('sample_rate', 2)

        signals['flow'] = detect_flow_bursts(
            video_path,
            roi=flow_roi,
            threshold=flow_threshold,
            sample_rate=flow_sample_rate
        )

        print(f"\n   ✅ Found {len(signals['flow'])} flow bursts")
        if signals['flow']:
            print("\n   Top 5 flow bursts:")
            for i, burst in enumerate(signals['flow'][:5], 1):
                print(f"      {i}. {burst['timestamp']:.1f}s - Magnitude: {burst['magnitude']:.2f}")

    # ========================================================================
    # STEP 4: Scene Cut Detection
    # ========================================================================
    if ms_config.get('scene_cut', {}).get('enabled', True):
        print("\n" + "-" * 70)
        print("4️⃣  SCENE CUT DETECTION")
        print("-" * 70)

        cut_threshold = ms_config.get('scene_cut', {}).get('threshold', 30.0)
        cut_sample_rate = ms_config.get('scene_cut', {}).get('sample_rate', 1)

        signals['scene_cut'] = detect_scene_cuts(
            video_path,
            threshold=cut_threshold,
            sample_rate=cut_sample_rate
        )

        print(f"\n   ✅ Found {len(signals['scene_cut'])} scene cuts")
        if signals['scene_cut']:
            print("\n   Top 5 scene cuts:")
            for i, cut in enumerate(signals['scene_cut'][:5], 1):
                print(f"      {i}. {cut['timestamp']:.1f}s - Difference: {cut['difference']:.2f}")

    # ========================================================================
    # STEP 5: Commentary Detection (Optional)
    # ========================================================================
    if ms_config.get('commentary', {}).get('enabled', False):
        print("\n" + "-" * 70)
        print("5️⃣  COMMENTARY KEYWORD DETECTION (Optional)")
        print("-" * 70)

        commentary_model = ms_config.get('commentary', {}).get('model', 'tiny')
        commentary_keywords = ms_config.get('commentary', {}).get('keywords', [])

        signals['commentary'] = detect_commentary_keywords(
            video_path,
            keywords=commentary_keywords if commentary_keywords else None,
            model=commentary_model
        )

        print(f"\n   ✅ Found {len(signals['commentary'])} keyword mentions")
        if signals['commentary']:
            print("\n   Top 5 keywords:")
            for i, kw in enumerate(signals['commentary'][:5], 1):
                print(f"      {i}. {kw['timestamp']:.1f}s - '{kw['keyword']}'")

    # ========================================================================
    # STEP 6: Signal Fusion
    # ========================================================================
    print("\n" + "=" * 70)
    print("🔗 SIGNAL FUSION")
    print("=" * 70)

    # Create fusion engine with config
    fusion_config = {
        'detection': ms_config
    }
    fusion = SignalFusion(fusion_config)

    # Fuse all signals
    fused_events = fusion.fuse_signals(signals)

    print(f"\n   ✅ Created {len(fused_events)} fused events")

    # ========================================================================
    # STEP 7: Rank Events
    # ========================================================================
    print("\n" + "-" * 70)
    print("📊 EVENT RANKING")
    print("-" * 70)

    ranked_events = fusion.rank_events(fused_events, top_k=20)

    print(f"\n   ✅ Ranked top 20 events\n")
    print("   Top 10 highlights:\n")

    for event in ranked_events[:10]:
        summary = fusion.generate_event_summary(event)
        print(f"      {event['rank']:2d}. {summary}")

    # ========================================================================
    # STEP 8: Merge Nearby Events
    # ========================================================================
    print("\n" + "-" * 70)
    print("🔀 MERGING NEARBY EVENTS")
    print("-" * 70)

    merge_window = 3.0  # 3 seconds
    merged_events = fusion.merge_nearby_events(ranked_events, time_window=merge_window)

    print(f"\n   ✅ Merged {len(ranked_events)} events → {len(merged_events)} events")
    print(f"      (removed {len(ranked_events) - len(merged_events)} duplicates within {merge_window}s)")

    # ========================================================================
    # STEP 9: Export to JSON Format
    # ========================================================================
    print("\n" + "-" * 70)
    print("💾 EXPORT TO JSON FORMAT")
    print("-" * 70)

    json_events = fusion.export_to_json_events(merged_events[:15])

    print(f"\n   ✅ Exported top 15 events to JSON format\n")
    print("   Sample events:\n")

    for i, event in enumerate(json_events[:5], 1):
        print(f"      {i}. {event['minute']:2d}min - {event['type']:12s} (confidence: {event['confidence']:.2f})")

    # ========================================================================
    # SUMMARY
    # ========================================================================
    print("\n" + "=" * 70)
    print("📋 SUMMARY")
    print("=" * 70)

    total_signals = sum(len(s) for s in signals.values())

    print(f"""
   Signal Counts:
   ├─ Audio Spikes:     {len(signals.get('audio', [])):3d}
   ├─ Whistle Tones:    {len(signals.get('whistle', [])):3d}
   ├─ Flow Bursts:      {len(signals.get('flow', [])):3d}
   ├─ Scene Cuts:       {len(signals.get('scene_cut', [])):3d}
   └─ Commentary:       {len(signals.get('commentary', [])):3d}
   ─────────────────────────
   Total Signals:       {total_signals:3d}

   Processing Results:
   ├─ Fused Events:     {len(fused_events):3d}
   ├─ Top Ranked:       {min(20, len(ranked_events)):3d}
   ├─ After Merging:    {len(merged_events):3d}
   └─ JSON Export:      {len(json_events):3d}

   ✅ Multi-signal detection complete!
   """)

    # Return results for further processing
    return {
        'signals': signals,
        'fused': fused_events,
        'ranked': ranked_events,
        'merged': merged_events,
        'json_events': json_events
    }


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description='Multi-Signal Event Detection for Football Highlights',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python example_multi_signal_detection.py in/match.mp4
  python example_multi_signal_detection.py in/match.mp4 --config config.yaml

This script demonstrates Phase 1 multi-signal detection, combining:
- Audio energy spikes (crowd reactions)
- Whistle detection (referee signals)
- Optical flow (movement bursts)
- Scene cuts (production switches)
- Commentary keywords (optional, requires Whisper)
        """
    )

    parser.add_argument('video', help='Path to video file')
    parser.add_argument('--config', default='config.yaml', help='Path to config file (default: config.yaml)')

    args = parser.parse_args()

    # Check if video exists
    if not Path(args.video).exists():
        print(f"❌ Error: Video file not found: {args.video}")
        return 1

    # Load configuration
    config = load_config(args.config)

    # Run detection
    try:
        results = run_multi_signal_detection(args.video, config)
        print("\n✅ Detection complete! Results stored in 'results' dictionary\n")
        return 0
    except Exception as e:
        print(f"\n❌ Error during detection: {e}")
        import traceback
        traceback.print_exc()
        return 1


if __name__ == '__main__':
    exit(main())

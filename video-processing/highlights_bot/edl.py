"""
EDL (Edit Decision List) module for processing guided events and auto-detected candidates
Handles loading, validation, absolute timestamp computation, merging, ranking, and adaptive padding
"""

import json
from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass, field
from copy import deepcopy
import numpy as np

from util import TimeCodeUtils, ValidationUtils, HighlightsLogger

@dataclass
class Event:
    """Represents a single event (guided or auto-detected)"""
    type: str
    abs_ts: float
    half: Optional[int] = None
    clock: Optional[str] = None
    team: Optional[str] = None
    player: Optional[str] = None
    assist: Optional[str] = None
    score: Optional[Dict[str, int]] = None
    notes: Optional[str] = None
    status: Optional[str] = None
    confidence: float = 1.0
    signals: List[str] = field(default_factory=list)
    source: str = "guided"  # "guided" or "auto"

    # Computed fields
    pre_padding: float = 0.0
    post_padding: float = 0.0
    zoom_enabled: bool = False
    replay_enabled: bool = False

class EDLProcessor:
    """Processes and manages Edit Decision Lists"""

    def __init__(self, config: Dict, logger: HighlightsLogger):
        self.config = config
        self.logger = logger
        self.events: List[Event] = []
        self.kickoff_time: Optional[float] = None
        self.half_time_marker: Optional[float] = None
        self.full_time_marker: Optional[float] = None

    def load_guided_events(self, events_path: str) -> bool:
        """Load and validate guided events from JSON file"""
        try:
            with open(events_path, 'r') as f:
                data = json.load(f)

            events_list = data if isinstance(data, list) else data.get('events', [])

            # Validate events
            valid, errors = ValidationUtils.validate_events_file(events_list)
            if not valid:
                for error in errors:
                    self.logger.log_error(f"Event validation error: {error}")
                return False

            # Process each event
            guided_events = []
            for event_data in events_list:
                event = self._create_event_from_data(event_data, source="guided")
                if event:
                    guided_events.append(event)

                    # Track status markers
                    if event_data.get('status') == 'HT':
                        self.half_time_marker = event.abs_ts
                    elif event_data.get('status') == 'FT':
                        self.full_time_marker = event.abs_ts

            self.events.extend(guided_events)
            self.logger.get_logger().info(f"Loaded {len(guided_events)} guided events")
            return True

        except Exception as e:
            self.logger.log_error(f"Failed to load guided events: {str(e)}")
            return False

    def _create_event_from_data(self, data: Dict, source: str = "guided") -> Optional[Event]:
        """Create Event object from dictionary data"""
        try:
            # Compute absolute timestamp if not provided
            abs_ts = data.get('abs_ts')
            if abs_ts:
                abs_ts = TimeCodeUtils.parse_timestamp(abs_ts)
            else:
                # Compute from half, clock, and kickoff time
                if self.kickoff_time is not None and 'half' in data and 'clock' in data:
                    abs_ts = TimeCodeUtils.compute_absolute_time(
                        data['half'],
                        data['clock'],
                        self.kickoff_time
                    )
                else:
                    self.logger.get_logger().warning(f"Cannot compute abs_ts for event: {data}")
                    return None

            # Parse score
            score = data.get('score')
            if isinstance(score, str):
                try:
                    # Parse "2-1" format
                    parts = score.split('-')
                    score = {"home": int(parts[0]), "away": int(parts[1])}
                except:
                    score = None

            return Event(
                type=data['type'],
                abs_ts=abs_ts,
                half=data.get('half'),
                clock=data.get('clock'),
                team=data.get('team'),
                player=data.get('player'),
                assist=data.get('assist'),
                score=score,
                notes=data.get('notes'),
                status=data.get('status'),
                confidence=data.get('confidence', 1.0),
                signals=data.get('signals', []),
                source=source
            )

        except Exception as e:
            self.logger.log_error(f"Failed to create event from data: {str(e)}", {"data": data})
            return None

    def set_kickoff_time(self, kickoff_ts: float):
        """Set the kickoff time for absolute timestamp computation"""
        self.kickoff_time = kickoff_ts

        # Recompute absolute timestamps for events that don't have them
        for event in self.events:
            if event.source == "guided" and event.half and event.clock:
                event.abs_ts = TimeCodeUtils.compute_absolute_time(
                    event.half, event.clock, kickoff_ts
                )

    def add_auto_detected_events(self, candidates: List[Dict]):
        """Add auto-detected event candidates"""
        auto_events = []
        for candidate in candidates:
            event = self._create_event_from_data(candidate, source="auto")
            if event:
                auto_events.append(event)

        self.events.extend(auto_events)
        self.logger.get_logger().info(f"Added {len(auto_events)} auto-detected candidates")

    def merge_and_dedupe(self) -> List[Event]:
        """Merge guided and auto-detected events with deduplication"""
        dedupe_window = self.config['detection']['dedupe_window_s']

        # Separate guided and auto events
        guided = [e for e in self.events if e.source == "guided"]
        auto = [e for e in self.events if e.source == "auto"]

        # Find duplicates and resolve conflicts
        final_events = guided.copy()

        for auto_event in auto:
            # Check if this auto event conflicts with any guided event
            conflict_found = False

            for guided_event in guided:
                time_diff = abs(auto_event.abs_ts - guided_event.abs_ts)

                # Same event type within dedupe window
                if (self._events_similar(auto_event, guided_event) and
                    time_diff <= dedupe_window):

                    conflict_found = True

                    # Keep auto event only if significantly higher confidence
                    if auto_event.confidence >= guided_event.confidence + 0.15:
                        self.logger.get_logger().info(
                            f"Auto event replaces guided: {auto_event.type} at "
                            f"{TimeCodeUtils.seconds_to_timestamp(auto_event.abs_ts)}"
                        )
                        final_events.remove(guided_event)
                        final_events.append(auto_event)

                    break

            # Add auto event if no conflict found
            if not conflict_found:
                final_events.append(auto_event)
                self.logger.get_logger().info(
                    f"Auto event added: {auto_event.type} at "
                    f"{TimeCodeUtils.seconds_to_timestamp(auto_event.abs_ts)}"
                )

        # Sort by timestamp
        final_events.sort(key=lambda e: e.abs_ts)

        # Apply limits
        max_clips = self.config['limits']['max_clips']
        if len(final_events) > max_clips:
            # Rank events and keep top ones
            final_events = self._rank_events(final_events)[:max_clips]
            self.logger.get_logger().info(f"Limited to {max_clips} clips")

        self.events = final_events
        return final_events

    def _events_similar(self, event1: Event, event2: Event) -> bool:
        """Check if two events are similar enough to be considered duplicates"""
        # Same type
        if event1.type == event2.type:
            return True

        # Related types
        related_types = [
            {'goal', 'goal_like'},
            {'big_save', 'save'},
            {'chance', 'goal_like'},
            {'foul', 'card'},
        ]

        for related_set in related_types:
            if event1.type in related_set and event2.type in related_set:
                return True

        return False

    def _rank_events(self, events: List[Event]) -> List[Event]:
        """Rank events by importance"""
        # Define priority scores
        priority_scores = {
            'goal': 10,
            'goal_like': 9,
            'big_save': 8,
            'save': 7,
            'chance': 6,
            'card': 5,
            'foul': 4,
            'celebration': 3
        }

        # Sort by priority score, then confidence, then timestamp
        return sorted(events, key=lambda e: (
            -priority_scores.get(e.type, 0),  # Higher priority first
            -e.confidence,                     # Higher confidence first
            e.abs_ts                          # Earlier events first for same priority
        ))

    def compute_adaptive_padding(self) -> List[Event]:
        """Compute adaptive padding for each event based on context"""
        padding_config = self.config['padding']

        for event in self.events:
            # Start with default padding
            base_padding = padding_config['default']
            pre_padding = base_padding['pre']
            post_padding = base_padding['post']

            # Event-specific adjustments
            event_type = event.type

            if event_type == 'goal':
                goal_config = padding_config.get('goal', {})

                # Check for build-up signals
                if 'build_up' in event.signals or 'attack' in event.signals:
                    pre_padding += goal_config.get('pre_bonus_on_attack', 0)

                # Check for celebration signals
                if 'celebration' in event.signals:
                    post_padding += goal_config.get('post_bonus_on_celebration', 0)

            elif event_type in ['big_save', 'save']:
                save_config = padding_config.get('save', {})
                pre_padding = save_config.get('pre', pre_padding)
                post_padding = save_config.get('post', post_padding)

            elif event_type == 'chance':
                chance_config = padding_config.get('chance', {})
                pre_padding = chance_config.get('pre', pre_padding)
                post_padding = chance_config.get('post', post_padding)

            elif event_type in ['foul', 'card']:
                foul_config = padding_config.get('foul_or_card', {})
                pre_padding = foul_config.get('pre', pre_padding)
                post_padding = foul_config.get('post', post_padding)

            # Apply limits
            max_pre = padding_config.get('max_pre', 15)
            max_post = padding_config.get('max_post', 25)

            event.pre_padding = min(pre_padding, max_pre)
            event.post_padding = min(post_padding, max_post)

            # Log padding decision
            self.logger.log_clip_plan({
                'type': event.type,
                'abs_ts': TimeCodeUtils.seconds_to_timestamp(event.abs_ts),
                'pre_padding': event.pre_padding,
                'post_padding': event.post_padding,
                'total_duration': event.pre_padding + event.post_padding,
                'signals': event.signals
            })

        return self.events

    def apply_feature_flags(self) -> List[Event]:
        """Apply zoom and replay feature flags based on config"""
        zoom_config = self.config.get('zoom', {})
        replay_config = self.config.get('replay', {})

        for event in self.events:
            # Enable zoom based on config
            event.zoom_enabled = zoom_config.get('enable', True)

            # Enable replay for specific event types
            replay_types = replay_config.get('enable_for', [])
            event.replay_enabled = event.type in replay_types

        return self.events

    def validate_clip_durations(self) -> List[Event]:
        """Validate and adjust clip durations to meet limits"""
        limits = self.config.get('limits', {})
        min_duration = limits.get('min_clip_len_s', 6)
        max_duration = limits.get('max_clip_len_s', 30)

        valid_events = []

        for event in self.events:
            total_duration = event.pre_padding + event.post_padding

            if total_duration < min_duration:
                # Extend post padding to meet minimum
                additional = min_duration - total_duration
                event.post_padding += additional
                self.logger.get_logger().info(
                    f"Extended clip duration for {event.type} to meet minimum ({min_duration}s)"
                )

            elif total_duration > max_duration:
                # Reduce padding proportionally to meet maximum
                scale = max_duration / total_duration
                event.pre_padding *= scale
                event.post_padding *= scale
                self.logger.get_logger().info(
                    f"Reduced clip duration for {event.type} to meet maximum ({max_duration}s)"
                )

            valid_events.append(event)

        self.events = valid_events
        return valid_events

    def get_processed_events(self) -> List[Event]:
        """Get the final processed events list"""
        return self.events

    def export_manifest_data(self) -> List[Dict]:
        """Export events in format suitable for manifest.json"""
        manifest_events = []

        for event in self.events:
            manifest_event = {
                'type': event.type,
                'timestamp': TimeCodeUtils.seconds_to_timestamp(event.abs_ts),
                'duration': event.pre_padding + event.post_padding,
                'team': event.team,
                'player': event.player,
                'assist': event.assist,
                'score': event.score,
                'notes': event.notes,
                'confidence': event.confidence,
                'source': event.source,
                'zoom_enabled': event.zoom_enabled,
                'replay_enabled': event.replay_enabled
            }
            manifest_events.append(manifest_event)

        return manifest_events

class EDLUtils:
    """Utility functions for EDL processing"""

    @staticmethod
    def generate_sample_events() -> List[Dict]:
        """Generate sample events for testing"""
        return [
            {
                "type": "goal",
                "half": 1,
                "clock": "23:45",
                "team": "Syston",
                "player": "John Doe",
                "assist": "Jane Smith",
                "score": {"home": 1, "away": 0},
                "notes": "Great strike from outside the box"
            },
            {
                "type": "big_save",
                "half": 1,
                "clock": "34:12",
                "team": "Syston",
                "player": "Keeper Name",
                "notes": "Point blank save from corner"
            },
            {
                "type": "card",
                "half": 2,
                "clock": "67:30",
                "team": "Opposition",
                "player": "Opposition Player",
                "notes": "Yellow card for dissent"
            }
        ]

    @staticmethod
    def validate_timing_consistency(events: List[Event], video_duration: float) -> List[str]:
        """Validate that all events fall within video duration"""
        warnings = []

        for event in events:
            if event.abs_ts < 0:
                warnings.append(f"Event {event.type} has negative timestamp: {event.abs_ts}")

            if event.abs_ts > video_duration:
                warnings.append(f"Event {event.type} exceeds video duration: {event.abs_ts} > {video_duration}")

            # Check clip boundaries
            clip_start = event.abs_ts - event.pre_padding
            clip_end = event.abs_ts + event.post_padding

            if clip_start < 0:
                warnings.append(f"Event {event.type} clip starts before video: {clip_start}")

            if clip_end > video_duration:
                warnings.append(f"Event {event.type} clip ends after video: {clip_end}")

        return warnings
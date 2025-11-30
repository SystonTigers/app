#!/usr/bin/env python3
"""
AI Mistake Detection Module - Analyzes football match footage for coaching opportunities

Uses Google Gemini 2.0 Flash to detect defensive errors, poor passing, positioning issues,
and other coaching opportunities in match footage.
"""

import os
import json
from pathlib import Path
from typing import List, Dict, Any, Optional
from google import genai
from google.genai import types


class MistakeDetector:
    """Detects tactical mistakes and coaching opportunities using Gemini AI."""

    MISTAKE_CATEGORIES = {
        "poor_passing": "Poor Passing & Ball Control",
        "defensive_errors": "Defensive Positioning & Marking",
        "transition_errors": "Transition Play & Recovery",
        "set_piece_mistakes": "Set Piece Organization",
        "positioning_issues": "Team Shape & Spacing"
    }

    def __init__(self, api_key: Optional[str] = None):
        """Initialize Gemini AI client."""
        self.api_key = api_key or os.getenv('GEMINI_API_KEY')
        if not self.api_key:
            raise ValueError("GEMINI_API_KEY environment variable not set")

        self.client = genai.Client(api_key=self.api_key)
        self.model = 'models/gemini-2.5-flash'

    def analyze_video(
        self,
        video_path: str,
        team_name: str,
        opponent_name: str,
        context: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        """
        Analyze full match video for coaching opportunities.

        Args:
            video_path: Path to video file or URL
            team_name: Name of the team to analyze
            opponent_name: Name of the opposing team
            context: Optional context (match result, goals conceded, etc.)

        Returns:
            List of detected mistakes with timestamps and analysis
        """
        print(f"🔍 Analyzing video for {team_name} coaching opportunities...")

        # Upload video file
        if video_path.startswith(('http://', 'https://')):
            # YouTube URL
            file_ref = types.FileData(file_uri=video_path)
        else:
            # Local file - upload to Gemini
            myfile = self.client.files.upload(file=video_path)
            file_ref = myfile

        # Create analysis prompt
        prompt = self._create_analysis_prompt(team_name, opponent_name, context)

        # Generate analysis
        response = self.client.models.generate_content(
            model=self.model,
            contents=[file_ref, prompt]
        )

        # Parse response
        mistakes = self._parse_gemini_response(response.text)

        print(f"✅ Found {len(mistakes)} coaching opportunities")
        return mistakes

    def analyze_clip(
        self,
        video_path: str,
        start_time: float,
        end_time: float,
        team_name: str,
        suspected_issue: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Analyze a specific clip for detailed coaching feedback.

        Args:
            video_path: Path to video file
            start_time: Clip start time in seconds
            end_time: Clip end time in seconds
            team_name: Team being analyzed
            suspected_issue: Optional hint about the issue type

        Returns:
            Detailed analysis with root cause and training recommendations
        """
        print(f"🔍 Analyzing clip {start_time}s - {end_time}s...")

        # Upload video with metadata for clipping
        myfile = self.client.files.upload(file=video_path)

        prompt = self._create_clip_analysis_prompt(
            team_name,
            start_time,
            end_time,
            suspected_issue
        )

        response = self.client.models.generate_content(
            model=self.model,
            contents=types.Content(
                parts=[
                    types.Part(file_data=myfile),
                    types.Part(
                        video_metadata=types.VideoMetadata(
                            start_offset=f"{int(start_time)}s",
                            end_offset=f"{int(end_time)}s"
                        )
                    ),
                    types.Part(text=prompt)
                ]
            )
        )

        analysis = self._parse_clip_analysis(response.text)
        return analysis

    def _create_analysis_prompt(
        self,
        team_name: str,
        opponent_name: str,
        context: Optional[Dict[str, Any]]
    ) -> str:
        """Create the AI prompt for full match analysis."""

        context_info = ""
        if context:
            goals_conceded = context.get('goals_conceded', 0)
            final_score = context.get('final_score', 'Unknown')
            context_info = f"""
Match Context:
- Final Score: {final_score}
- Goals Conceded: {goals_conceded}
- Match Type: {context.get('competition', 'League')}
"""

        return f"""You are an experienced football/soccer coach analyzing match footage for {team_name} vs {opponent_name}.

{context_info}

Your task is to identify COACHING OPPORTUNITIES - moments where the team could improve. Focus on:

1. **Defensive Errors**:
   - Players out of position
   - Poor marking (players left unmarked)
   - Wrong positioning during opponent attacks
   - Slow recovery runs
   - Failed challenges/tackles

2. **Poor Passing & Ball Control**:
   - Interceptions due to poor decision-making
   - Give-aways in dangerous areas
   - Passing under pressure failures
   - Heavy touches leading to turnovers

3. **Transition Errors**:
   - Slow transitions from defense to attack
   - Ball-watching during opponent counters
   - Not tracking back after losing possession

4. **Set Piece Mistakes**:
   - Poor corner kick marking
   - Free kick wall positioning errors
   - Throw-in turnovers

5. **Positioning & Shape Issues**:
   - Team out of formation
   - Poor spacing between players
   - Not tracking opponent runners

For each mistake you identify, provide:
- **Timestamp** (MM:SS format)
- **Category** (one of: poor_passing, defensive_errors, transition_errors, set_piece_mistakes, positioning_issues)
- **Description** (1-2 sentences: what happened)
- **Impact** (Low/Medium/High: how critical was this?)
- **Players Involved** (shirt numbers or positions if visible)

Return your analysis as a JSON array:
```json
[
  {{
    "timestamp": "12:34",
    "category": "defensive_errors",
    "description": "Center back left striker unmarked in the box during corner kick",
    "impact": "High",
    "players_involved": ["#5 Center Back", "#3 Right Back"]
  }}
]
```

Analyze the ENTIRE match systematically. Look for patterns. Focus on mistakes that led to goals conceded or dangerous chances for the opponent.

Return ONLY valid JSON - no additional text before or after."""

    def _create_clip_analysis_prompt(
        self,
        team_name: str,
        start_time: float,
        end_time: float,
        suspected_issue: Optional[str]
    ) -> str:
        """Create detailed analysis prompt for a specific clip."""

        issue_hint = ""
        if suspected_issue:
            issue_hint = f"\nThis clip is suspected to show: {suspected_issue}"

        return f"""You are an experienced football coach analyzing a specific moment from {team_name}'s match.

Clip Duration: {start_time}s to {end_time}s ({end_time - start_time:.1f} seconds){issue_hint}

Provide a detailed coaching analysis:

1. **What Happened**: Describe the sequence of events (2-3 sentences)

2. **Root Cause**: Why did this mistake occur? Consider:
   - Lack of awareness?
   - Poor communication?
   - Technical ability issue?
   - Tactical understanding gap?
   - Physical/fatigue factor?

3. **Key Learning Points**: What should players understand? (3-4 bullet points)

4. **Who Needs Coaching**: Which positions/players need to work on this?

Return your analysis as JSON:
```json
{{
  "what_happened": "Description of the play...",
  "root_cause": "The main reason this error occurred...",
  "learning_points": [
    "Point 1...",
    "Point 2...",
    "Point 3..."
  ],
  "players_to_coach": ["Position 1", "Position 2"],
  "mistake_category": "defensive_errors",
  "severity": "High"
}}
```

Be specific and actionable. Think like a coach preparing for the next training session.

Return ONLY valid JSON."""

    def _parse_gemini_response(self, response_text: str) -> List[Dict[str, Any]]:
        """Parse Gemini's JSON response for full match analysis."""
        try:
            # Extract JSON from response (may have markdown code blocks)
            json_str = response_text.strip()

            # Remove markdown code blocks if present
            if json_str.startswith('```json'):
                json_str = json_str[7:]  # Remove ```json
            if json_str.startswith('```'):
                json_str = json_str[3:]  # Remove ```
            if json_str.endswith('```'):
                json_str = json_str[:-3]  # Remove trailing ```

            json_str = json_str.strip()

            mistakes = json.loads(json_str)

            # Convert MM:SS timestamps to seconds
            for mistake in mistakes:
                if 'timestamp' in mistake:
                    timestamp_str = mistake['timestamp']
                    if ':' in timestamp_str:
                        parts = timestamp_str.split(':')
                        minutes = int(parts[0])
                        seconds = int(parts[1])
                        mistake['timestamp_seconds'] = minutes * 60 + seconds

            return mistakes

        except json.JSONDecodeError as e:
            print(f"❌ Failed to parse Gemini response as JSON: {e}")
            print(f"Response was: {response_text[:500]}...")
            return []

    def _parse_clip_analysis(self, response_text: str) -> Dict[str, Any]:
        """Parse Gemini's JSON response for clip analysis."""
        try:
            # Extract JSON from response
            json_str = response_text.strip()

            # Remove markdown code blocks if present
            if json_str.startswith('```json'):
                json_str = json_str[7:]
            if json_str.startswith('```'):
                json_str = json_str[3:]
            if json_str.endswith('```'):
                json_str = json_str[:-3]

            json_str = json_str.strip()

            analysis = json.loads(json_str)
            return analysis

        except json.JSONDecodeError as e:
            print(f"❌ Failed to parse clip analysis: {e}")
            print(f"Response was: {response_text[:500]}...")
            return {
                "what_happened": "Error parsing analysis",
                "root_cause": "Unknown",
                "learning_points": [],
                "players_to_coach": [],
                "mistake_category": "unknown",
                "severity": "Unknown"
            }

    def save_analysis(self, mistakes: List[Dict[str, Any]], output_path: str):
        """Save mistake analysis to JSON file."""
        with open(output_path, 'w') as f:
            json.dump({
                "total_mistakes": len(mistakes),
                "categories": self._summarize_categories(mistakes),
                "mistakes": mistakes
            }, f, indent=2)

        print(f"💾 Analysis saved to {output_path}")

    def _summarize_categories(self, mistakes: List[Dict[str, Any]]) -> Dict[str, int]:
        """Summarize mistakes by category."""
        summary = {}
        for mistake in mistakes:
            category = mistake.get('category', 'unknown')
            summary[category] = summary.get(category, 0) + 1
        return summary


def main():
    """Example usage."""
    import argparse

    parser = argparse.ArgumentParser(description='Detect coaching opportunities in match footage')
    parser.add_argument('--video', required=True, help='Path to video file')
    parser.add_argument('--team', required=True, help='Team name to analyze')
    parser.add_argument('--opponent', required=True, help='Opponent team name')
    parser.add_argument('--output', default='mistakes_analysis.json', help='Output JSON file')
    parser.add_argument('--goals-conceded', type=int, help='Number of goals conceded')
    parser.add_argument('--score', help='Final score (e.g., "2-3")')

    args = parser.parse_args()

    # Create detector
    detector = MistakeDetector()

    # Prepare context
    context = {}
    if args.goals_conceded is not None:
        context['goals_conceded'] = args.goals_conceded
    if args.score:
        context['final_score'] = args.score

    # Analyze video
    mistakes = detector.analyze_video(
        args.video,
        args.team,
        args.opponent,
        context
    )

    # Save results
    detector.save_analysis(mistakes, args.output)

    # Print summary
    print(f"\n📊 Analysis Summary:")
    print(f"Total mistakes found: {len(mistakes)}")

    categories = detector._summarize_categories(mistakes)
    for category, count in categories.items():
        print(f"  - {MistakeDetector.MISTAKE_CATEGORIES.get(category, category)}: {count}")


if __name__ == '__main__':
    main()

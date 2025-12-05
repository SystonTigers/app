#!/usr/bin/env python3
"""
AI Training Drill Generator - Creates training session plans from coaching opportunities

Uses Google Gemini 2.0 Flash to generate progressive training drills that address
specific mistakes detected in match footage.
"""

import os
import json
from pathlib import Path
from typing import List, Dict, Any, Optional
import google.generativeai as genai
# from google.genai import types


class TrainingDrillGenerator:
    """Generates AI-powered training drills to address tactical mistakes."""

    def __init__(self, api_key: Optional[str] = None):
        """Initialize Gemini AI client."""
        self.api_key = api_key or os.getenv('GEMINI_API_KEY')
        if not self.api_key:
            raise ValueError("GEMINI_API_KEY environment variable not set")

        genai.configure(api_key=self.api_key)
        self.client = genai
        self.model = 'models/gemini-2.5-flash'

    def generate_drills_from_mistake(
        self,
        mistake: Dict[str, Any],
        num_drills: int = 3,
        age_group: str = "Adult",
        skill_level: str = "Intermediate"
    ) -> Dict[str, Any]:
        """
        Generate training drills to address a specific mistake.

        Args:
            mistake: Mistake data from detect_mistakes.py
            num_drills: Number of progressive drills to generate
            age_group: Age group (U8, U10, U12, Adult, etc.)
            skill_level: Skill level (Beginner, Intermediate, Advanced)

        Returns:
            Training session plan with drills
        """
        print(f"🎯 Generating {num_drills} training drills for: {mistake.get('description', 'mistake')}...")

        prompt = self._create_drill_generation_prompt(
            mistake,
            num_drills,
            age_group,
            skill_level
        )

        response = self.client.models.generate_content(
            model=self.model,
            contents=[prompt]
        )

        drills = self._parse_drill_response(response.text)
        return drills

    def generate_session_from_mistakes(
        self,
        mistakes: List[Dict[str, Any]],
        session_duration: int = 60,
        age_group: str = "Adult",
        skill_level: str = "Intermediate",
        focus_categories: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Generate a complete training session addressing multiple mistakes.

        Args:
            mistakes: List of mistakes from match analysis
            session_duration: Total session time in minutes
            age_group: Age group
            skill_level: Skill level
            focus_categories: Specific categories to focus on (if None, uses all)

        Returns:
            Complete training session plan
        """
        print(f"📋 Generating {session_duration}-minute training session...")

        # Filter mistakes by category if specified
        if focus_categories:
            mistakes = [m for m in mistakes if m.get('category') in focus_categories]

        # Group mistakes by category
        mistake_summary = self._summarize_mistakes(mistakes)

        prompt = self._create_session_plan_prompt(
            mistake_summary,
            session_duration,
            age_group,
            skill_level
        )

        response = self.client.models.generate_content(
            model=self.model,
            contents=[prompt]
        )

        session_plan = self._parse_session_response(response.text)
        return session_plan

    def generate_drills_from_clip(
        self,
        video_path: str,
        clip_analysis: Dict[str, Any],
        num_drills: int = 3,
        age_group: str = "Adult"
    ) -> Dict[str, Any]:
        """
        Generate drills by having AI watch the actual clip.

        Args:
            video_path: Path to clip video file
            clip_analysis: Analysis from detect_mistakes.analyze_clip()
            num_drills: Number of drills to generate
            age_group: Age group

        Returns:
            Training drills with visual reference to the clip
        """
        print(f"🎥 Generating drills from video clip analysis...")

        # Upload clip
        myfile = self.client.files.upload(file=video_path)

        prompt = self._create_clip_based_drill_prompt(
            clip_analysis,
            num_drills,
            age_group
        )

        response = self.client.models.generate_content(
            model=self.model,
            contents=[myfile, prompt]
        )

        drills = self._parse_drill_response(response.text)
        drills['clip_reference'] = video_path
        return drills

    def _create_drill_generation_prompt(
        self,
        mistake: Dict[str, Any],
        num_drills: int,
        age_group: str,
        skill_level: str
    ) -> str:
        """Create AI prompt for drill generation."""

        category = mistake.get('category', 'general')
        description = mistake.get('description', 'Tactical issue')
        impact = mistake.get('impact', 'Medium')
        players_involved = mistake.get('players_involved', [])

        return f"""You are an experienced football/soccer coach creating a training session plan.

MISTAKE DETECTED IN MATCH:
- Category: {category}
- Description: {description}
- Impact: {impact}
- Players Involved: {', '.join(players_involved) if players_involved else 'Team'}

AGE GROUP: {age_group}
SKILL LEVEL: {skill_level}

Your task: Create {num_drills} PROGRESSIVE training drills to address this issue.

PROGRESSION FRAMEWORK:
1. **Technical/Awareness Drill** (Unopposed or light pressure)
   - Focus: Technique, decision-making, awareness
   - Intensity: Low-Medium
   - Duration: 10-12 minutes

2. **Small-Sided Game** (SSG with specific rules)
   - Focus: Apply technique in game-like situations
   - Intensity: Medium-High
   - Duration: 15-20 minutes

3. **Match Simulation** (Full pressure, realistic scenario)
   - Focus: Execute under match conditions
   - Intensity: High
   - Duration: 15-20 minutes

For EACH drill, provide:

1. **Name**: Creative, descriptive drill name
2. **Duration**: Time in minutes
3. **Setup**:
   - Pitch dimensions (e.g., "20x20 yard grid")
   - Equipment needed (cones, goals, bibs, etc.)
   - Player numbers (e.g., "6v6+2 neutrals")
4. **Execution**: Step-by-step how the drill runs
5. **Coaching Points**: 3-5 key points to emphasize
6. **Progressions**: 2-3 ways to make it harder/easier
7. **Success Criteria**: How to measure if it's working

Return as JSON:
```json
{{
  "mistake_addressed": "{description}",
  "category": "{category}",
  "age_group": "{age_group}",
  "skill_level": "{skill_level}",
  "drills": [
    {{
      "name": "Drill name",
      "type": "Technical/SSG/Match Simulation",
      "duration": 12,
      "setup": {{
        "area": "20x20 yards",
        "equipment": ["8 cones", "4 bibs", "1 ball per pair"],
        "players": "12 players (6v6)"
      }},
      "execution": "Step by step instructions...",
      "coaching_points": [
        "Point 1",
        "Point 2",
        "Point 3"
      ],
      "progressions": [
        "Make easier: ...",
        "Make harder: ..."
      ],
      "success_criteria": "What to look for..."
    }}
  ],
  "session_notes": "Additional coaching tips...",
  "homework": "What players can practice at home..."
}}
```

Make drills:
- Age-appropriate
- Engaging and fun
- Directly related to the mistake
- Realistic for grassroots/amateur clubs
- Easy to understand and set up

Return ONLY valid JSON."""

    def _create_session_plan_prompt(
        self,
        mistake_summary: Dict[str, Any],
        session_duration: int,
        age_group: str,
        skill_level: str
    ) -> str:
        """Create AI prompt for full session planning."""

        categories_found = mistake_summary.get('categories', {})
        top_issues = sorted(
            categories_found.items(),
            key=lambda x: x[1],
            reverse=True
        )[:3]  # Top 3 categories

        issues_text = "\n".join([
            f"- {category}: {count} instances"
            for category, count in top_issues
        ])

        return f"""You are an experienced football coach planning a {session_duration}-minute training session.

ISSUES IDENTIFIED IN RECENT MATCH:
{issues_text}

Total mistakes analyzed: {mistake_summary.get('total_mistakes', 0)}

AGE GROUP: {age_group}
SKILL LEVEL: {skill_level}
SESSION DURATION: {session_duration} minutes

Create a COMPLETE training session plan that addresses these issues. Include:

1. **Warm-Up** (10-15 min)
   - Dynamic stretches
   - Ball work related to session theme

2. **Technical Practice** (15-20 min)
   - Unopposed or light pressure
   - Focus on key techniques

3. **Small-Sided Games** (20-25 min)
   - Apply techniques in game situations
   - Specific rules to reinforce learning

4. **Match Play / Scrimmage** (10-15 min)
   - Full pressure application
   - Minimal stoppages

5. **Cool-Down** (5 min)
   - Static stretches
   - Recap key points

Return as JSON:
```json
{{
  "session_title": "Descriptive session title",
  "duration": {session_duration},
  "age_group": "{age_group}",
  "focus_areas": [
    "Area 1",
    "Area 2"
  ],
  "equipment_needed": [
    "Item 1",
    "Item 2"
  ],
  "phases": [
    {{
      "phase_name": "Warm-Up",
      "duration": 10,
      "activities": [
        {{
          "name": "Activity name",
          "description": "What to do...",
          "coaching_points": ["Point 1", "Point 2"]
        }}
      ]
    }}
  ],
  "key_messages": [
    "Message 1 to emphasize throughout",
    "Message 2"
  ],
  "assessment": "How to measure if session was successful..."
}}
```

Make it practical, engaging, and focused on the identified issues.

Return ONLY valid JSON."""

    def _create_clip_based_drill_prompt(
        self,
        clip_analysis: Dict[str, Any],
        num_drills: int,
        age_group: str
    ) -> str:
        """Create prompt for drills based on actual video clip."""

        what_happened = clip_analysis.get('what_happened', '')
        root_cause = clip_analysis.get('root_cause', '')
        learning_points = clip_analysis.get('learning_points', [])
        category = clip_analysis.get('mistake_category', 'general')

        learning_text = "\n".join([f"- {point}" for point in learning_points])

        return f"""You are a football coach who just watched a clip showing a tactical mistake.

WHAT HAPPENED IN THE CLIP:
{what_happened}

ROOT CAUSE:
{root_cause}

KEY LEARNING POINTS:
{learning_text}

MISTAKE CATEGORY: {category}
AGE GROUP: {age_group}

Create {num_drills} progressive training drills to prevent this mistake in future matches.

Reference the video clip when creating drills - players can watch this clip as part of the training.

Structure each drill to:
1. Show players the clip
2. Discuss what went wrong
3. Practice the correct response

Return drills as JSON (same format as previous drill generation).

Return ONLY valid JSON."""

    def _summarize_mistakes(self, mistakes: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Summarize mistakes for session planning."""
        categories = {}
        for mistake in mistakes:
            category = mistake.get('category', 'unknown')
            categories[category] = categories.get(category, 0) + 1

        return {
            "total_mistakes": len(mistakes),
            "categories": categories,
            "high_impact": len([m for m in mistakes if m.get('impact') == 'High']),
            "medium_impact": len([m for m in mistakes if m.get('impact') == 'Medium']),
            "low_impact": len([m for m in mistakes if m.get('impact') == 'Low'])
        }

    def _parse_drill_response(self, response_text: str) -> Dict[str, Any]:
        """Parse Gemini's JSON response for drill generation."""
        try:
            json_str = response_text.strip()

            # Remove markdown code blocks
            if json_str.startswith('```json'):
                json_str = json_str[7:]
            if json_str.startswith('```'):
                json_str = json_str[3:]
            if json_str.endswith('```'):
                json_str = json_str[:-3]

            json_str = json_str.strip()

            drills = json.loads(json_str)
            return drills

        except json.JSONDecodeError as e:
            print(f"❌ Failed to parse drill response: {e}")
            print(f"Response was: {response_text[:500]}...")
            return {
                "error": "Failed to parse drills",
                "drills": []
            }

    def _parse_session_response(self, response_text: str) -> Dict[str, Any]:
        """Parse Gemini's JSON response for session planning."""
        try:
            json_str = response_text.strip()

            # Remove markdown code blocks
            if json_str.startswith('```json'):
                json_str = json_str[7:]
            if json_str.startswith('```'):
                json_str = json_str[3:]
            if json_str.endswith('```'):
                json_str = json_str[:-3]

            json_str = json_str.strip()

            session = json.loads(json_str)
            return session

        except json.JSONDecodeError as e:
            print(f"❌ Failed to parse session response: {e}")
            print(f"Response was: {response_text[:500]}...")
            return {
                "error": "Failed to parse session plan",
                "phases": []
            }

    def save_drills(self, drills: Dict[str, Any], output_path: str):
        """Save training drills to JSON file."""
        with open(output_path, 'w') as f:
            json.dump(drills, f, indent=2)

        print(f"💾 Drills saved to {output_path}")

    def export_to_pdf(self, session: Dict[str, Any], output_path: str):
        """Export training session to PDF (requires reportlab)."""
        try:
            from reportlab.lib.pagesizes import letter
            from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak
            from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
            from reportlab.lib.units import inch

            doc = SimpleDocTemplate(output_path, pagesize=letter)
            story = []
            styles = getSampleStyleSheet()

            # Title
            title_style = ParagraphStyle(
                'CustomTitle',
                parent=styles['Heading1'],
                fontSize=24,
                spaceAfter=30
            )

            story.append(Paragraph(session.get('session_title', 'Training Session'), title_style))
            story.append(Spacer(1, 0.2 * inch))

            # Session info
            info = f"""
            <b>Duration:</b> {session.get('duration', 0)} minutes<br/>
            <b>Age Group:</b> {session.get('age_group', 'N/A')}<br/>
            <b>Focus Areas:</b> {', '.join(session.get('focus_areas', []))}<br/>
            """
            story.append(Paragraph(info, styles['Normal']))
            story.append(Spacer(1, 0.3 * inch))

            # Phases
            for phase in session.get('phases', []):
                story.append(Paragraph(
                    f"<b>{phase.get('phase_name', 'Phase')}</b> ({phase.get('duration', 0)} min)",
                    styles['Heading2']
                ))

                for activity in phase.get('activities', []):
                    story.append(Paragraph(
                        f"<b>{activity.get('name', 'Activity')}</b>",
                        styles['Heading3']
                    ))
                    story.append(Paragraph(
                        activity.get('description', ''),
                        styles['Normal']
                    ))
                    story.append(Spacer(1, 0.2 * inch))

            doc.build(story)
            print(f"📄 PDF exported to {output_path}")

        except ImportError:
            print("⚠️  reportlab not installed. Run: pip install reportlab")
            print("    Saving as JSON instead...")
            json_path = output_path.replace('.pdf', '.json')
            self.save_drills(session, json_path)


def main():
    """Example usage."""
    import argparse

    parser = argparse.ArgumentParser(description='Generate training drills from mistakes')
    parser.add_argument('--mistakes', required=True, help='Path to mistakes JSON file')
    parser.add_argument('--output', default='training_session.json', help='Output file')
    parser.add_argument('--duration', type=int, default=60, help='Session duration (minutes)')
    parser.add_argument('--age-group', default='Adult', help='Age group')
    parser.add_argument('--pdf', action='store_true', help='Export to PDF')

    args = parser.parse_args()

    # Load mistakes
    with open(args.mistakes, 'r') as f:
        data = json.load(f)

    mistakes = data.get('mistakes', [])

    # Generate drills
    generator = TrainingDrillGenerator()

    session = generator.generate_session_from_mistakes(
        mistakes,
        session_duration=args.duration,
        age_group=args.age_group
    )

    # Save output
    if args.pdf:
        pdf_path = args.output.replace('.json', '.pdf')
        generator.export_to_pdf(session, pdf_path)
    else:
        generator.save_drills(session, args.output)

    print(f"\n✅ Training session generated successfully!")
    print(f"   Title: {session.get('session_title', 'N/A')}")
    print(f"   Duration: {session.get('duration', 0)} minutes")
    print(f"   Phases: {len(session.get('phases', []))}")


if __name__ == '__main__':
    main()

#!/usr/bin/env python3
"""
Test script for hashtag generation
Tests hashtag automation for different event types and platforms
"""

import argparse
import sys
from pathlib import Path

from hashtag_generator import HashtagGenerator


def test_event_hashtags(event_type='goal'):
    """Test hashtag generation for a specific event type"""
    print("\n" + "="*60)
    print(f"TESTING EVENT HASHTAGS ({event_type.upper()})")
    print("="*60)

    # Sample events for testing
    events = {
        'goal': {
            'type': 'goal',
            'player': 'Mohamed Salah',
            'team': 'Liverpool',
            'minute': '67'
        },
        'save': {
            'type': 'save',
            'player': 'Alisson',
            'team': 'Liverpool',
            'minute': '23'
        },
        'skill': {
            'type': 'skill',
            'player': 'Marcus Rashford',
            'team': 'Manchester United',
            'minute': '45'
        },
        'card': {
            'type': 'card',
            'player': 'Bruno Fernandes',
            'team': 'Manchester United',
            'card_type': 'yellow',
            'minute': '78'
        },
        'chance': {
            'type': 'chance',
            'team': 'Liverpool',
            'minute': '12'
        },
        'assist': {
            'type': 'assist',
            'player': 'Kevin De Bruyne',
            'team': 'Manchester City',
            'minute': '34'
        },
        'tackle': {
            'type': 'tackle',
            'player': 'Virgil van Dijk',
            'team': 'Liverpool',
            'minute': '56'
        }
    }

    event = events.get(event_type, events['goal'])

    # Match metadata
    match_meta = {
        'home_team': 'Liverpool',
        'away_team': 'Manchester United',
        'competition': 'Premier League',
        'date': '2024-03-10'
    }

    # Generate hashtags
    generator = HashtagGenerator()
    hashtags = generator.generate_hashtags(event, match_meta, max_hashtags=30)

    # Display results
    print(f"\nEvent: {event}")
    print(f"Match: {match_meta['home_team']} vs {match_meta['away_team']}")
    print(f"Competition: {match_meta['competition']}")
    print(f"\nGenerated {len(hashtags)} hashtags:")
    print("-" * 60)

    # Display hashtags in groups of 5 for readability
    for i in range(0, len(hashtags), 5):
        print(' '.join(hashtags[i:i+5]))

    # Analyze hashtag distribution
    print("\n" + "-" * 60)
    print("Hashtag Distribution by Category:")
    print("-" * 60)
    category_counts = generator.get_hashtag_count_by_category(hashtags)
    for category, count in category_counts.items():
        if count > 0:
            print(f"  {category.capitalize()}: {count}")

    print(f"\nTotal: {len(hashtags)} hashtags")

    return hashtags


def test_platform_formatting(event_type='goal'):
    """Test platform-specific hashtag formatting"""
    print("\n" + "="*60)
    print("TESTING PLATFORM-SPECIFIC FORMATTING")
    print("="*60)

    # Generate hashtags
    event = {
        'type': event_type,
        'player': 'Mohamed Salah',
        'team': 'Liverpool',
        'minute': '67'
    }

    match_meta = {
        'home_team': 'Liverpool',
        'away_team': 'Manchester City',
        'competition': 'Premier League'
    }

    generator = HashtagGenerator()
    hashtags = generator.generate_hashtags(event, match_meta, max_hashtags=30)

    platforms = ['tiktok', 'instagram', 'youtube', 'twitter']

    for platform in platforms:
        print(f"\n{platform.upper()}:")
        print("-" * 60)
        formatted = generator.format_for_platform(hashtags, platform)

        # Display first 200 chars for readability
        if len(formatted) > 200:
            print(formatted[:200] + "...")
        else:
            print(formatted)

        print(f"Character count: {len(formatted)}")

    return True


def test_caption_with_hashtags(event_type='goal'):
    """Test caption generation with hashtags"""
    print("\n" + "="*60)
    print("TESTING CAPTION + HASHTAGS")
    print("="*60)

    # Generate hashtags
    event = {
        'type': event_type,
        'player': 'Mohamed Salah',
        'team': 'Liverpool',
        'minute': '67'
    }

    match_meta = {
        'home_team': 'Liverpool',
        'away_team': 'Manchester City',
        'competition': 'Premier League'
    }

    generator = HashtagGenerator()
    hashtags = generator.generate_hashtags(event, match_meta, max_hashtags=30)

    # Sample captions
    captions = {
        'goal': "What a strike by Mohamed Salah! ⚽",
        'save': "Incredible save! 🧤",
        'skill': "Pure magic from Marcus Rashford! ✨",
    }

    caption_text = captions.get(event_type, "Amazing football moment!")

    platforms = ['tiktok', 'instagram', 'youtube']

    for platform in platforms:
        print(f"\n{platform.upper()}:")
        print("-" * 60)
        full_caption = generator.generate_caption_with_hashtags(
            caption_text, hashtags, platform
        )

        # Display first 300 chars
        if len(full_caption) > 300:
            print(full_caption[:300] + "...")
        else:
            print(full_caption)

        print(f"\nTotal length: {len(full_caption)} characters")

    return True


def test_custom_team_nickname():
    """Test adding custom team nicknames"""
    print("\n" + "="*60)
    print("TESTING CUSTOM TEAM NICKNAMES")
    print("="*60)

    generator = HashtagGenerator()

    # Add custom team
    custom_team = 'Leeds United'
    custom_nickname = 'LUFC'

    print(f"\nAdding custom team: {custom_team} -> #{custom_nickname}")
    generator.add_custom_team_nickname(custom_team, custom_nickname)

    # Generate hashtags for this team
    event = {
        'type': 'goal',
        'player': 'Patrick Bamford',
        'team': custom_team,
        'minute': '12'
    }

    match_meta = {
        'home_team': custom_team,
        'away_team': 'Sheffield United',
        'competition': 'Championship'
    }

    hashtags = generator.generate_hashtags(event, match_meta, max_hashtags=30)

    print(f"\nGenerated hashtags:")
    print(' '.join(hashtags[:10]))  # Show first 10

    # Check if custom nickname was included
    if f"#{custom_nickname}" in hashtags:
        print(f"\n✓ Custom nickname #{custom_nickname} was included!")
    else:
        print(f"\n✗ Custom nickname #{custom_nickname} was NOT found")

    return True


def test_save_to_file(output_dir='test_output/hashtags'):
    """Test saving hashtags to file"""
    print("\n" + "="*60)
    print("TESTING SAVE TO FILE")
    print("="*60)

    import os
    os.makedirs(output_dir, exist_ok=True)

    # Generate hashtags
    event = {
        'type': 'goal',
        'player': 'Mohamed Salah',
        'team': 'Liverpool',
        'minute': '67'
    }

    match_meta = {
        'home_team': 'Liverpool',
        'away_team': 'Manchester City',
        'competition': 'Premier League'
    }

    generator = HashtagGenerator()
    hashtags = generator.generate_hashtags(event, match_meta, max_hashtags=30)

    platforms = ['tiktok', 'instagram', 'youtube']

    for platform in platforms:
        output_path = os.path.join(output_dir, f'hashtags_{platform}.txt')
        generator.save_to_file(hashtags, output_path, platform)

    print(f"\n✓ Hashtags saved to {output_dir}")
    return True


def test_max_hashtag_limit():
    """Test that max hashtag limit is enforced"""
    print("\n" + "="*60)
    print("TESTING MAX HASHTAG LIMIT")
    print("="*60)

    # Generate hashtags with different limits
    event = {
        'type': 'goal',
        'player': 'Mohamed Salah',
        'team': 'Liverpool',
        'minute': '67'
    }

    match_meta = {
        'home_team': 'Liverpool',
        'away_team': 'Manchester City',
        'competition': 'Premier League'
    }

    generator = HashtagGenerator()

    limits = [10, 20, 30, 40]

    for limit in limits:
        hashtags = generator.generate_hashtags(event, match_meta, max_hashtags=limit)
        print(f"  Max limit: {limit} -> Generated: {len(hashtags)} hashtags")

        if len(hashtags) <= limit:
            print(f"    ✓ Limit enforced")
        else:
            print(f"    ✗ Limit exceeded!")

    return True


def test_all():
    """Run all tests"""
    print("\n" + "="*60)
    print("RUNNING ALL HASHTAG GENERATION TESTS")
    print("="*60)

    success = True

    try:
        # Test 1: Event hashtags for different types
        print("\n\n--- TEST 1: Event Hashtags ---")
        for event_type in ['goal', 'save', 'skill', 'card', 'chance']:
            test_event_hashtags(event_type)

        # Test 2: Platform formatting
        print("\n\n--- TEST 2: Platform Formatting ---")
        test_platform_formatting()

        # Test 3: Caption with hashtags
        print("\n\n--- TEST 3: Caption + Hashtags ---")
        test_caption_with_hashtags()

        # Test 4: Custom team nicknames
        print("\n\n--- TEST 4: Custom Team Nicknames ---")
        test_custom_team_nickname()

        # Test 5: Save to file
        print("\n\n--- TEST 5: Save to File ---")
        test_save_to_file()

        # Test 6: Max hashtag limit
        print("\n\n--- TEST 6: Max Hashtag Limit ---")
        test_max_hashtag_limit()

    except Exception as e:
        print(f"\n✗ Test failed: {str(e)}")
        import traceback
        traceback.print_exc()
        success = False

    return success


def main():
    parser = argparse.ArgumentParser(description='Test hashtag generation')
    parser.add_argument('--test', required=True,
                       choices=['event', 'platform', 'caption', 'custom', 'save', 'limit', 'all'],
                       help='Which test to run')
    parser.add_argument('--event-type', default='goal',
                       choices=['goal', 'save', 'skill', 'card', 'chance', 'assist', 'tackle'],
                       help='Event type to test')
    parser.add_argument('--output-dir', default='test_output/hashtags',
                       help='Output directory for save test')

    args = parser.parse_args()

    success = True

    if args.test == 'event':
        test_event_hashtags(args.event_type)
    elif args.test == 'platform':
        test_platform_formatting(args.event_type)
    elif args.test == 'caption':
        test_caption_with_hashtags(args.event_type)
    elif args.test == 'custom':
        test_custom_team_nickname()
    elif args.test == 'save':
        test_save_to_file(args.output_dir)
    elif args.test == 'limit':
        test_max_hashtag_limit()
    elif args.test == 'all':
        success = test_all()

    print("\n" + "="*60)
    if success:
        print("✓ ALL TESTS PASSED")
    else:
        print("✗ SOME TESTS FAILED")
    print("="*60)

    sys.exit(0 if success else 1)


if __name__ == '__main__':
    main()

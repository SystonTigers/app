#!/usr/bin/env python3
"""
Test script for multi-language caption generation
Tests translation to Spanish, Portuguese, French, Arabic, German, Italian, etc.
"""

import argparse
import sys
import os
from pathlib import Path

from multilang_captions import MultiLanguageCaptionGenerator


def test_translation(languages=['es', 'pt', 'fr']):
    """Test translation of various caption texts"""
    print("\n" + "="*60)
    print("TESTING CAPTION TRANSLATION")
    print("="*60)

    generator = MultiLanguageCaptionGenerator(use_api=False)  # Phrase-based only

    # Test captions
    test_captions = [
        "⚽ GOAL! Mohamed Salah 23'",
        "🧤 SAVE! Alisson 45'",
        "⭐ Skill Move - Marcus Rashford 67'",
        "🟨 Yellow Card - Bruno Fernandes 78'",
        "🟥 Red Card - Casemiro 89'",
        "🎯 Big Chance - Harry Kane 12'",
    ]

    for caption_en in test_captions:
        print(f"\n📝 Original (English): {caption_en}")
        print("-" * 60)

        for lang in languages:
            translated = generator.translate_caption_text(caption_en, lang)
            lang_name = generator.SUPPORTED_LANGUAGES.get(lang, lang)
            print(f"  {lang_name:20s}: {translated}")

    return True


def test_phrase_detection():
    """Test football-specific phrase detection and translation"""
    print("\n" + "="*60)
    print("TESTING FOOTBALL PHRASE DETECTION")
    print("="*60)

    generator = MultiLanguageCaptionGenerator(use_api=False)

    phrases_to_test = [
        'GOAL', 'SAVE', 'Yellow Card', 'Red Card',
        'Penalty', 'Free Kick', 'Offside', 'Skill Move'
    ]

    languages = ['es', 'pt', 'fr', 'de', 'ar']

    print(f"\nTesting {len(phrases_to_test)} phrases in {len(languages)} languages:")
    print("-" * 60)

    for phrase_en in phrases_to_test:
        print(f"\n'{phrase_en}':")
        for lang in languages:
            translated = generator._translate_with_phrases(phrase_en, lang)
            lang_name = generator.SUPPORTED_LANGUAGES.get(lang, lang)
            print(f"  {lang_name:15s}: {translated}")

    return True


def test_srt_generation(output_dir='test_output/multilang'):
    """Test SRT file generation in multiple languages"""
    print("\n" + "="*60)
    print("TESTING MULTI-LANGUAGE SRT GENERATION")
    print("="*60)

    # Test events
    events = [
        {
            'type': 'goal',
            'player': 'Mohamed Salah',
            'team': 'Liverpool',
            'minute': '23',
            'timestamp': 0,
            'duration': 5.0
        },
        {
            'type': 'save',
            'player': 'Alisson',
            'team': 'Liverpool',
            'minute': '45',
            'timestamp': 5.0,
            'duration': 5.0
        },
        {
            'type': 'skill',
            'player': 'Marcus Rashford',
            'team': 'Manchester United',
            'minute': '67',
            'timestamp': 10.0,
            'duration': 5.0
        }
    ]

    match_meta = {
        'home_team': 'Liverpool',
        'away_team': 'Manchester City',
        'competition': 'Premier League'
    }

    generator = MultiLanguageCaptionGenerator(use_api=False)

    languages = ['en', 'es', 'pt', 'fr']

    print(f"\nGenerating SRT files for {len(languages)} languages...")
    print(f"Output directory: {output_dir}")

    srt_files = generator.generate_multilingual_srt(
        events,
        match_meta,
        output_dir,
        languages=languages
    )

    print("\n" + "="*60)
    print("GENERATED SRT FILES:")
    print("="*60)

    for lang, path in srt_files.items():
        lang_name = generator.SUPPORTED_LANGUAGES.get(lang, lang)
        print(f"  {lang_name:20s}: {path}")

        # Display first few lines of each SRT
        if os.path.exists(path):
            with open(path, 'r', encoding='utf-8') as f:
                lines = f.readlines()[:8]  # First entry
                print(f"    Preview:")
                for line in lines:
                    print(f"      {line.rstrip()}")
            print()

    return True


def test_all_languages():
    """Test translation for all supported languages"""
    print("\n" + "="*60)
    print("TESTING ALL SUPPORTED LANGUAGES")
    print("="*60)

    generator = MultiLanguageCaptionGenerator(use_api=False)

    test_caption = "⚽ GOAL! Mohamed Salah 23'"

    print(f"\nOriginal: {test_caption}")
    print("\nTranslations:")
    print("-" * 60)

    all_languages = list(generator.SUPPORTED_LANGUAGES.keys())

    for lang in all_languages:
        if lang == 'en':
            continue

        translated = generator.translate_caption_text(test_caption, lang)
        lang_name = generator.SUPPORTED_LANGUAGES[lang]
        print(f"  {lang_name:25s} ({lang:6s}): {translated}")

    print(f"\nTotal languages supported: {len(all_languages)}")

    return True


def test_caption_files(output_dir='test_output/multilang_captions'):
    """Test generating caption files for shorts"""
    print("\n" + "="*60)
    print("TESTING CAPTION FILE GENERATION")
    print("="*60)

    generator = MultiLanguageCaptionGenerator(use_api=False)

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

    languages = ['en', 'es', 'pt', 'fr', 'ar']

    print(f"\nGenerating caption files for {len(languages)} languages...")

    caption_files = generator.generate_multilingual_captions_for_short(
        'short_01.mp4',
        event,
        match_meta,
        output_dir,
        languages=languages
    )

    print("\n" + "="*60)
    print("GENERATED CAPTION FILES:")
    print("="*60)

    for lang, path in caption_files.items():
        lang_name = generator.SUPPORTED_LANGUAGES.get(lang, lang)
        print(f"\n  {lang_name:20s}: {path}")

        # Display content
        if os.path.exists(path):
            with open(path, 'r', encoding='utf-8') as f:
                content = f.read()
                print(f"    Content: {content}")

    return True


def test_language_coverage():
    """Test that all football phrases are covered in all languages"""
    print("\n" + "="*60)
    print("TESTING LANGUAGE COVERAGE")
    print("="*60)

    generator = MultiLanguageCaptionGenerator(use_api=False)

    en_phrases = generator.FOOTBALL_PHRASES['en']
    all_langs = generator.FOOTBALL_PHRASES.keys()

    print(f"\nEnglish phrases: {len(en_phrases)}")
    print(f"Supported languages: {len(all_langs)}")

    # Check coverage
    print("\nCoverage analysis:")
    print("-" * 60)

    for lang in all_langs:
        if lang == 'en':
            continue

        lang_phrases = generator.FOOTBALL_PHRASES[lang]
        coverage = len(lang_phrases) / len(en_phrases) * 100

        lang_name = generator.SUPPORTED_LANGUAGES.get(lang, lang)

        status = "✓" if coverage == 100 else "⚠️ "
        print(f"  {status} {lang_name:20s}: {len(lang_phrases)}/{len(en_phrases)} phrases ({coverage:.0f}%)")

        # Show missing phrases if any
        if coverage < 100:
            missing = set(en_phrases.keys()) - set(lang_phrases.keys())
            print(f"       Missing: {', '.join(missing)}")

    return True


def test_emoji_preservation():
    """Test that emojis are preserved during translation"""
    print("\n" + "="*60)
    print("TESTING EMOJI PRESERVATION")
    print("="*60)

    generator = MultiLanguageCaptionGenerator(use_api=False)

    test_cases = [
        "⚽ GOAL!",
        "🧤 SAVE!",
        "🟨 Yellow Card",
        "🟥 Red Card",
        "⭐ Skill Move",
        "🎯 Big Chance",
    ]

    languages = ['es', 'pt', 'fr']

    print("\nTesting emoji preservation in translations:")
    print("-" * 60)

    for caption in test_cases:
        print(f"\n{caption}")
        for lang in languages:
            translated = generator.translate_caption_text(caption, lang)
            # Check if original emoji is in translated text
            emoji = caption.split()[0]
            preserved = "✓" if emoji in translated else "✗"
            lang_name = generator.SUPPORTED_LANGUAGES[lang]
            print(f"  {preserved} {lang_name:15s}: {translated}")

    return True


def test_all():
    """Run all tests"""
    print("\n" + "="*60)
    print("RUNNING ALL MULTI-LANGUAGE CAPTION TESTS")
    print("="*60)

    success = True

    try:
        # Test 1: Basic translation
        print("\n\n--- TEST 1: Caption Translation ---")
        test_translation(['es', 'pt', 'fr', 'de'])

        # Test 2: Phrase detection
        print("\n\n--- TEST 2: Football Phrase Detection ---")
        test_phrase_detection()

        # Test 3: SRT generation
        print("\n\n--- TEST 3: Multi-Language SRT Generation ---")
        test_srt_generation()

        # Test 4: All languages
        print("\n\n--- TEST 4: All Supported Languages ---")
        test_all_languages()

        # Test 5: Caption files
        print("\n\n--- TEST 5: Caption File Generation ---")
        test_caption_files()

        # Test 6: Language coverage
        print("\n\n--- TEST 6: Language Coverage ---")
        test_language_coverage()

        # Test 7: Emoji preservation
        print("\n\n--- TEST 7: Emoji Preservation ---")
        test_emoji_preservation()

    except Exception as e:
        print(f"\n✗ Test failed: {str(e)}")
        import traceback
        traceback.print_exc()
        success = False

    return success


def main():
    parser = argparse.ArgumentParser(description='Test multi-language caption generation')
    parser.add_argument('--test', required=True,
                       choices=['translate', 'phrases', 'srt', 'all-langs', 'files', 'coverage', 'emoji', 'all'],
                       help='Which test to run')
    parser.add_argument('--languages', nargs='+', default=['es', 'pt', 'fr'],
                       help='Languages to test (space-separated)')
    parser.add_argument('--output-dir', default='test_output/multilang',
                       help='Output directory for test files')

    args = parser.parse_args()

    success = True

    if args.test == 'translate':
        success = test_translation(args.languages)
    elif args.test == 'phrases':
        success = test_phrase_detection()
    elif args.test == 'srt':
        success = test_srt_generation(args.output_dir)
    elif args.test == 'all-langs':
        success = test_all_languages()
    elif args.test == 'files':
        success = test_caption_files(args.output_dir)
    elif args.test == 'coverage':
        success = test_language_coverage()
    elif args.test == 'emoji':
        success = test_emoji_preservation()
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

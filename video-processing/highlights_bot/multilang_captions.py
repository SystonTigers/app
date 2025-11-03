"""
Multi-language caption generation module
Automatically translates football highlight captions to multiple languages
Supports: English, Spanish, Portuguese, French, Arabic, German, Italian, Dutch, Turkish, Japanese, Korean, Chinese
"""

import os
from typing import List, Dict, Optional


class MultiLanguageCaptionGenerator:
    """
    Generate captions in multiple languages for global audience reach.
    """

    # Supported languages (expandable)
    SUPPORTED_LANGUAGES = {
        'en': 'English',
        'es': 'Spanish',
        'pt': 'Portuguese',
        'fr': 'French',
        'ar': 'Arabic',
        'de': 'German',
        'it': 'Italian',
        'nl': 'Dutch',
        'tr': 'Turkish',
        'ja': 'Japanese',
        'ko': 'Korean',
        'zh-cn': 'Chinese (Simplified)',
    }

    # Football-specific phrase translations (for better accuracy than auto-translate)
    FOOTBALL_PHRASES = {
        'en': {
            'goal': 'GOAL',
            'save': 'SAVE',
            'card': 'CARD',
            'yellow_card': 'Yellow Card',
            'red_card': 'Red Card',
            'assist': 'Assist',
            'penalty': 'Penalty',
            'free_kick': 'Free Kick',
            'corner': 'Corner',
            'offside': 'Offside',
            'tackle': 'Tackle',
            'skill': 'Skill Move',
            'chance': 'Big Chance',
        },
        'es': {
            'goal': 'GOL',
            'save': 'PARADA',
            'card': 'TARJETA',
            'yellow_card': 'Tarjeta Amarilla',
            'red_card': 'Tarjeta Roja',
            'assist': 'Asistencia',
            'penalty': 'Penalti',
            'free_kick': 'Tiro Libre',
            'corner': 'Córner',
            'offside': 'Fuera de Juego',
            'tackle': 'Entrada',
            'skill': 'Regate',
            'chance': 'Gran Oportunidad',
        },
        'pt': {
            'goal': 'GOL',
            'save': 'DEFESA',
            'card': 'CARTÃO',
            'yellow_card': 'Cartão Amarelo',
            'red_card': 'Cartão Vermelho',
            'assist': 'Assistência',
            'penalty': 'Pênalti',
            'free_kick': 'Tiro Livre',
            'corner': 'Escanteio',
            'offside': 'Impedimento',
            'tackle': 'Carrinho',
            'skill': 'Drible',
            'chance': 'Grande Chance',
        },
        'fr': {
            'goal': 'BUT',
            'save': 'ARRÊT',
            'card': 'CARTON',
            'yellow_card': 'Carton Jaune',
            'red_card': 'Carton Rouge',
            'assist': 'Passe Décisive',
            'penalty': 'Penalty',
            'free_kick': 'Coup Franc',
            'corner': 'Corner',
            'offside': 'Hors-jeu',
            'tackle': 'Tacle',
            'skill': 'Dribble',
            'chance': 'Occasion',
        },
        'ar': {
            'goal': 'هدف',
            'save': 'إنقاذ',
            'card': 'بطاقة',
            'yellow_card': 'بطاقة صفراء',
            'red_card': 'بطاقة حمراء',
            'assist': 'تمريرة حاسمة',
            'penalty': 'ضربة جزاء',
            'free_kick': 'ضربة حرة',
            'corner': 'ركنية',
            'offside': 'تسلل',
            'tackle': 'مقاطعة',
            'skill': 'مهارة',
            'chance': 'فرصة كبيرة',
        },
        'de': {
            'goal': 'TOR',
            'save': 'PARADE',
            'card': 'KARTE',
            'yellow_card': 'Gelbe Karte',
            'red_card': 'Rote Karte',
            'assist': 'Vorlage',
            'penalty': 'Elfmeter',
            'free_kick': 'Freistoß',
            'corner': 'Ecke',
            'offside': 'Abseits',
            'tackle': 'Tackling',
            'skill': 'Trick',
            'chance': 'Große Chance',
        },
        'it': {
            'goal': 'GOL',
            'save': 'PARATA',
            'card': 'CARTELLINO',
            'yellow_card': 'Cartellino Giallo',
            'red_card': 'Cartellino Rosso',
            'assist': 'Assist',
            'penalty': 'Rigore',
            'free_kick': 'Calcio di Punizione',
            'corner': 'Calcio d\'Angolo',
            'offside': 'Fuorigioco',
            'tackle': 'Contrasto',
            'skill': 'Dribbling',
            'chance': 'Grande Occasione',
        },
        'nl': {
            'goal': 'DOELPUNT',
            'save': 'REDDING',
            'card': 'KAART',
            'yellow_card': 'Gele Kaart',
            'red_card': 'Rode Kaart',
            'assist': 'Assist',
            'penalty': 'Penalty',
            'free_kick': 'Vrije Trap',
            'corner': 'Corner',
            'offside': 'Buitenspel',
            'tackle': 'Tackle',
            'skill': 'Dribbel',
            'chance': 'Grote Kans',
        },
        'tr': {
            'goal': 'GOL',
            'save': 'KURTARIŞ',
            'card': 'KART',
            'yellow_card': 'Sarı Kart',
            'red_card': 'Kırmızı Kart',
            'assist': 'Asist',
            'penalty': 'Penaltı',
            'free_kick': 'Serbest Vuruş',
            'corner': 'Korner',
            'offside': 'Ofsayt',
            'tackle': 'Müdahale',
            'skill': 'Çalım',
            'chance': 'Büyük Fırsat',
        },
        'ja': {
            'goal': 'ゴール',
            'save': 'セーブ',
            'card': 'カード',
            'yellow_card': 'イエローカード',
            'red_card': 'レッドカード',
            'assist': 'アシスト',
            'penalty': 'ペナルティキック',
            'free_kick': 'フリーキック',
            'corner': 'コーナーキック',
            'offside': 'オフサイド',
            'tackle': 'タックル',
            'skill': 'ドリブル',
            'chance': 'ビッグチャンス',
        },
        'ko': {
            'goal': '골',
            'save': '세이브',
            'card': '카드',
            'yellow_card': '옐로우 카드',
            'red_card': '레드 카드',
            'assist': '어시스트',
            'penalty': '페널티킥',
            'free_kick': '프리킥',
            'corner': '코너킥',
            'offside': '오프사이드',
            'tackle': '태클',
            'skill': '드리블',
            'chance': '절호의 기회',
        },
        'zh-cn': {
            'goal': '进球',
            'save': '扑救',
            'card': '牌',
            'yellow_card': '黄牌',
            'red_card': '红牌',
            'assist': '助攻',
            'penalty': '点球',
            'free_kick': '任意球',
            'corner': '角球',
            'offside': '越位',
            'tackle': '铲球',
            'skill': '盘带',
            'chance': '破门良机',
        }
    }

    def __init__(self, use_api=True):
        """
        Initialize multi-language caption generator.

        Args:
            use_api: Use googletrans API for translation (requires internet)
        """
        self.use_api = use_api
        self.translator = None

        if use_api:
            try:
                from googletrans import Translator
                self.translator = Translator()
                print("  ✓ Google Translate API initialized")
            except ImportError:
                print("  ⚠️  googletrans not installed. Install with: pip install googletrans==4.0.0rc1")
                print("  ⚠️  Falling back to phrase-based translation only")
                self.use_api = False

    def translate_caption_text(self, text_en, target_lang='es'):
        """
        Translate caption text to target language.

        Args:
            text_en: English caption text
            target_lang: Target language code (es, pt, fr, ar, etc.)

        Returns:
            Translated text
        """
        if target_lang == 'en':
            return text_en

        # Try phrase-based translation first
        translated = self._translate_with_phrases(text_en, target_lang)

        # If API translation is enabled and phrase-based didn't fully translate
        if self.use_api and self.translator and translated == text_en:
            try:
                # Replace emojis temporarily (preserve them)
                emojis = ['⚽', '🎯', '🟨', '🟥', '⭐', '🧤', '💪', '🔥', '⚡', '👏']
                emoji_placeholders = {}
                text_to_translate = text_en

                for i, emoji in enumerate(emojis):
                    if emoji in text_to_translate:
                        placeholder = f"__EMOJI{i}__"
                        emoji_placeholders[placeholder] = emoji
                        text_to_translate = text_to_translate.replace(emoji, placeholder)

                # Translate
                translation = self.translator.translate(text_to_translate, dest=target_lang)
                translated_text = translation.text

                # Restore emojis
                for placeholder, emoji in emoji_placeholders.items():
                    translated_text = translated_text.replace(placeholder, emoji)

                return translated_text

            except Exception as e:
                print(f"  ⚠️  API translation failed for '{text_en}' to {target_lang}: {e}")
                return translated  # Fallback to phrase-based or original

        return translated

    def _translate_with_phrases(self, text_en, target_lang):
        """
        Translate text using football-specific phrases.

        Args:
            text_en: English text
            target_lang: Target language code

        Returns:
            Translated text (or original if no phrases match)
        """
        if target_lang not in self.FOOTBALL_PHRASES:
            return text_en

        phrases_en = self.FOOTBALL_PHRASES['en']
        phrases_target = self.FOOTBALL_PHRASES[target_lang]

        translated_text = text_en

        # Replace football phrases
        for key, phrase_en in phrases_en.items():
            if phrase_en in translated_text:
                phrase_target = phrases_target.get(key, phrase_en)
                translated_text = translated_text.replace(phrase_en, phrase_target)

        return translated_text

    def generate_multilingual_srt(self, events, match_meta, output_dir, languages=['en', 'es', 'pt']):
        """
        Generate SRT files in multiple languages.

        Args:
            events: List of events
            match_meta: Match metadata
            output_dir: Output directory for SRT files
            languages: List of language codes to generate

        Returns:
            Dictionary mapping language codes to file paths
        """
        try:
            from captions import format_srt_time, generate_caption_text
        except ImportError:
            print("  ⚠️  captions module not found. Using fallback caption generation.")
            format_srt_time = self._format_srt_time_fallback
            generate_caption_text = self._generate_caption_text_fallback

        os.makedirs(output_dir, exist_ok=True)

        srt_files = {}

        for lang in languages:
            print(f"\n📝 Generating {self.SUPPORTED_LANGUAGES.get(lang, lang)} captions...")

            srt_path = os.path.join(output_dir, f'captions_{lang}.srt')

            with open(srt_path, 'w', encoding='utf-8') as f:
                for idx, event in enumerate(events, 1):
                    # Generate English caption first
                    caption_en = generate_caption_text(event)

                    # Translate if not English
                    if lang != 'en':
                        caption = self.translate_caption_text(caption_en, lang)
                    else:
                        caption = caption_en

                    # Write SRT entry
                    start_time = event.get('timestamp', event.get('abs_ts', 0))
                    duration = event.get('duration', 5.0)
                    end_time = start_time + duration

                    f.write(f"{idx}\n")
                    f.write(f"{format_srt_time(start_time)} --> {format_srt_time(end_time)}\n")
                    f.write(f"{caption}\n")
                    f.write("\n")

            srt_files[lang] = srt_path
            print(f"   ✅ {self.SUPPORTED_LANGUAGES.get(lang, lang)}: {srt_path}")

        return srt_files

    def _format_srt_time_fallback(self, seconds):
        """Fallback SRT time formatter"""
        hours = int(seconds // 3600)
        minutes = int((seconds % 3600) // 60)
        secs = int(seconds % 60)
        millis = int((seconds % 1) * 1000)
        return f"{hours:02d}:{minutes:02d}:{secs:02d},{millis:03d}"

    def _generate_caption_text_fallback(self, event):
        """Fallback caption text generator"""
        event_type = event.get('type', 'highlight')
        player = event.get('player', '')
        minute = event.get('minute', '')

        if event_type == 'goal':
            return f"⚽ GOAL! {player} {minute}'"
        elif event_type == 'save':
            return f"🧤 SAVE! {player} {minute}'"
        elif event_type == 'skill':
            return f"⭐ Skill Move - {player} {minute}'"
        elif event_type == 'card':
            card_type = event.get('card_type', 'yellow')
            emoji = '🟨' if card_type == 'yellow' else '🟥'
            return f"{emoji} Card - {player} {minute}'"
        else:
            return f"{event_type.title()} - {minute}'"

    def burn_multilingual_captions(self, video_path, srt_files, output_dir):
        """
        Burn captions into video for each language.

        Args:
            video_path: Original video path
            srt_files: Dictionary mapping language codes to SRT file paths
            output_dir: Output directory for videos with burned captions

        Returns:
            Dictionary mapping language codes to output video paths
        """
        try:
            from captions import burn_srt_to_video
        except ImportError:
            print("  ⚠️  captions module not found. Using fallback burn method.")
            burn_srt_to_video = self._burn_srt_fallback

        os.makedirs(output_dir, exist_ok=True)

        output_videos = {}

        for lang, srt_path in srt_files.items():
            print(f"\n🔥 Burning {self.SUPPORTED_LANGUAGES.get(lang, lang)} captions...")

            output_path = os.path.join(
                output_dir,
                os.path.basename(video_path).replace('.mp4', f'_{lang}.mp4')
            )

            burn_srt_to_video(video_path, output_path, srt_path, font_size=24)

            output_videos[lang] = output_path
            print(f"   ✅ {self.SUPPORTED_LANGUAGES.get(lang, lang)}: {output_path}")

        return output_videos

    def _burn_srt_fallback(self, video_path, output_path, srt_path, font_size=24):
        """Fallback SRT burn using FFmpeg"""
        import subprocess

        # Escape paths for FFmpeg
        srt_path_escaped = srt_path.replace('\\', '\\\\\\\\').replace(':', '\\\\:')

        cmd = [
            'ffmpeg', '-i', video_path,
            '-vf', f"subtitles={srt_path_escaped}:force_style='FontSize={font_size}'",
            '-c:a', 'copy',
            '-y', output_path
        ]

        subprocess.run(cmd, check=True, capture_output=True)
        print(f"  ✓ Captions burned: {output_path}")

    def generate_multilingual_captions_for_short(self, short_path, event, match_meta, output_dir, languages=['en', 'es', 'pt']):
        """
        Generate multi-language caption files for a single short.

        Args:
            short_path: Path to short video
            event: Event dictionary
            match_meta: Match metadata
            output_dir: Output directory
            languages: List of language codes

        Returns:
            Dictionary mapping language codes to caption file paths
        """
        try:
            from captions import generate_caption_text
        except ImportError:
            generate_caption_text = self._generate_caption_text_fallback

        os.makedirs(output_dir, exist_ok=True)

        caption_files = {}

        # Generate English caption
        caption_en = generate_caption_text(event)

        for lang in languages:
            # Translate caption
            if lang != 'en':
                caption = self.translate_caption_text(caption_en, lang)
            else:
                caption = caption_en

            # Save to file
            caption_path = os.path.join(
                output_dir,
                os.path.basename(short_path).replace('.mp4', f'_caption_{lang}.txt')
            )

            with open(caption_path, 'w', encoding='utf-8') as f:
                f.write(caption)

            caption_files[lang] = caption_path

        return caption_files

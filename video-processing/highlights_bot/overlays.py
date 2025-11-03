"""
Broadcast overlay generation module for creating professional graphics
Includes scorebugs, lower-thirds, and opening/closing slates
"""

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

"""
Hashtag automation module for social media optimization
Automatically generates relevant, trending hashtags for football highlights
"""


class HashtagGenerator:
    """
    Automatic hashtag generation for football highlights.
    """

    # Event-specific hashtags
    EVENT_HASHTAGS = {
        'goal': ['#Goal', '#GoalOfTheWeek', '#GOTW', '#Banger', '#Golazo', '#WorldClass'],
        'save': ['#WorldClassSave', '#GoalkeeperSave', '#SaveOfTheDay', '#GK', '#Reflexes'],
        'skill': ['#Skills', '#Tekkers', '#FootballSkills', '#Nutmeg', '#Dribble', '#Magic'],
        'chance': ['#SoClose', '#NearMiss', '#BigChance', '#AlmostThere'],
        'card': ['#RedCard', '#YellowCard', '#Foul', '#Controversy'],
        'assist': ['#Assist', '#PassMaster', '#Playmaker', '#Vision', '#Through Ball'],
        'tackle': ['#Tackle', '#Defense', '#Defending', '#CrunchingTackle'],
        'penalty': ['#Penalty', '#PenaltyKick', '#SpotKick', '#Nerves'],
        'freekick': ['#FreeKick', '#SetPiece', '#Curler', '#Knuckleball'],
    }

    # Generic football hashtags (always include)
    GENERIC_HASHTAGS = [
        '#Football', '#Soccer', '#MatchHighlights', '#FootballHighlights',
        '#SoccerSkills', '#FootballTikTok', '#SoccerReels', '#FootballShorts',
        '#FootballGoals', '#SoccerGoals', '#Beautiful Game', '#FootballFans'
    ]

    # Competition hashtags
    COMPETITION_HASHTAGS = {
        'Premier League': ['#PremierLeague', '#PL', '#EPL', '#BPL'],
        'La Liga': ['#LaLiga', '#LaLigaSantander', '#LaLigaEA'],
        'Serie A': ['#SerieA', '#SerieATIM', '#ItalianFootball'],
        'Bundesliga': ['#Bundesliga', '#BundesligaHighlights'],
        'Ligue 1': ['#Ligue1', '#Ligue1UberEats'],
        'Champions League': ['#UCL', '#ChampionsLeague', '#UEFA'],
        'Europa League': ['#UEL', '#EuropaLeague', '#UEFA'],
        'Conference League': ['#UECL', '#ConferenceLeague'],
        'World Cup': ['#WorldCup', '#FIFA', '#FIFAWorldCup'],
        'Euros': ['#Euro2024', '#EURO', '#EuropeanChampionship'],
        'Copa America': ['#CopaAmerica', '#Copa'],
        'FA Cup': ['#FACup', '#EmiratesFACup'],
        'League Cup': ['#LeagueCup', '#CarabaoCup'],
        'Local League': ['#LocalFootball', '#Grassroots', '#AmateurFootball'],
    }

    # Team nickname database (expandable)
    TEAM_NICKNAMES = {
        'Liverpool': 'LFC',
        'Manchester United': 'MUFC',
        'Manchester City': 'MCFC',
        'Arsenal': 'AFC',
        'Chelsea': 'CFC',
        'Tottenham': 'THFC',
        'Tottenham Hotspur': 'THFC',
        'Newcastle': 'NUFC',
        'Aston Villa': 'AVFC',
        'West Ham': 'WHUFC',
        'Everton': 'EFC',
        'Barcelona': 'FCB',
        'Real Madrid': 'RealMadrid',
        'Bayern Munich': 'FCBayern',
        'Juventus': 'Juve',
        'AC Milan': 'ACMilan',
        'Inter Milan': 'Inter',
        'PSG': 'PSG',
        'Borussia Dortmund': 'BVB',
    }

    def __init__(self, trending_db=None, custom_hashtags=None):
        """
        Initialize hashtag generator.

        Args:
            trending_db: Optional database of trending hashtags
            custom_hashtags: Optional dict of custom hashtags to include
        """
        self.trending_db = trending_db
        self.custom_hashtags = custom_hashtags or {}

    def generate_hashtags(self, event, match_meta, max_hashtags=30):
        """
        Generate hashtags for a specific event.

        Args:
            event: Event dictionary with type, player, team, etc.
            match_meta: Match metadata (teams, competition, etc.)
            max_hashtags: Maximum number of hashtags (Instagram limit: 30)

        Returns:
            List of hashtag strings
        """
        hashtags = []

        # 1. Event-specific hashtags
        event_type = event.get('type', 'highlight')
        event_tags = self.EVENT_HASHTAGS.get(event_type, [])
        hashtags.extend(event_tags[:3])  # Top 3 event hashtags

        # 2. Team hashtags
        team = event.get('team') or match_meta.get('home_team')
        if team:
            # Clean team name for hashtag
            team_tag = team.replace(' ', '').replace("'", '').replace('-', '')
            hashtags.append(f"#{team_tag}")

            # Add nickname if available
            nickname = self.TEAM_NICKNAMES.get(team)
            if nickname:
                hashtags.append(f"#{nickname}")

        # Add both teams from match
        home_team = match_meta.get('home_team')
        away_team = match_meta.get('away_team')

        if home_team and home_team != team:
            home_tag = home_team.replace(' ', '').replace("'", '').replace('-', '')
            hashtags.append(f"#{home_tag}")

            # Add home nickname if available
            home_nickname = self.TEAM_NICKNAMES.get(home_team)
            if home_nickname:
                hashtags.append(f"#{home_nickname}")

        if away_team and away_team != team:
            away_tag = away_team.replace(' ', '').replace("'", '').replace('-', '')
            hashtags.append(f"#{away_tag}")

            # Add away nickname if available
            away_nickname = self.TEAM_NICKNAMES.get(away_team)
            if away_nickname:
                hashtags.append(f"#{away_nickname}")

        # 3. Player hashtags
        player = event.get('player')
        if player:
            # Clean player name
            player_tag = player.replace(' ', '').replace("'", '').replace('-', '').replace('.', '')
            hashtags.append(f"#{player_tag}")

        # 4. Competition hashtags
        competition = match_meta.get('competition', 'Local League')
        comp_tags = self.COMPETITION_HASHTAGS.get(competition, ['#Football'])
        hashtags.extend(comp_tags[:2])  # Top 2 competition hashtags

        # 5. Generic football hashtags
        hashtags.extend(self.GENERIC_HASHTAGS[:5])

        # 6. Custom hashtags (from config)
        if self.custom_hashtags:
            custom_tags = self.custom_hashtags.get('always_include', [])
            hashtags.extend(custom_tags[:3])

        # 7. Trending hashtags (if available)
        if self.trending_db:
            trending = self.fetch_trending_hashtags()
            hashtags.extend(trending[:3])  # Top 3 trending

        # 8. Platform-specific hashtags
        hashtags.extend(['#TikTok', '#Reels', '#Shorts', '#Viral', '#Fyp', '#ForYou'])

        # Remove duplicates (case-insensitive) while preserving order
        seen = set()
        unique_hashtags = []
        for tag in hashtags:
            tag_lower = tag.lower()
            if tag_lower not in seen:
                seen.add(tag_lower)
                unique_hashtags.append(tag)

        # Limit to max_hashtags
        return unique_hashtags[:max_hashtags]

    def fetch_trending_hashtags(self):
        """
        Fetch trending hashtags from database or API.

        Returns:
            List of trending hashtags
        """
        # TODO: Integrate with Twitter API, Instagram API, or local database
        # For now, return hardcoded trending tags
        return ['#FPL', '#MOTD', '#WatchThis', '#Trending', '#ViralMoment']

    def format_for_platform(self, hashtags, platform='tiktok'):
        """
        Format hashtags for specific platform.

        Args:
            hashtags: List of hashtag strings
            platform: Platform name (tiktok, instagram, youtube, twitter)

        Returns:
            Formatted string
        """
        if platform == 'tiktok':
            # TikTok: Space-separated, max 30
            return ' '.join(hashtags[:30])

        elif platform == 'instagram':
            # Instagram: Space or line-separated, max 30
            # Common format: 2 line breaks then hashtags
            return '\n\n' + ' '.join(hashtags[:30])

        elif platform == 'youtube':
            # YouTube: Comma-separated in description (no # symbols)
            return ', '.join([tag.replace('#', '') for tag in hashtags])

        elif platform == 'twitter':
            # Twitter: Space-separated, be mindful of character limit
            # Limit to ~10-15 hashtags to save characters for description
            return ' '.join(hashtags[:15])

        else:
            # Default: space-separated
            return ' '.join(hashtags)

    def save_to_file(self, hashtags, output_path, platform='tiktok'):
        """
        Save hashtags to text file.

        Args:
            hashtags: List of hashtags
            output_path: Output file path
            platform: Platform for formatting (tiktok, instagram, youtube)
        """
        formatted = self.format_for_platform(hashtags, platform)

        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(formatted)

        print(f"  ✓ Hashtags saved: {output_path} ({len(hashtags)} tags)")

    def generate_caption_with_hashtags(self, caption_text, hashtags, platform='tiktok'):
        """
        Combine caption text with hashtags.

        Args:
            caption_text: Main caption text
            hashtags: List of hashtags
            platform: Platform for formatting

        Returns:
            Combined caption with hashtags
        """
        formatted_hashtags = self.format_for_platform(hashtags, platform)

        if platform == 'instagram':
            # Instagram: Caption first, then hashtags after line breaks
            return f"{caption_text}\n\n{formatted_hashtags}"

        elif platform == 'tiktok':
            # TikTok: Caption first, hashtags on same line or next line
            return f"{caption_text}\n{formatted_hashtags}"

        elif platform == 'youtube':
            # YouTube: Caption, then tags in description
            return f"{caption_text}\n\nTags: {formatted_hashtags}"

        else:
            return f"{caption_text}\n\n{formatted_hashtags}"

    def add_custom_team_nickname(self, team_name, nickname):
        """
        Add custom team nickname to the database.

        Args:
            team_name: Full team name
            nickname: Nickname/abbreviation
        """
        self.TEAM_NICKNAMES[team_name] = nickname

    def get_hashtag_count_by_category(self, hashtags):
        """
        Analyze hashtag distribution by category.

        Args:
            hashtags: List of hashtags

        Returns:
            Dict with category counts
        """
        counts = {
            'event': 0,
            'team': 0,
            'player': 0,
            'competition': 0,
            'generic': 0,
            'platform': 0,
            'other': 0
        }

        for tag in hashtags:
            tag_lower = tag.lower()

            # Check which category
            if any(tag in event_tags for event_tags in self.EVENT_HASHTAGS.values()):
                counts['event'] += 1
            elif any(tag in comp_tags for comp_tags in self.COMPETITION_HASHTAGS.values()):
                counts['competition'] += 1
            elif tag in self.GENERIC_HASHTAGS:
                counts['generic'] += 1
            elif tag_lower in ['#tiktok', '#reels', '#shorts', '#viral', '#fyp', '#foryou']:
                counts['platform'] += 1
            else:
                # Could be team or player
                counts['other'] += 1

        return counts

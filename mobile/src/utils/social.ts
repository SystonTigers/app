import Share from 'react-native-share';

/**
 * Social sharing utilities
 */

export const social = {
    /**
     * Share text content
     */
    shareText: async (message: string, title?: string) => {
        try {
            const result = await Share.open({
                title: title || 'Share',
                message,
            });
            return result;
        } catch (error: any) {
            if (error.message !== 'User did not share') {
                console.error('Share error:', error);
            }
        }
    },

    /**
     * Share match result
     */
    shareMatchResult: async (homeTeam: string, awayTeam: string, homeScore: number, awayScore: number) => {
        const message = `🏆 ${homeTeam} ${homeScore} - ${awayScore} ${awayTeam}\n\nShared from Boost Huddle`;
        return social.shareText(message, 'Match Result');
    },

    /**
     * Share stats
     */
    sharePlayerStats: async (playerName: string, goals: number, assists: number, apps: number) => {
        const message = `⚽ ${playerName} Stats:\n📊 ${goals} Goals | ${assists} Assists | ${apps} Appearances\n\nShared from Boost Huddle`;
        return social.shareText(message, 'Player Stats');
    },

    /**
     * Share fixture
     */
    shareFixture: async (homeTeam: string, awayTeam: string, date: string, time: string, location: string) => {
        const message = `📅 Upcoming Match\n${homeTeam} vs ${awayTeam}\n🕐 ${date} at ${time}\n📍 ${location}\n\nShared from Boost Huddle`;
        return social.shareText(message, 'Match Fixture');
    },

    /**
     * Share to Instagram Stories (requires image)
     */
    shareToInstagram: async (imageUri: string) => {
        try {
            const result = await Share.shareSingle({
                social: 'instagram-stories' as any,
                url: imageUri,
                backgroundImage: imageUri,
            });
            return result;
        } catch (error) {
            console.error('Instagram share error:', error);
        }
    },
};

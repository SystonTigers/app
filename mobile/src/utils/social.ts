import { Share } from 'react-native';

/**
 * Social sharing utilities
 */

export const social = {
    /**
     * Share text content
     */
    shareText: async (message: string, title?: string) => {
        try {
            const result = await Share.share({ title: title || 'Share', message }, { dialogTitle: title || 'Share' });
            return result;
        } catch (error: any) {
            // Cancelling the share sheet isn't an error worth reporting
            if (error?.name !== 'AbortError' && error?.message !== 'User did not share') {
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

};

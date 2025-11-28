/**
 * Mock test data for E2E tests
 */

export const mockTenant = {
    id: 'test-tenant',
    slug: 'syston-tigers',
    name: 'Syston Tigers FC',
    clubName: 'Syston Tigers FC',
    locale: 'en-GB',
    tz: 'Europe/London',
};

export const mockFixtures = [
    {
        id: 'fixture-1',
        homeTeam: 'Syston Tigers FC',
        awayTeam: 'Leicester City U18',
        date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
        time: '15:00',
        venue: 'Syston Recreation Ground',
        competition: 'Youth League',
        status: 'scheduled' as const,
    },
    {
        id: 'fixture-2',
        homeTeam: 'Syston Tigers FC',
        awayTeam: 'Nottingham Forest U18',
        date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // 14 days from now
        time: '14:30',
        venue: 'Syston Recreation Ground',
        competition: 'Youth League',
        status: 'scheduled' as const,
    },
    {
        id: 'fixture-3',
        homeTeam: 'Derby County U18',
        awayTeam: 'Syston Tigers FC',
        date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days ago
        time: '15:00',
        venue: 'Pride Park',
        competition: 'Youth League',
        status: 'completed' as const,
        homeScore: 2,
        awayScore: 3,
    },
];

export const mockFeedPosts = [
    {
        id: 'post-1',
        content: 'Great win today! The team showed incredible spirit. 🎉',
        author: 'Coach Smith',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
        media: [],
        channels: { fb: true, ig: true },
    },
    {
        id: 'post-2',
        content: 'Match highlights from today\'s game are now available!',
        author: 'Admin',
        timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(), // 5 hours ago
        media: ['https://example.com/image.jpg'],
        channels: { fb: true, x: true },
    },
];

export const mockStats = {
    played: 10,
    won: 6,
    drawn: 2,
    lost: 2,
    goalsFor: 24,
    goalsAgainst: 15,
    goalDifference: 9,
    cleanSheets: 4,
};

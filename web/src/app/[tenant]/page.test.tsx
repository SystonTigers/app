import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const fixturesMock = [
  {
    id: 'fix-1',
    homeTeam: 'Demo FC',
    awayTeam: 'Visitors',
    date: '2025-01-01T12:00:00Z',
    status: 'scheduled',
  },
];

const feedMock = [
  {
    id: 'post-1',
    content: 'Training session moved to 7pm.',
    timestamp: '2025-01-01T10:00:00Z',
  },
];

const tableMock = [
  {
    position: 1,
    team: 'Demo FC',
    played: 1,
    won: 1,
    drawn: 0,
    lost: 0,
    goalsFor: 3,
    goalsAgainst: 1,
    goalDifference: 2,
    points: 3,
  },
];

vi.mock('@/lib/sdk', () => ({
  getServerSDK: () => ({
    listFixtures: vi.fn().mockResolvedValue(fixturesMock),
    listFeed: vi.fn().mockResolvedValue(feedMock),
    getLeagueTable: vi.fn().mockResolvedValue(tableMock),
    getBrand: vi.fn().mockResolvedValue({ clubName: 'Demo FC' }),
  }),
}));

import TenantHomePage from './page';

describe('TenantHomePage', () => {
  it('renders fixtures, feed, and standings for the tenant', async () => {
    const view = await TenantHomePage({ params: { tenant: 'demo' } });
    render(view);

    expect(screen.getByRole('heading', { level: 1, name: 'Demo FC' })).toBeInTheDocument();
    expect(screen.getByText('Demo FC vs Visitors')).toBeInTheDocument();
    expect(screen.getByText('Latest updates')).toBeInTheDocument();
    expect(screen.getByText('Standings snapshot')).toBeInTheDocument();
  });
});

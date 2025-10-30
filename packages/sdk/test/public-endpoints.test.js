const test = require('node:test');
const assert = require('node:assert/strict');
const { TeamPlatformSDK } = require('../dist/index.js');

function createSDK(tenant = 'demo') {
  return new TeamPlatformSDK({ apiBaseUrl: 'http://example.com', tenantId: tenant });
}

function mockClient(sdk, responder) {
  const calls = [];
  const client = {
    interceptors: { request: { use: () => {} } },
    get: async (url, config) => {
      const result = await responder(url, config ?? {});
      calls.push({ url, config: config ?? {}, result });
      return result;
    },
    post: async () => {
      throw new Error('not implemented');
    },
  };
  // eslint-disable-next-line no-param-reassign
  sdk.client = client;
  return calls;
}

function okResponse(data) {
  return { data: { success: true, data } };
}

test('listFixtures uses public endpoint with limit', async () => {
  const sdk = createSDK();
  const fixturesPayload = [{
    id: 'fix-1',
    homeTeam: 'Demo FC',
    awayTeam: 'Visitors',
    date: '2025-01-01T12:00:00Z',
    status: 'scheduled',
  }];
  const calls = mockClient(sdk, async (url, config) => {
    assert.equal(url, '/public/demo/fixtures');
    assert.equal(config?.params?.limit, 5);
    return okResponse(fixturesPayload);
  });

  const fixtures = await sdk.listFixtures(5);
  assert.equal(calls.length, 1);
  assert.deepEqual(fixtures, fixturesPayload);
});

test('listFixtures accepts explicit tenant override', async () => {
  const sdk = createSDK('demo-default');
  const calls = mockClient(sdk, async (url) => {
    assert.equal(url, '/public/alt-tenant/fixtures');
    return okResponse([]);
  });

  const fixtures = await sdk.listFixtures('alt-tenant', 3);
  assert.equal(calls.length, 1);
  assert.deepEqual(fixtures, []);
});

test('listFeed hits public feed endpoint with pagination', async () => {
  const sdk = createSDK();
  const calls = mockClient(sdk, async (url, config) => {
    assert.equal(url, '/public/demo/feed');
    assert.deepEqual(config.params, { page: 2, pageSize: 4 });
    return okResponse([]);
  });

  const feed = await sdk.listFeed(2, 4);
  assert.equal(calls.length, 1);
  assert.deepEqual(feed, []);
});

test('listResults requests completed fixtures', async () => {
  const sdk = createSDK();
  const resultsPayload = [{
    id: 'res-1',
    homeTeam: 'Demo FC',
    awayTeam: 'Visitors',
    date: '2025-01-01T12:00:00Z',
    status: 'completed',
    homeScore: 2,
    awayScore: 1,
  }];
  const calls = mockClient(sdk, async (url, config) => {
    assert.equal(url, '/public/demo/fixtures');
    assert.deepEqual(config.params, { status: 'completed', limit: 6 });
    return okResponse(resultsPayload);
  });

  const results = await sdk.listResults(6);
  assert.equal(calls.length, 1);
  assert.deepEqual(results, resultsPayload);
});

test('getLeagueTable forwards competition filter', async () => {
  const sdk = createSDK();
  const tablePayload = [{
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
  }];
  const calls = mockClient(sdk, async (url, config) => {
    assert.equal(url, '/public/demo/table');
    assert.deepEqual(config.params, { competition: 'league-1' });
    return okResponse(tablePayload);
  });

  const table = await sdk.getLeagueTable(undefined, 'league-1');
  assert.equal(calls.length, 1);
  assert.deepEqual(table, tablePayload);
});

test('getSquad retrieves public squad list', async () => {
  const sdk = createSDK();
  const squadPayload = [{ id: 'p1', name: 'Player One', position: 'Forward' }];
  const calls = mockClient(sdk, async (url) => {
    assert.equal(url, '/public/demo/squad');
    return okResponse(squadPayload);
  });

  const squad = await sdk.getSquad();
  assert.equal(calls.length, 1);
  assert.deepEqual(squad, squadPayload);
});

test('getTeamStats returns stats payload', async () => {
  const sdk = createSDK();
  const statsPayload = { played: 3, won: 2, drawn: 1, lost: 0, goalsFor: 7, goalsAgainst: 2, goalDifference: 5, cleanSheets: 2 };
  const calls = mockClient(sdk, async (url) => {
    assert.equal(url, '/public/demo/stats');
    return okResponse(statsPayload);
  });

  const stats = await sdk.getTeamStats();
  assert.equal(calls.length, 1);
  assert.deepEqual(stats, statsPayload);
});

test('getNextFixture returns null on unsuccessful response', async () => {
  const sdk = createSDK();
  mockClient(sdk, async (url) => {
    assert.equal(url, '/public/demo/fixtures/next');
    return { data: { success: false, error: { code: 'TENANT_NOT_FOUND' } } };
  });

  const fixture = await sdk.getNextFixture();
  assert.equal(fixture, null);
});

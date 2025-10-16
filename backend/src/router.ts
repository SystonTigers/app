import { Router } from 'itty-router';
import { withJSON } from './middleware/json';
import { withTenant } from './middleware/tenant';
import { requireAuth } from './middleware/auth';
import { ok } from './utils/response';

export const router = Router();

// Health check
router.get('/health', (req, env) => ok({ api: 'ok', time: Date.now() }));

// Public proxies (toggle with ALLOW_PUBLIC_APIS)
router.get('/weather', withTenant, withJSON, (req, env) =>
  import('./services/weather').then(m => m.getWeather(req, env))
);

router.get('/fx', withTenant, withJSON, (req, env) =>
  import('./services/fx').then(m => m.getFX(req, env))
);

router.get('/locale', withTenant, withJSON, (req, env) =>
  import('./services/locale').then(m => m.getLocale(req, env))
);

router.get('/maplink', withTenant, withJSON, (req) =>
  import('./utils/time').then(m => m.mapLink(req))
);

// Auth (Supabase proxied)
router.post('/auth/signup', withJSON, (req, env) =>
  import('./services/teams').then(m => m.signup ? m.signup(req, env) : ok({ error: 'Not implemented' }))
);

router.post('/team/create', requireAuth, withTenant, withJSON, (req, env) =>
  import('./services/teams').then(m => m.createTeam ? m.createTeam(req, env) : ok({ error: 'Not implemented' }))
);

router.post('/team/invite', requireAuth, withTenant, withJSON, (req, env) =>
  import('./services/teams').then(m => m.invite ? m.invite(req, env) : ok({ error: 'Not implemented' }))
);

// Tenant config / feature flags
router.get('/tenant/config', withTenant, (req, env) =>
  import('./utils/featureFlags').then(m => m.getConfig(req, env))
);

// Fixtures / Matches
router.get('/fixtures/next', withTenant, (req, env) =>
  import('./services/matches').then(m => m.getNextFixture(req, env))
);

router.get('/matches/:id', withTenant, (req, env) =>
  import('./services/matches').then(m => m.getMatch ? m.getMatch(req, env) : ok({ error: 'Not implemented' }))
);

router.post('/matches/create', requireAuth, withTenant, withJSON, (req, env) =>
  import('./services/matches').then(m => m.createMatch ? m.createMatch(req, env) : ok({ error: 'Not implemented' }))
);

router.put('/matches/:id', requireAuth, withTenant, withJSON, (req, env) =>
  import('./services/matches').then(m => m.updateMatch ? m.updateMatch(req, env) : ok({ error: 'Not implemented' }))
);

// Admin - Fixtures Management
router.get('/api/v1/fixtures', withTenant, (req, env) =>
  import('./services/matches').then(m => m.listFixtures ? m.listFixtures(req, env) : ok({ error: 'Not implemented' }))
);

// TODO: RESTORE AUTH BEFORE PRODUCTION - Currently disabled for testing
router.post('/api/v1/admin/fixtures', requireAuth, withTenant, withJSON, (req, env) =>
  import('./services/matches').then(m => m.createFixture ? m.createFixture(req, env) : ok({ error: 'Not implemented' }))
);

router.put('/api/v1/admin/fixtures/:id', requireAuth, withTenant, withJSON, (req, env) =>
  import('./services/matches').then(m => m.updateFixture ? m.updateFixture(req, env) : ok({ error: 'Not implemented' }))
);

router.delete('/api/v1/admin/fixtures/:id', requireAuth, withTenant, (req, env) =>
  import('./services/matches').then(m => m.deleteFixture ? m.deleteFixture(req, env) : ok({ error: 'Not implemented' }))
);

// Admin - Squad Management
router.get('/api/v1/squad', withTenant, (req, env) =>
  import('./services/matches').then(m => m.listSquad ? m.listSquad(req, env) : ok({ error: 'Not implemented' }))
);

// TODO: RESTORE AUTH BEFORE PRODUCTION - Currently disabled for testing
router.post('/api/v1/admin/squad', requireAuth, withTenant, withJSON, (req, env) =>
  import('./services/matches').then(m => m.createPlayer ? m.createPlayer(req, env) : ok({ error: 'Not implemented' }))
);

router.put('/api/v1/admin/squad/:id', requireAuth, withTenant, withJSON, (req, env) =>
  import('./services/matches').then(m => m.updatePlayer ? m.updatePlayer(req, env) : ok({ error: 'Not implemented' }))
);

router.delete('/api/v1/admin/squad/:id', requireAuth, withTenant, (req, env) =>
  import('./services/matches').then(m => m.deletePlayer ? m.deletePlayer(req, env) : ok({ error: 'Not implemented' }))
);

// Feed / Posts
router.get('/api/v1/feed', withTenant, (req, env) =>
  import('./services/matches').then(m => m.listPosts ? m.listPosts(req, env) : ok({ error: 'Not implemented' }))
);

// TODO: RESTORE AUTH BEFORE PRODUCTION - Currently disabled for testing
router.post('/api/v1/feed/create', requireAuth, withTenant, withJSON, (req, env) =>
  import('./services/matches').then(m => m.createPost ? m.createPost(req, env) : ok({ error: 'Not implemented' }))
);

// Match events (goals, cards, subs, etc.)
router.post('/matches/:id/events', requireAuth, withTenant, withJSON, (req, env) =>
  import('./services/events').then(m => m.addEvent ? m.addEvent(req, env) : ok({ error: 'Not implemented' }))
);

router.get('/matches/:id/events', withTenant, (req, env) =>
  import('./services/events').then(m => m.getMatchEvents ? m.getMatchEvents(req, env) : ok({ error: 'Not implemented' }))
);

// Stats
router.get('/stats/team', withTenant, (req, env) =>
  import('./services/stats').then(m => m.teamStats(req, env))
);

router.get('/stats/players', withTenant, (req, env) =>
  import('./services/stats').then(m => m.playerStats(req, env))
);

router.get('/stats/top-scorers', withTenant, (req, env) =>
  import('./services/stats').then(m => m.getTopScorers ? m.getTopScorers(req, env) : ok({ error: 'Not implemented' }))
);

// Live updates
router.get('/events/live', withTenant, (req, env) =>
  import('./services/events').then(m => m.getLive(req, env))
);

router.post('/events/live', withTenant, withJSON, (req, env) =>
  import('./services/events').then(m => m.postLive(req, env))
);

// League table
router.get('/league/table', withTenant, (req, env) =>
  import('./services/matches').then(m => m.getLeagueTable(req, env))
);

router.post('/league/table', requireAuth, withTenant, withJSON, (req, env) =>
  import('./services/matches').then(m => m.upsertLeagueTable(req, env))
);

// Slogans (static generator)
router.get('/slogan', withTenant, (req, env) =>
  import('./services/slogans').then(m => m.getSlogans(req))
);

// Render (SVG→PNG)
router.post('/render', withTenant, withJSON, (req, env) =>
  import('./services/render').then(m => m.renderGraphic(req, env))
);

router.get('/render/:id/status', withTenant, (req, env) =>
  import('./services/render').then(m => m.getRenderStatus ? m.getRenderStatus(req, env) : ok({ error: 'Not implemented' }))
);

// Usage (Make.com)
router.get('/usage/make/allowed', withTenant, (req, env) =>
  import('./services/usage').then(m => m.allowed(req, env))
);

router.post('/usage/make/increment', withTenant, withJSON, (req, env) =>
  import('./services/usage').then(m => m.increment(req, env))
);

router.get('/usage', withTenant, (req, env) =>
  import('./services/usage').then(m => m.getUsage ? m.getUsage(req, env) : ok({ error: 'Not implemented' }))
);

// Shop
router.post('/shop/customize', withTenant, withJSON, (req, env) =>
  import('./services/shop').then(m => m.customize(req, env))
);

router.get('/shop/products', withTenant, (req, env) =>
  import('./services/shop').then(m => m.getProducts ? m.getProducts(req, env) : ok({ error: 'Not implemented' }))
);

router.post('/shop/orders', requireAuth, withTenant, withJSON, (req, env) =>
  import('./services/shop').then(m => m.createOrder ? m.createOrder(req, env) : ok({ error: 'Not implemented' }))
);

router.get('/shop/orders/:id', requireAuth, withTenant, (req, env) =>
  import('./services/shop').then(m => m.getOrder ? m.getOrder(req, env) : ok({ error: 'Not implemented' }))
);

// Push notifications
router.post('/push/register', withTenant, withJSON, (req, env) =>
  import('./services/push').then(m => m.register ? m.register(req, env) : ok({ error: 'Not implemented' }))
);

router.post('/push/send', withTenant, withJSON, (req, env) =>
  import('./services/push').then(m => m.send ? m.send(req, env) : ok({ error: 'Not implemented' }))
);

router.get('/push/history', withTenant, (req, env) =>
  import('./services/push').then(m => m.getHistory ? m.getHistory(req, env) : ok({ error: 'Not implemented' }))
);

router.post('/push/unregister', withTenant, withJSON, (req, env) =>
  import('./services/push').then(m => m.unregister ? m.unregister(req, env) : ok({ error: 'Not implemented' }))
);

// Calendar / Events (using existing events service)
router.get('/events', withTenant, (req, env) =>
  import('./services/events').then(m => m.listEvents ? m.listEvents(env, req.tenant) : ok({ error: 'Not implemented' }))
);

router.get('/events/:id', withTenant, (req, env) =>
  import('./services/events').then(m => m.getEvent ? m.getEvent(env, req.tenant, req.params.id) : ok({ error: 'Not implemented' }))
);

// TODO: RESTORE AUTH BEFORE PRODUCTION - Currently disabled for testing
router.post('/events', requireAuth, withTenant, withJSON, (req, env) =>
  import('./services/events').then(m => m.putEvent ? m.putEvent(env, req.tenant, req.json) : ok({ error: 'Not implemented' }))
);

router.delete('/events/:id', requireAuth, withTenant, (req, env) =>
  import('./services/events').then(m => m.deleteEvent ? m.deleteEvent(env, req.tenant, req.params.id) : ok({ error: 'Not implemented' }))
);

// RSVP endpoints
router.post('/events/:id/rsvp', requireAuth, withTenant, withJSON, (req, env) =>
  import('./services/events').then(m => m.setRsvp ? m.setRsvp(env, req.tenant, req.params.id, req.json.userId, req.json.rsvp) : ok({ error: 'Not implemented' }))
);

router.get('/events/:id/rsvp/:userId', withTenant, (req, env) =>
  import('./services/events').then(m => m.getRsvp ? m.getRsvp(env, req.tenant, req.params.id, req.params.userId) : ok({ error: 'Not implemented' }))
);

// Check-ins
router.post('/events/:id/checkin', requireAuth, withTenant, withJSON, (req, env) =>
  import('./services/events').then(m => m.addCheckin ? m.addCheckin(env, req.tenant, req.params.id, req.json.userId) : ok({ error: 'Not implemented' }))
);

router.get('/events/:id/checkins', withTenant, (req, env) =>
  import('./services/events').then(m => m.listCheckins ? m.listCheckins(env, req.tenant, req.params.id) : ok({ error: 'Not implemented' }))
);

// 404 handler
router.all('*', () => new Response('Not Found', { status: 404 }));

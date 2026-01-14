import { json } from "../services/util";
import { requireJWT } from "../services/auth";
import { scrapeWebsite, parseSnippet, syncFixturesToDB, FAFixture } from "../services/fa-scraper";

/**
 * Season Scraper Configuration Routes
 * Manage FA Full-Time scraper settings per season
 */

// GET /api/v1/scraper/configs - List all season scraper configs
export async function handleGetScraperConfigs(req: Request, env: any, corsHdrs: Headers) {
    try {
        const claims = await requireJWT(req, env);

        const configs = await env.DB.prepare(`
            SELECT 
                sc.*,
                s.name as season_name,
                s.is_current as is_current_season
            FROM season_scraper_configs sc
            JOIN seasons s ON s.id = sc.season_id
            WHERE sc.tenant_id = ?
            ORDER BY s.is_current DESC, s.start_date DESC
        `).bind(claims.tenantId).all();

        return json({ success: true, data: configs.results || [] }, 200, corsHdrs);
    } catch (err: any) {
        console.error('Get scraper configs error:', err);
        return json({ success: false, error: err.message }, 500, corsHdrs);
    }
}

// GET /api/v1/scraper/configs/:seasonId - Get config for specific season
export async function handleGetScraperConfig(req: Request, env: any, corsHdrs: Headers, seasonId: string) {
    try {
        const claims = await requireJWT(req, env);

        const config = await env.DB.prepare(`
            SELECT 
                sc.*,
                s.name as season_name
            FROM season_scraper_configs sc
            JOIN seasons s ON s.id = sc.season_id
            WHERE sc.season_id = ? AND sc.tenant_id = ?
        `).bind(seasonId, claims.tenantId).first();

        if (!config) {
            return json({ success: false, error: 'Scraper config not found' }, 404, corsHdrs);
        }

        return json({ success: true, data: config }, 200, corsHdrs);
    } catch (err: any) {
        console.error('Get scraper config error:', err);
        return json({ success: false, error: err.message }, 500, corsHdrs);
    }
}

// POST /api/v1/scraper/configs - Create or update scraper config
export async function handleSaveScraperConfig(req: Request, env: any, corsHdrs: Headers) {
    try {
        const claims = await requireJWT(req, env);
        const body = await req.json() as {
            seasonId: string;
            faTeamPageUrl?: string;
            faSnippetUrl?: string;
            teamName: string;
            isActive?: boolean;
        };

        if (!body.seasonId || !body.teamName) {
            return json({ success: false, error: 'seasonId and teamName are required' }, 400, corsHdrs);
        }

        // Verify season exists and belongs to tenant
        const season = await env.DB.prepare(
            'SELECT id FROM seasons WHERE id = ? AND tenant_id = ?'
        ).bind(body.seasonId, claims.tenantId).first();

        if (!season) {
            return json({ success: false, error: 'Season not found' }, 404, corsHdrs);
        }

        // Check if config exists
        const existing = await env.DB.prepare(
            'SELECT id FROM season_scraper_configs WHERE season_id = ? AND tenant_id = ?'
        ).bind(body.seasonId, claims.tenantId).first();

        const now = Date.now();

        if (existing) {
            // Update existing config
            await env.DB.prepare(`
                UPDATE season_scraper_configs SET
                    fa_team_page_url = ?,
                    fa_snippet_url = ?,
                    team_name = ?,
                    is_active = ?,
                    updated_at = ?
                WHERE id = ?
            `).bind(
                body.faTeamPageUrl || null,
                body.faSnippetUrl || null,
                body.teamName,
                body.isActive !== false ? 1 : 0,
                now,
                existing.id
            ).run();

            return json({ success: true, configId: existing.id, message: 'Config updated' }, 200, corsHdrs);
        } else {
            // Create new config
            const configId = crypto.randomUUID();
            await env.DB.prepare(`
                INSERT INTO season_scraper_configs (
                    id, tenant_id, season_id, fa_team_page_url, fa_snippet_url,
                    team_name, is_active, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).bind(
                configId,
                claims.tenantId,
                body.seasonId,
                body.faTeamPageUrl || null,
                body.faSnippetUrl || null,
                body.teamName,
                body.isActive !== false ? 1 : 0,
                now,
                now
            ).run();

            return json({ success: true, configId, message: 'Config created' }, 201, corsHdrs);
        }
    } catch (err: any) {
        console.error('Save scraper config error:', err);
        return json({ success: false, error: err.message }, 500, corsHdrs);
    }
}

// DELETE /api/v1/scraper/configs/:seasonId - Delete scraper config
export async function handleDeleteScraperConfig(req: Request, env: any, corsHdrs: Headers, seasonId: string) {
    try {
        const claims = await requireJWT(req, env);

        const result = await env.DB.prepare(
            'DELETE FROM season_scraper_configs WHERE season_id = ? AND tenant_id = ?'
        ).bind(seasonId, claims.tenantId).run();

        if (result.meta.changes === 0) {
            return json({ success: false, error: 'Config not found' }, 404, corsHdrs);
        }

        return json({ success: true, message: 'Config deleted' }, 200, corsHdrs);
    } catch (err: any) {
        console.error('Delete scraper config error:', err);
        return json({ success: false, error: err.message }, 500, corsHdrs);
    }
}

// POST /api/v1/scraper/run/:seasonId - Manually trigger scrape for season
export async function handleRunScraperForSeason(req: Request, env: any, corsHdrs: Headers, seasonId: string) {
    try {
        const claims = await requireJWT(req, env);

        // Get scraper config for this season
        const config = await env.DB.prepare(`
            SELECT * FROM season_scraper_configs
            WHERE season_id = ? AND tenant_id = ? AND is_active = 1
        `).bind(seasonId, claims.tenantId).first() as any;

        if (!config) {
            return json({ success: false, error: 'No active scraper config found for this season' }, 404, corsHdrs);
        }

        const fixtures: FAFixture[] = [];

        // Scrape from team page if URL provided
        if (config.fa_team_page_url) {
            const pageFixtures = await scrapeWebsite(config.fa_team_page_url, config.team_name);
            fixtures.push(...pageFixtures);
        }

        // Scrape from snippet if URL provided
        if (config.fa_snippet_url) {
            const snippetFixtures = await parseSnippet(config.fa_snippet_url, config.team_name);
            fixtures.push(...snippetFixtures);
        }

        if (fixtures.length === 0) {
            return json({
                success: false,
                error: 'No fixtures found. Check URLs and team name.'
            }, 400, corsHdrs);
        }

        // Sync fixtures to database with season_id
        const syncResult = await syncFixturesToDBWithSeason(
            fixtures,
            env,
            claims.tenantId,
            seasonId
        );

        // Update last scraped timestamp and result
        await env.DB.prepare(`
            UPDATE season_scraper_configs SET
                last_scraped_at = ?,
                last_scrape_result = ?,
                updated_at = ?
            WHERE id = ?
        `).bind(
            Date.now(),
            JSON.stringify(syncResult),
            Date.now(),
            config.id
        ).run();

        return json({
            success: true,
            fixtures: fixtures.length,
            ...syncResult
        }, 200, corsHdrs);
    } catch (err: any) {
        console.error('Run scraper error:', err);
        return json({ success: false, error: err.message }, 500, corsHdrs);
    }
}

// Helper: Sync fixtures with season_id
async function syncFixturesToDBWithSeason(
    fixtures: FAFixture[],
    env: any,
    tenantId: string,
    seasonId: string
): Promise<{ added: number; updated: number; errors: string[] }> {
    const result = { added: 0, updated: 0, errors: [] as string[] };

    for (const fixture of fixtures) {
        try {
            // Check if fixture already exists
            const existing = await env.DB.prepare(`
                SELECT id FROM fixtures 
                WHERE tenant_id = ? 
                AND season_id = ?
                AND opponent = ? 
                AND date = ?
            `).bind(tenantId, seasonId, fixture.opponent, fixture.date).first();

            if (existing) {
                // Update existing fixture
                await env.DB.prepare(`
                    UPDATE fixtures SET
                        time = ?,
                        home_team = ?,
                        away_team = ?,
                        venue = ?,
                        competition = ?,
                        status = ?,
                        home_score = ?,
                        away_score = ?,
                        source = ?,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                `).bind(
                    fixture.time,
                    fixture.homeTeam,
                    fixture.awayTeam,
                    fixture.venue,
                    fixture.competition,
                    fixture.status,
                    fixture.homeScore ?? null,
                    fixture.awayScore ?? null,
                    fixture.source,
                    existing.id
                ).run();

                result.updated++;
            } else {
                // Insert new fixture with season_id
                await env.DB.prepare(`
                    INSERT INTO fixtures (
                        id, tenant_id, season_id, date, time, home_team, away_team, opponent,
                        venue, competition, status, home_score, away_score, source,
                        created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                `).bind(
                    crypto.randomUUID(),
                    tenantId,
                    seasonId,
                    fixture.date,
                    fixture.time,
                    fixture.homeTeam,
                    fixture.awayTeam,
                    fixture.opponent,
                    fixture.venue,
                    fixture.competition,
                    fixture.status,
                    fixture.homeScore ?? null,
                    fixture.awayScore ?? null,
                    fixture.source
                ).run();

                result.added++;
            }
        } catch (error: any) {
            result.errors.push(`Failed to sync fixture ${fixture.opponent}: ${error.message}`);
        }
    }

    return result;
}

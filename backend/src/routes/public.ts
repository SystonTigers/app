import { json } from "../services/util";
import { logJSON } from "../lib/log";

type TenantRow = { id: string; slug: string; name?: string | null };
type PublicFixture = {
    id: string;
    homeTeam: string;
    awayTeam: string;
    date: string;
    time?: string;
    venue?: string | null;
    competition?: string | null;
    status: "scheduled" | "live" | "completed" | "postponed" | "cancelled";
    homeScore?: number;
    awayScore?: number;
};
type PublicResult = PublicFixture & {
    status: "completed";
    homeScore: number;
    awayScore: number;
    scorers?: string[];
};
type PublicFeedPost = {
    id: string;
    content: string;
    author?: string | null;
    timestamp: string;
    media?: string[];
    channels?: Record<string, boolean>;
};
type PublicTeamStats = {
    played: number;
    won: number;
    drawn: number;
    lost: number;
    goalsFor: number;
    goalsAgainst: number;
    goalDifference: number;
    cleanSheets?: number;
};
type PublicPlayer = {
    id: string;
    name: string;
    number?: number;
    position?: string;
    photo?: string;
    stats?: Record<string, number>;
};

async function resolveTenantRecord(env: any, tenantSlugOrId: string): Promise<TenantRow | null> {
    const lookup = tenantSlugOrId.trim();
    if (!lookup) { return null; }

    const bySlug = await env.DB.prepare(
        `SELECT id, slug, name FROM tenants WHERE LOWER(slug) = LOWER(?) LIMIT 1`
    )
        .bind(lookup)
        .first();
    if (bySlug) { return bySlug as TenantRow; }

    const byId = await env.DB.prepare(
        `SELECT id, slug, name FROM tenants WHERE id = ? LIMIT 1`
    )
        .bind(lookup)
        .first();
    if (byId) { return byId as TenantRow; }

    try {
        const cfgRaw = await env.KV_IDEMP.get(`tenant:${lookup}`);
        if (cfgRaw) {
            const parsed = JSON.parse(cfgRaw);
            if (parsed && typeof parsed === "object" && typeof parsed.id === "string") {
                return {
                    id: parsed.id,
                    slug: typeof parsed.slug === "string" ? parsed.slug : lookup,
                    name: typeof parsed.name === "string" ? parsed.name : parsed.clubName || null,
                };
            }
        }
    } catch (err) {
    }

    return null;
}

function toIsoDate(dateValue: any, timeValue?: any): string {
    if (typeof dateValue === "number") {
        const d = new Date(dateValue);
        if (!Number.isNaN(d.getTime())) { return d.toISOString(); }
    }
    if (typeof dateValue === "string" && dateValue) {
        if (/^\d{13}$/.test(dateValue)) {
            const d = new Date(Number(dateValue));
            if (!Number.isNaN(d.getTime())) { return d.toISOString(); }
        }
        if (dateValue.includes("T")) {
            const d = new Date(dateValue);
            if (!Number.isNaN(d.getTime())) { return d.toISOString(); }
        }
        const normalizedTime = typeof timeValue === "string" && timeValue
            ? timeValue.length === 5
                ? `${timeValue}:00`
                : timeValue
            : "00:00:00";
        for (const suffix of ["", "Z"]) {
            const candidate = `${dateValue}T${normalizedTime}${suffix}`;
            const d = new Date(candidate);
            if (!Number.isNaN(d.getTime())) { return d.toISOString(); }
        }
    }
    const fallback = new Date();
    return fallback.toISOString();
}

function normaliseStatus(raw?: string | null): PublicFixture["status"] {
    const value = (raw || "").toString().toLowerCase();
    if (["ft", "full-time", "finished", "final", "completed"].includes(value)) { return "completed"; }
    if (["live", "in_progress", "in-play", "ongoing"].includes(value)) { return "live"; }
    if (["postponed", "delayed"].includes(value)) { return "postponed"; }
    if (["cancelled", "canceled", "abandoned"].includes(value)) { return "cancelled"; }
    return "scheduled";
}

function toScore(value: unknown): number | null {
    if (value === null || value === undefined || value === "") { return null; }
    if (typeof value === "number" && Number.isFinite(value)) {
        return Math.trunc(value);
    }
    const asNumber = Number(value);
    return Number.isFinite(asNumber) ? Math.trunc(asNumber) : null;
}

function parseScorersField(value: unknown): string[] {
    if (!value) { return []; }
    if (Array.isArray(value)) {
        return value
            .map((entry) => String(entry || "").trim())
            .filter(Boolean);
    }

    if (typeof value === "string") {
        const trimmed = value.trim();
        if (!trimmed) { return []; }
        try {
            const parsed = JSON.parse(trimmed);
            if (Array.isArray(parsed)) {
                return parsed
                    .map((entry) => String(entry || "").trim())
                    .filter(Boolean);
            }
        } catch (err) {
            // Ignore JSON parse errors and fall back to string splitting
        }
        return trimmed
            .split(/[,;\n]/)
            .map((entry) => entry.trim())
            .filter(Boolean);
    }

    return [];
}

function mapFixtureRow(row: any, tenantName?: string | null): PublicFixture {
    const iso = toIsoDate(row.fixture_date ?? row.date ?? row.kickoffIso ?? row.kickoff ?? row.match_date, row.kick_off_time ?? row.kickOffTime ?? row.time);
    const status = normaliseStatus(row.match_status ?? row.matchStatus ?? row.status);
    const homeTeam =
        row.home_team ??
        row.homeTeam ??
        (status === "completed" && typeof row.home_score === "number" && typeof row.away_score === "number"
            ? tenantName ?? "Home"
            : tenantName ?? "Home");
    const awayTeam = row.away_team ?? row.awayTeam ?? row.opponent ?? "Opponent";
    const result: PublicFixture = {
        id: String(row.id ?? row.uuid ?? crypto.randomUUID()),
        homeTeam,
        awayTeam,
        date: iso,
        venue: row.venue ?? null,
        competition: row.competition ?? null,
        status,
    };
    const timeValue = row.kick_off_time ?? row.kickOffTime ?? row.time ?? null;
    if (timeValue) { result.time = String(timeValue); }
    const homeScore = row.home_score ?? row.homeScore ?? row.our_score ?? row.ourScore;
    const awayScore = row.away_score ?? row.awayScore ?? row.their_score ?? row.theirScore;
    if (homeScore !== undefined && homeScore !== null && !Number.isNaN(Number(homeScore))) {
        result.homeScore = Number(homeScore);
    }
    if (awayScore !== undefined && awayScore !== null && !Number.isNaN(Number(awayScore))) {
        result.awayScore = Number(awayScore);
    }
    if (result.homeScore !== undefined || result.awayScore !== undefined) {
        result.status = "completed";
    }
    return result;
}

function mapResultRow(row: any, tenantName?: string | null): PublicResult {
    const base = mapFixtureRow(
        {
            ...row,
            fixture_date: row.match_date ?? row.date,
            kick_off_time: row.kick_off_time ?? row.time,
            home_team: tenantName ?? row.home_team,
            away_team: row.away_team ?? row.opponent,
            home_score: row.our_score ?? row.home_score,
            away_score: row.their_score ?? row.away_score,
            status: "completed",
            match_status: "completed",
        },
        tenantName
    );

    const scorersRaw = row.scorers ?? row.goal_scorers ?? null;
    const scorers = typeof scorersRaw === "string"
        ? scorersRaw
            .split(/[,;\n]/)
            .map((s) => s.trim())
            .filter(Boolean)
        : Array.isArray(scorersRaw)
            ? scorersRaw.filter(Boolean).map((s) => String(s))
            : undefined;

    return {
        ...base,
        status: "completed",
        homeScore: base.homeScore ?? Number(row.our_score ?? 0),
        awayScore: base.awayScore ?? Number(row.their_score ?? 0),
        ...(scorers && scorers.length ? { scorers } : {}),
    };
}

function mapFeedRow(row: any): PublicFeedPost {
    const timestamp = toIsoDate(row.created_at ?? row.createdAt ?? Date.now(), null);
    const mediaSource = row.image_url ?? row.media_url ?? row.media;
    let media: string[] | undefined;
    if (Array.isArray(mediaSource)) {
        media = mediaSource.map((m) => String(m));
    } else if (typeof mediaSource === "string" && mediaSource.trim()) {
        media = [mediaSource.trim()];
    }
    return {
        id: String(row.id ?? row.uuid ?? crypto.randomUUID()),
        content: String(row.content ?? row.title ?? ""),
        author: row.author ?? row.created_by ?? null,
        timestamp,
        media,
        channels: row.channels && typeof row.channels === "object" ? row.channels : undefined,
    };
}

function buildTeamStats(rows: any[]): PublicTeamStats {
    const stats: PublicTeamStats = {
        played: 0,
        won: 0,
        drawn: 0,
        lost: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        goalDifference: 0,
        cleanSheets: 0,
    };

    for (const row of rows) {
        const our = Number(row.our_score ?? row.home_score ?? row.homeScore ?? 0);
        const their = Number(row.their_score ?? row.away_score ?? row.awayScore ?? 0);
        if (Number.isNaN(our) || Number.isNaN(their)) { continue; }
        stats.played += 1;
        stats.goalsFor += our;
        stats.goalsAgainst += their;
        stats.goalDifference = stats.goalsFor - stats.goalsAgainst;
        if (our > their) { stats.won += 1; }
        else if (our === their) { stats.drawn += 1; }
        else { stats.lost += 1; }
        if (their === 0) { stats.cleanSheets = (stats.cleanSheets ?? 0) + 1; }
    }

    return stats;
}

function mapSquadPlayers(raw: any[]): PublicPlayer[] {
    return raw
        .map((player) => {
            if (!player) { return null; }
            const stats: Record<string, number> = {};
            for (const key of ["appearances", "goals", "assists", "yellowCards", "redCards"]) {
                if (player[key] !== undefined && player[key] !== null && !Number.isNaN(Number(player[key]))) {
                    stats[key] = Number(player[key]);
                }
            }
            return {
                id: String(player.id ?? player.player_id ?? crypto.randomUUID()),
                name: String(player.name ?? player.fullName ?? "Player"),
                number: player.number !== undefined && player.number !== null ? Number(player.number) : undefined,
                position: player.position ?? player.role ?? undefined,
                photo: player.photo ?? player.image_url ?? undefined,
                stats: Object.keys(stats).length ? stats : undefined,
            } as PublicPlayer;
        })
        .filter(Boolean) as PublicPlayer[];
}

export async function handlePublicTenantRequest(
    req: Request,
    env: any,
    url: URL,
    corsHdrs: Headers,
    requestId: string
): Promise<Response | null> {
    if (req.method !== "GET") { return null; }
    if (!url.pathname.startsWith("/public/")) { return null; }

    const segments = url.pathname.split("/").filter(Boolean);
    if (segments.length < 2) {
        return json({ success: false, error: { code: "NOT_FOUND", message: "Invalid public route" } }, 404, corsHdrs);
    }

    const tenantSlug = decodeURIComponent(segments[1]);
    let tenant: TenantRow | null = null;
    try {
        tenant = await resolveTenantRecord(env, tenantSlug);
    } catch (err) {
        logJSON({ level: "error", requestId, msg: "TENANT_RESOLVE_FAIL", tenant: tenantSlug, error: String(err) });
        return json({ success: false, error: { code: "INTERNAL", message: "Failed to resolve tenant" } }, 500, corsHdrs);
    }

    if (!tenant) {
        return json({ success: false, error: { code: "TENANT_NOT_FOUND", message: "Unknown tenant" } }, 404, corsHdrs);
    }

    const resource = segments[2] || "fixtures";

    try {
        if (resource === "fixtures" && segments[3] === "next") {
            const row = await env.DB.prepare(
                `SELECT
            id,
            fixture_date,
            opponent,
            venue,
            competition,
            kick_off_time,
            status,
            match_status,
            home_team,
            away_team,
            home_score,
            away_score
         FROM fixtures
         WHERE tenant_id = ?
           AND fixture_date >= DATE('now')
           AND (status IS NULL OR status != 'postponed')
         ORDER BY fixture_date ASC, COALESCE(kick_off_time, '23:59') ASC
         LIMIT 1`
            )
                .bind(tenant.id)
                .first();

            const fixture = row ? mapFixtureRow(row, tenant.name ?? tenant.slug) : null;
            return json({ success: true, data: fixture }, 200, corsHdrs);
        }

        if (resource === "fixtures") {
            const limit = Math.min(parseInt(url.searchParams.get("limit") || "10", 10) || 10, 50);
            const statusParam = (url.searchParams.get("status") || url.searchParams.get("type") || "").toLowerCase();
            const seasonId = url.searchParams.get("seasonId");

            if (["completed", "result", "results"].includes(statusParam)) {
                const seasonWhere = seasonId ? `AND tr.season_id = ?` : '';
                const binds = seasonId ? [tenant.id, seasonId, limit] : [tenant.id, limit];

                const results = await env.DB.prepare(
                    `SELECT id, tenant_id, match_date, competition, opponent, venue, our_score, their_score, scorers
             FROM team_results tr
             WHERE tenant_id = ? ${seasonWhere}
             ORDER BY match_date DESC
             LIMIT ?`
                )
                    .bind(...binds)
                    .all();

                const mapped = (results.results || []).map((row: any) => mapResultRow(row, tenant.name ?? tenant.slug));
                return json({ success: true, data: mapped }, 200, corsHdrs);
            }

            const seasonWhere = seasonId ? `AND f.season_id = ?` : '';
            const binds = seasonId ? [tenant.id, seasonId, limit] : [tenant.id, limit];

            const rows = await env.DB.prepare(
                `SELECT
            id,
            fixture_date,
            opponent,
            venue,
            competition,
            kick_off_time,
            status,
            match_status,
            home_team,
            away_team,
            home_score,
            away_score,
            season_id
         FROM fixtures f
         WHERE tenant_id = ? ${seasonWhere}
           AND fixture_date >= DATE('now', '-7 days')
         ORDER BY fixture_date ASC, COALESCE(kick_off_time, '23:59') ASC
         LIMIT ?`
            )
                .bind(...binds)
                .all();

            const fixtures = (rows.results || []).map((row: any) => mapFixtureRow(row, tenant.name ?? tenant.slug));
            return json({ success: true, data: fixtures }, 200, corsHdrs);
        }

        if (resource === "feed") {
            const page = Math.max(parseInt(url.searchParams.get("page") || "1", 10) || 1, 1);
            const pageSize = Math.min(parseInt(url.searchParams.get("pageSize") || url.searchParams.get("limit") || "10", 10) || 10, 50);
            const offset = (page - 1) * pageSize;
            const rows = await env.DB.prepare(
                `SELECT id, tenant_id, title, content, author, image_url, created_at
           FROM feed_posts
           WHERE tenant_id = ?
           ORDER BY created_at DESC
           LIMIT ? OFFSET ?`
            )
                .bind(tenant.id, pageSize, offset)
                .all();

            const posts = (rows.results || []).map((row: any) => mapFeedRow(row));
            return json({ success: true, data: posts }, 200, corsHdrs);
        }

        if (resource === "table") {
            const competition = url.searchParams.get("competition");
            const seasonId = url.searchParams.get("seasonId");

            let stmt;
            if (competition && seasonId) {
                stmt = env.DB.prepare(
                    `SELECT position, team_name, played, won, drawn, lost, goals_for, goals_against, goal_difference, points
               FROM league_standings
               WHERE tenant_id = ? AND competition = ? AND season_id = ?
               ORDER BY position ASC`
                ).bind(tenant.id, competition, seasonId);
            } else if (competition) {
                stmt = env.DB.prepare(
                    `SELECT position, team_name, played, won, drawn, lost, goals_for, goals_against, goal_difference, points
               FROM league_standings
               WHERE tenant_id = ? AND competition = ?
               ORDER BY position ASC`
                ).bind(tenant.id, competition);
            } else if (seasonId) {
                stmt = env.DB.prepare(
                    `SELECT position, team_name, played, won, drawn, lost, goals_for, goals_against, goal_difference, points
               FROM league_standings
               WHERE tenant_id = ? AND season_id = ?
               ORDER BY competition ASC, position ASC`
                ).bind(tenant.id, seasonId);
            } else {
                stmt = env.DB.prepare(
                    `SELECT position, team_name, played, won, drawn, lost, goals_for, goals_against, goal_difference, points
               FROM league_standings
               WHERE tenant_id = ?
               ORDER BY competition ASC, position ASC`
                ).bind(tenant.id);
            }

            const rows = await stmt.all();
            const table = (rows.results || []).map((row: any) => ({
                position: Number(row.position ?? 0),
                team: String(row.team_name ?? row.team ?? ""),
                played: Number(row.played ?? 0),
                won: Number(row.won ?? 0),
                drawn: Number(row.drawn ?? 0),
                lost: Number(row.lost ?? 0),
                goalsFor: Number(row.goals_for ?? 0),
                goalsAgainst: Number(row.goals_against ?? 0),
                goalDifference: Number(row.goal_difference ?? (row.goals_for ?? 0) - (row.goals_against ?? 0)),
                points: Number(row.points ?? 0),
            }));
            return json({ success: true, data: table }, 200, corsHdrs);
        }

        if (resource === "stats") {
            const rows = await env.DB.prepare(
                `SELECT tenant_id, match_date, our_score, their_score
           FROM team_results
           WHERE tenant_id = ?
           ORDER BY match_date DESC
           LIMIT 100`
            )
                .bind(tenant.id)
                .all();

            const stats = buildTeamStats(rows.results || []);
            return json({ success: true, data: stats }, 200, corsHdrs);
        }

        if (resource === "seasons") {
            const rows = await env.DB.prepare(
                `SELECT id, name, start_date, end_date, is_current, status
         FROM seasons
         WHERE tenant_id = ?
         ORDER BY start_date DESC`
            )
                .bind(tenant.id)
                .all();

            const seasons = (rows.results || []).map((row: any) => ({
                id: row.id,
                name: row.name,
                startDate: row.start_date,
                endDate: row.end_date,
                isCurrent: row.is_current === 1,
                status: row.status
            }));

            return json({ success: true, data: seasons }, 200, corsHdrs);
        }

        if (resource === "stats" && segments[3] === "fun") {
            // Import fun stats service
            const { getCachedFunStats, computeFunStats, cacheFunStats } = await import("../services/funStats");
            const seasonId = url.searchParams.get("seasonId") || undefined;

            let stats = await getCachedFunStats(env.DB, tenant.id, seasonId);

            // If no cache, compute
            if (stats.length === 0) {
                stats = await computeFunStats(env.DB, tenant.id, seasonId);
                await cacheFunStats(env.DB, tenant.id, seasonId || null, stats);
            }

            return json({ success: true, data: stats }, 200, corsHdrs);
        }

        if (resource === "squad") {
            const raw = (await env.KV_IDEMP.get(`squad:${tenant.id}:list`, "json")) as any[] | null;
            if (!raw) return json({ success: true, data: [] }, 200, corsHdrs);

            // Fetch stats from D1
            const statsRows = await env.DB.prepare(`
                SELECT 
                    player_id,
                    COUNT(CASE WHEN event_type = 'goal' THEN 1 END) as goals,
                    COUNT(CASE WHEN event_type = 'assist' THEN 1 END) as assists,
                    COUNT(CASE WHEN event_type = 'motm' THEN 1 END) as motm,
                    COUNT(CASE WHEN event_type = 'yellow_card' THEN 1 END) as yellow_cards,
                    COUNT(CASE WHEN event_type = 'red_card' THEN 1 END) as red_cards,
                    COUNT(DISTINCT fixture_id) as appearances
                FROM match_events
                WHERE tenant_id = ?
                GROUP BY player_id
            `).bind(tenant.id).all();

            const statsMap = new Map<string, any>();
            (statsRows.results || []).forEach((row: any) => {
                statsMap.set(row.player_id, row);
            });

            // Merge stats into players
            const squad = mapSquadPlayers(raw).map(p => {
                const s = statsMap.get(p.id);
                if (s) {
                    return {
                        ...p,
                        stats: {
                            goals: s.goals,
                            assists: s.assists,
                            motm: s.motm,
                            appearances: s.appearances,
                            yellowCards: s.yellow_cards,
                            redCards: s.red_cards
                        }
                    };
                }
                return p;
            });

            return json({ success: true, data: squad }, 200, corsHdrs);
        }

        return json({ success: false, error: { code: "NOT_FOUND", message: "Unknown public resource" } }, 404, corsHdrs);
    } catch (err) {
        logJSON({
            level: "error",
            requestId,
            msg: "PUBLIC_ROUTE_FAIL",
            tenant: tenant.id,
            resource,
            error: String(err),
        });
        return json({ success: false, error: { code: "INTERNAL", message: "Failed to load tenant data" } }, 500, corsHdrs);
    }
}

import { z } from "zod";

export const FixtureSyncSchema = z.object({
    tenantId: z.string().optional(),
    tenantSlug: z.string().optional(),
    fixtures: z.array(z.object({
        date: z.string(),
        homeTeam: z.string(),
        awayTeam: z.string(),
        opponent: z.string().optional(),
        status: z.string().optional(),
        venue: z.string().optional(),
        competition: z.string().optional(),
        time: z.string().optional(),
        homeScore: z.union([z.string(), z.number()]).optional(),
        awayScore: z.union([z.string(), z.number()]).optional(),
    })),
}).transform((data) => {
    if (data.tenantSlug && !data.tenantId) {
        return { ...data, tenantId: data.tenantSlug };
    }
    return data;
}).refine((data) => !!data.tenantId, {
    message: "tenantId or tenantSlug is required",
    path: ["tenantId"],
});

export function normalizeFixtureRow(row: any) {
    return {
        id: String(row.id),
        date: row.fixture_date,
        time: row.kick_off_time,
        status: row.status?.toLowerCase(),
        homeTeam: row.home_team,
        awayTeam: row.away_team,
        homeScore: row.home_score ? Number(row.home_score) : undefined,
        awayScore: row.away_score ? Number(row.away_score) : undefined,
        venue: row.venue,
        competition: row.competition,
    };
}

export function normalizeResultRow(row: any) {
    let scorers: string[] = [];

    if (row.home_scorers) {
        try {
            const home = JSON.parse(row.home_scorers);
            if (Array.isArray(home)) scorers.push(...home);
        } catch (e) { }
    }

    if (row.away_scorers) {
        try {
            const away = JSON.parse(row.away_scorers);
            if (Array.isArray(away)) scorers.push(...away);
        } catch (e) { }
    }

    if (scorers.length === 0 && row.scorers) {
        scorers.push(row.scorers);
    }

    return {
        id: String(row.id),
        date: row.match_date,
        status: "completed",
        homeTeam: row.home_team,
        awayTeam: row.away_team,
        homeScore: Number(row.home_score),
        awayScore: Number(row.away_score),
        venue: row.venue,
        competition: row.competition,
        scorers: scorers.sort(),
    };
}

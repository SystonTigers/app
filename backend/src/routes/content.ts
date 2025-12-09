import { json } from "../services/util";
import { requireJWT } from "../services/auth";

// Fixtures
export async function handleCreateFixture(req: Request, env: any, corsHdrs: Headers) {
    try {
        const claims = await requireJWT(req, env);
        const body = await req.json() as any;
        const id = crypto.randomUUID();

        await env.DB.prepare(
            `INSERT INTO fixtures (id, tenant_id, fixture_date, kick_off_time, opponent, venue, competition, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'scheduled')`
        ).bind(
            id, claims.tenantId, body.date, body.time, body.opponent, body.venue, body.competition
        ).run();

        return json({ success: true, id }, 200, corsHdrs);
    } catch (err) {
        return json({ success: false, error: "Failed to create fixture" }, 500, corsHdrs);
    }
}

export async function handleDeleteFixture(req: Request, env: any, corsHdrs: Headers, id: string) {
    try {
        const claims = await requireJWT(req, env);
        await env.DB.prepare("DELETE FROM fixtures WHERE id = ? AND tenant_id = ?")
            .bind(id, claims.tenantId).run();
        return json({ success: true }, 200, corsHdrs);
    } catch (err) {
        return json({ success: false, error: "Failed to delete fixture" }, 500, corsHdrs);
    }
}

// Update fixture
export async function handleUpdateFixture(req: Request, env: any, corsHdrs: Headers, id: string) {
    try {
        const claims = await requireJWT(req, env);
        const body = await req.json() as any;

        // Build update query dynamically
        const updates: string[] = [];
        const params: any[] = [];

        if (body.date !== undefined) {
            updates.push("fixture_date = ?");
            params.push(body.date);
        }
        if (body.time !== undefined) {
            updates.push("kick_off_time = ?");
            params.push(body.time);
        }
        if (body.opponent !== undefined) {
            updates.push("opponent = ?");
            params.push(body.opponent);
        }
        if (body.venue !== undefined) {
            updates.push("venue = ?");
            params.push(body.venue);
        }
        if (body.competition !== undefined) {
            updates.push("competition = ?");
            params.push(body.competition);
        }
        if (body.status !== undefined) {
            updates.push("status = ?");
            params.push(body.status);
        }
        if (body.homeScore !== undefined) {
            updates.push("home_score = ?");
            params.push(body.homeScore);
        }
        if (body.awayScore !== undefined) {
            updates.push("away_score = ?");
            params.push(body.awayScore);
        }

        if (updates.length === 0) {
            return json({ success: false, error: "No fields to update" }, 400, corsHdrs);
        }

        params.push(id, claims.tenantId);

        await env.DB.prepare(
            `UPDATE fixtures SET ${updates.join(", ")} WHERE id = ? AND tenant_id = ?`
        ).bind(...params).run();

        return json({ success: true }, 200, corsHdrs);
    } catch (err) {
        console.error('Update fixture error:', err);
        return json({ success: false, error: "Failed to update fixture" }, 500, corsHdrs);
    }
}

// Get single fixture
export async function handleGetFixture(req: Request, env: any, corsHdrs: Headers, id: string) {
    try {
        const claims = await requireJWT(req, env);

        const fixture = await env.DB.prepare(
            "SELECT * FROM fixtures WHERE id = ? AND tenant_id = ?"
        ).bind(id, claims.tenantId).first();

        if (!fixture) {
            return json({ success: false, error: "Fixture not found" }, 404, corsHdrs);
        }

        return json({ success: true, data: fixture }, 200, corsHdrs);
    } catch (err) {
        return json({ success: false, error: "Failed to get fixture" }, 500, corsHdrs);
    }
}

// Results
export async function handleCreateResult(req: Request, env: any, corsHdrs: Headers) {
    try {
        const claims = await requireJWT(req, env);
        const body = await req.json() as any;
        const id = crypto.randomUUID();

        await env.DB.prepare(
            `INSERT INTO team_results (id, tenant_id, match_date, opponent, venue, competition, our_score, their_score, scorers)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(
            id, claims.tenantId, body.date, body.opponent, body.venue, body.competition,
            body.ourScore, body.theirScore, body.scorers
        ).run();

        return json({ success: true, id }, 200, corsHdrs);
    } catch (err) {
        return json({ success: false, error: "Failed to create result" }, 500, corsHdrs);
    }
}

export async function handleDeleteResult(req: Request, env: any, corsHdrs: Headers, id: string) {
    try {
        const claims = await requireJWT(req, env);
        await env.DB.prepare("DELETE FROM team_results WHERE id = ? AND tenant_id = ?")
            .bind(id, claims.tenantId).run();
        return json({ success: true }, 200, corsHdrs);
    } catch (err) {
        return json({ success: false, error: "Failed to delete result" }, 500, corsHdrs);
    }
}

// Update result
export async function handleUpdateResult(req: Request, env: any, corsHdrs: Headers, id: string) {
    try {
        const claims = await requireJWT(req, env);
        const body = await req.json() as any;

        // Build update query dynamically
        const updates: string[] = [];
        const params: any[] = [];

        if (body.date !== undefined) {
            updates.push("match_date = ?");
            params.push(body.date);
        }
        if (body.opponent !== undefined) {
            updates.push("opponent = ?");
            params.push(body.opponent);
        }
        if (body.venue !== undefined) {
            updates.push("venue = ?");
            params.push(body.venue);
        }
        if (body.competition !== undefined) {
            updates.push("competition = ?");
            params.push(body.competition);
        }
        if (body.ourScore !== undefined) {
            updates.push("our_score = ?");
            params.push(body.ourScore);
        }
        if (body.theirScore !== undefined) {
            updates.push("their_score = ?");
            params.push(body.theirScore);
        }
        if (body.scorers !== undefined) {
            updates.push("scorers = ?");
            params.push(body.scorers);
        }

        if (updates.length === 0) {
            return json({ success: false, error: "No fields to update" }, 400, corsHdrs);
        }

        params.push(id, claims.tenantId);

        await env.DB.prepare(
            `UPDATE team_results SET ${updates.join(", ")} WHERE id = ? AND tenant_id = ?`
        ).bind(...params).run();

        return json({ success: true }, 200, corsHdrs);
    } catch (err) {
        console.error('Update result error:', err);
        return json({ success: false, error: "Failed to update result" }, 500, corsHdrs);
    }
}

// Get single result
export async function handleGetResult(req: Request, env: any, corsHdrs: Headers, id: string) {
    try {
        const claims = await requireJWT(req, env);

        const result = await env.DB.prepare(
            "SELECT * FROM team_results WHERE id = ? AND tenant_id = ?"
        ).bind(id, claims.tenantId).first();

        if (!result) {
            return json({ success: false, error: "Result not found" }, 404, corsHdrs);
        }

        return json({ success: true, data: result }, 200, corsHdrs);
    } catch (err) {
        return json({ success: false, error: "Failed to get result" }, 500, corsHdrs);
    }
}

// Feed
export async function handleCreatePost(req: Request, env: any, corsHdrs: Headers) {
    try {
        const claims = await requireJWT(req, env);
        const body = await req.json() as any;
        const id = crypto.randomUUID();

        await env.DB.prepare(
            `INSERT INTO feed_posts (id, tenant_id, title, content, author, image_url, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
        ).bind(
            id, claims.tenantId, body.title, body.content, body.author, body.imageUrl, Date.now()
        ).run();

        return json({ success: true, id }, 200, corsHdrs);
    } catch (err) {
        return json({ success: false, error: "Failed to create post" }, 500, corsHdrs);
    }
}

export async function handleDeletePost(req: Request, env: any, corsHdrs: Headers, id: string) {
    try {
        const claims = await requireJWT(req, env);
        await env.DB.prepare("DELETE FROM feed_posts WHERE id = ? AND tenant_id = ?")
            .bind(id, claims.tenantId).run();
        return json({ success: true }, 200, corsHdrs);
    } catch (err) {
        return json({ success: false, error: "Failed to delete post" }, 500, corsHdrs);
    }
}

// Update post
export async function handleUpdatePost(req: Request, env: any, corsHdrs: Headers, id: string) {
    try {
        const claims = await requireJWT(req, env);
        const body = await req.json() as any;

        // Build update query dynamically
        const updates: string[] = [];
        const params: any[] = [];

        if (body.title !== undefined) {
            updates.push("title = ?");
            params.push(body.title);
        }
        if (body.content !== undefined) {
            updates.push("content = ?");
            params.push(body.content);
        }
        if (body.author !== undefined) {
            updates.push("author = ?");
            params.push(body.author);
        }
        if (body.imageUrl !== undefined) {
            updates.push("image_url = ?");
            params.push(body.imageUrl);
        }

        if (updates.length === 0) {
            return json({ success: false, error: "No fields to update" }, 400, corsHdrs);
        }

        // Add updated_at timestamp
        updates.push("updated_at = ?");
        params.push(Date.now());

        params.push(id, claims.tenantId);

        await env.DB.prepare(
            `UPDATE feed_posts SET ${updates.join(", ")} WHERE id = ? AND tenant_id = ?`
        ).bind(...params).run();

        return json({ success: true }, 200, corsHdrs);
    } catch (err) {
        console.error('Update post error:', err);
        return json({ success: false, error: "Failed to update post" }, 500, corsHdrs);
    }
}

// Get single post
export async function handleGetPost(req: Request, env: any, corsHdrs: Headers, id: string) {
    try {
        const claims = await requireJWT(req, env);

        const post = await env.DB.prepare(
            "SELECT * FROM feed_posts WHERE id = ? AND tenant_id = ?"
        ).bind(id, claims.tenantId).first();

        if (!post) {
            return json({ success: false, error: "Post not found" }, 404, corsHdrs);
        }

        return json({ success: true, data: post }, 200, corsHdrs);
    } catch (err) {
        return json({ success: false, error: "Failed to get post" }, 500, corsHdrs);
    }
}

// Table
export async function handleUpdateTable(req: Request, env: any, corsHdrs: Headers) {
    try {
        const claims = await requireJWT(req, env);
        const body = await req.json() as any[]; // Array of rows

        // Transaction: Delete all for tenant, insert new
        const batch = [
            env.DB.prepare("DELETE FROM league_standings WHERE tenant_id = ?").bind(claims.tenantId)
        ];

        for (const row of body) {
            batch.push(
                env.DB.prepare(
                    `INSERT INTO league_standings (id, tenant_id, position, team_name, played, won, drawn, lost, goals_for, goals_against, points, competition)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
                ).bind(
                    crypto.randomUUID(), claims.tenantId, row.position, row.team, row.played, row.won, row.drawn, row.lost,
                    row.goalsFor, row.goalsAgainst, row.points, row.competition || 'League'
                )
            );
        }

        await env.DB.batch(batch);
        return json({ success: true }, 200, corsHdrs);
    } catch (err) {
        return json({ success: false, error: "Failed to update table" }, 500, corsHdrs);
    }
}

export async function handleResignTeam(req: Request, env: any, corsHdrs: Headers) {
    try {
        const claims = await requireJWT(req, env);
        const body = await req.json() as { teamName: string };
        const teamName = body.teamName;

        if (!teamName) return json({ success: false, error: "Team name required" }, 400, corsHdrs);

        // Step 1: Get all results involving the resigned team to calculate deductions
        const results = await env.DB.prepare(
            `SELECT opponent, our_score, their_score FROM team_results WHERE tenant_id = ? AND opponent = ?`
        ).bind(claims.tenantId, teamName).all();

        // Calculate deductions for each opponent (YOUR team's results against them)
        // our_score = your team's goals, their_score = resigned team's goals
        const deductions: Record<string, { played: number; won: number; drawn: number; lost: number; goalsFor: number; goalsAgainst: number; points: number }> = {};

        // Your team played matches against the resigned team - need to deduct YOUR stats
        for (const row of (results.results || [])) {
            const ourScore = Number(row.our_score || 0);
            const theirScore = Number(row.their_score || 0);

            // This is a match your team played against the resigned team
            // We need to deduct from YOUR team's record (claims.tenantId)
            // The "opponent" here IS the resigned team, so we deduct from our own team
            // But actually we need to update the LEAGUE TABLE not just our results

            // For the LEAGUE TABLE: we need to find all teams that played the resigned team
            // and deduct their points. In your league table, each row is a different team.
        }

        // Step 2: Query the league standings to find teams and recalculate
        // Get current standings
        const standings = await env.DB.prepare(
            `SELECT * FROM league_standings WHERE tenant_id = ?`
        ).bind(claims.tenantId).all();

        // We need results WHERE the resigned team was opponent for ANY team
        // But team_results only stores YOUR team's results
        // For a proper implementation, we need match_events or a full results table

        // Alternative: Since we're storing league table manually, 
        // we recalculate based on remaining results
        // Get all remaining results (excluding resigned team)
        const remainingResults = await env.DB.prepare(
            `SELECT * FROM team_results WHERE tenant_id = ? AND opponent != ?`
        ).bind(claims.tenantId, teamName).all();

        // Recalculate your team's stats from remaining results
        let played = 0, won = 0, drawn = 0, lost = 0, goalsFor = 0, goalsAgainst = 0;
        for (const r of (remainingResults.results || [])) {
            const ourScore = Number(r.our_score || 0);
            const theirScore = Number(r.their_score || 0);
            played++;
            goalsFor += ourScore;
            goalsAgainst += theirScore;
            if (ourScore > theirScore) won++;
            else if (ourScore === theirScore) drawn++;
            else lost++;
        }
        const points = (won * 3) + drawn;

        // Step 3: Update league standings - remove resigned team and update your team
        const batch = [
            // Remove resigned team from table
            env.DB.prepare("DELETE FROM league_standings WHERE tenant_id = ? AND team_name = ?")
                .bind(claims.tenantId, teamName),
            // Update your team's standing with recalculated stats
            env.DB.prepare(
                `UPDATE league_standings 
                 SET played = ?, won = ?, drawn = ?, lost = ?, goals_for = ?, goals_against = ?, points = ?
                 WHERE tenant_id = ? AND team_name = (SELECT name FROM tenants WHERE id = ?)`
            ).bind(played, won, drawn, lost, goalsFor, goalsAgainst, points, claims.tenantId, claims.tenantId),
            // Remove fixtures against resigned team
            env.DB.prepare("DELETE FROM fixtures WHERE tenant_id = ? AND opponent = ?")
                .bind(claims.tenantId, teamName),
            // Remove results against resigned team
            env.DB.prepare("DELETE FROM team_results WHERE tenant_id = ? AND opponent = ?")
                .bind(claims.tenantId, teamName)
        ];

        await env.DB.batch(batch);

        // Step 4: Recalculate positions based on new points
        const updatedStandings = await env.DB.prepare(
            `SELECT id, points, goals_for - goals_against as gd FROM league_standings 
             WHERE tenant_id = ? ORDER BY points DESC, gd DESC`
        ).bind(claims.tenantId).all();

        // Update positions
        const positionUpdates = [];
        let position = 1;
        for (const team of (updatedStandings.results || [])) {
            positionUpdates.push(
                env.DB.prepare("UPDATE league_standings SET position = ? WHERE id = ?")
                    .bind(position++, team.id)
            );
        }
        if (positionUpdates.length > 0) {
            await env.DB.batch(positionUpdates);
        }

        return json({ success: true, message: `Team ${teamName} resigned. Standings recalculated.` }, 200, corsHdrs);
    } catch (err) {
        console.error('Resign team error:', err);
        return json({ success: false, error: "Failed to resign team" }, 500, corsHdrs);
    }
}

// Auto-Import Fixtures from FA (using stored faSnippet URL)
export async function handleAutoImportFixtures(req: Request, env: any, corsHdrs: Headers) {
    try {
        const claims = await requireJWT(req, env);

        // Get tenant settings to find FA snippet URL
        const settings = await env.DB.prepare(
            "SELECT setting_value FROM tenant_settings WHERE tenant_id = ? AND setting_key = 'fixture_settings'"
        ).bind(claims.tenantId).first();

        if (!settings?.setting_value) {
            return json({ success: false, error: "No FA settings configured. Please set FA snippet URL in Settings." }, 400, corsHdrs);
        }

        const fixtureSettings = JSON.parse(settings.setting_value);
        const faSnippet = fixtureSettings.faSnippet;

        if (!faSnippet) {
            return json({ success: false, error: "FA snippet URL not configured" }, 400, corsHdrs);
        }

        // Fetch fixtures from FA Full-Time
        let fixtures: any[] = [];
        try {
            const response = await fetch(faSnippet, {
                headers: { 'User-Agent': 'Mozilla/5.0 (compatible; FootballClubApp/1.0)' }
            });

            if (!response.ok) {
                return json({ success: false, error: `FA fetch failed: ${response.status}` }, 500, corsHdrs);
            }

            const html = await response.text();

            // Parse fixtures from HTML (simplified - matches common FA Full-Time format)
            const fixturePattern = /<tr[^>]*>.*?<td[^>]*>([^<]+)<\/td>.*?<td[^>]*>([^<]+)<\/td>.*?<td[^>]*>([^<]+)<\/td>.*?<\/tr>/gis;
            let match;

            while ((match = fixturePattern.exec(html)) !== null) {
                const [, date, teams, time] = match;
                if (date && teams) {
                    fixtures.push({
                        date: date.trim(),
                        teams: teams.trim(),
                        time: time?.trim() || 'TBC'
                    });
                }
            }

            // Alternative: Try JSON format
            if (fixtures.length === 0) {
                try {
                    const jsonData = JSON.parse(html);
                    if (Array.isArray(jsonData)) {
                        fixtures = jsonData.map((f: any) => ({
                            date: f.date || f.matchDate,
                            opponent: f.opponent || f.awayTeam || f.homeTeam,
                            time: f.time || f.kickOff || 'TBC',
                            venue: f.venue || (f.homeTeam ? 'Away' : 'Home'),
                            competition: f.competition || 'League'
                        }));
                    }
                } catch { /* Not JSON */ }
            }
        } catch (fetchErr) {
            console.error('FA fetch error:', fetchErr);
            return json({ success: false, error: "Failed to fetch from FA" }, 500, corsHdrs);
        }

        if (fixtures.length === 0) {
            return json({ success: true, imported: 0, message: "No fixtures found to import" }, 200, corsHdrs);
        }

        // Import fixtures to database (upsert by date + opponent)
        let imported = 0;
        for (const fixture of fixtures) {
            const id = crypto.randomUUID();
            try {
                await env.DB.prepare(
                    `INSERT OR REPLACE INTO fixtures (id, tenant_id, fixture_date, kick_off_time, opponent, venue, competition, status)
                     VALUES (?, ?, ?, ?, ?, ?, ?, 'scheduled')`
                ).bind(
                    id, claims.tenantId, fixture.date, fixture.time,
                    fixture.opponent || fixture.teams, fixture.venue || 'TBC', fixture.competition || 'League'
                ).run();
                imported++;
            } catch (e) {
                console.error('Insert fixture error:', e);
            }
        }

        return json({ success: true, imported, total: fixtures.length }, 200, corsHdrs);
    } catch (err) {
        console.error('Auto-import error:', err);
        return json({ success: false, error: "Failed to auto-import fixtures" }, 500, corsHdrs);
    }
}

// Auto-Calculate League Table from Results
export async function handleAutoCalculateTable(req: Request, env: any, corsHdrs: Headers) {
    try {
        const claims = await requireJWT(req, env);

        // Get all results for this tenant
        const results = await env.DB.prepare(
            "SELECT opponent, our_score, their_score, venue FROM team_results WHERE tenant_id = ?"
        ).bind(claims.tenantId).all();

        if (!results.results || results.results.length === 0) {
            return json({ success: false, error: "No results found to calculate from" }, 400, corsHdrs);
        }

        // Get tenant name for "our team"
        const tenant = await env.DB.prepare("SELECT name FROM tenants WHERE id = ?").bind(claims.tenantId).first();
        const ourTeamName = tenant?.name || 'Our Team';

        // Calculate standings
        const standings: Record<string, { played: number; won: number; drawn: number; lost: number; gf: number; ga: number; pts: number }> = {};

        // Initialize our team
        standings[ourTeamName] = { played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, pts: 0 };

        for (const result of results.results) {
            const ourScore = Number(result.our_score) || 0;
            const theirScore = Number(result.their_score) || 0;
            const opponent = result.opponent;

            // Initialize opponent if not exists
            if (!standings[opponent]) {
                standings[opponent] = { played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, pts: 0 };
            }

            // Update our stats
            standings[ourTeamName].played++;
            standings[ourTeamName].gf += ourScore;
            standings[ourTeamName].ga += theirScore;

            // Update opponent stats (inverse)
            standings[opponent].played++;
            standings[opponent].gf += theirScore;
            standings[opponent].ga += ourScore;

            if (ourScore > theirScore) {
                // We won
                standings[ourTeamName].won++;
                standings[ourTeamName].pts += 3;
                standings[opponent].lost++;
            } else if (ourScore === theirScore) {
                // Draw
                standings[ourTeamName].drawn++;
                standings[ourTeamName].pts += 1;
                standings[opponent].drawn++;
                standings[opponent].pts += 1;
            } else {
                // They won
                standings[ourTeamName].lost++;
                standings[opponent].won++;
                standings[opponent].pts += 3;
            }
        }

        // Clear existing standings and insert new ones
        await env.DB.prepare("DELETE FROM league_standings WHERE tenant_id = ?").bind(claims.tenantId).run();

        // Sort by points, then goal difference
        const sortedTeams = Object.entries(standings).sort((a, b) => {
            const ptsDiff = b[1].pts - a[1].pts;
            if (ptsDiff !== 0) return ptsDiff;
            return (b[1].gf - b[1].ga) - (a[1].gf - a[1].ga);
        });

        // Insert standings
        let position = 1;
        for (const [teamName, stats] of sortedTeams) {
            const id = crypto.randomUUID();
            await env.DB.prepare(
                `INSERT INTO league_standings (id, tenant_id, position, team_name, played, won, drawn, lost, goals_for, goals_against, points)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
            ).bind(
                id, claims.tenantId, position++, teamName,
                stats.played, stats.won, stats.drawn, stats.lost,
                stats.gf, stats.ga, stats.pts
            ).run();
        }

        return json({
            success: true,
            message: `League table calculated from ${results.results.length} results`,
            teams: sortedTeams.length
        }, 200, corsHdrs);
    } catch (err) {
        console.error('Auto-calculate error:', err);
        return json({ success: false, error: "Failed to calculate league table" }, 500, corsHdrs);
    }
}

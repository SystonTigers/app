import { json } from "../services/util";
import { readPlayerName } from "../services/playerNames";
import { requireJWT, requireStaff, type TenantClaims } from "../services/auth";
import { playersForViewer } from "../services/playerPrivacy";

// Types
interface WelcomePostOptions {
    previousClub?: string;
    customMessage?: string;
    includePhoto?: boolean;
}

interface AddPlayerRequest {
    name: string;
    position?: string;
    squadNumber?: number;
    /** The app sends the shirt number as `number` */
    number?: number | string | null;
    photoUrl?: string;
    dateOfBirth?: string;
    previousClub?: string;
    signedDate?: string;
    // Welcome post options
    createWelcomePost?: boolean;
    welcomePostOptions?: WelcomePostOptions;
}

/** The shirt number from either field name: a whole number 0–999, null to clear, undefined if not sent. */
function shirtNumber(body: Partial<AddPlayerRequest>): number | null | undefined {
    const raw = body.number !== undefined ? body.number : body.squadNumber;
    if (raw === undefined) return undefined;
    if (raw === null || raw === "") return null;
    const n = Number(raw);
    return Number.isInteger(n) && n >= 0 && n <= 999 ? n : null;
}

// Helper: Generate welcome post content
function generateWelcomePostContent(
    playerName: string,
    teamName: string,
    options: {
        position?: string;
        squadNumber?: number;
        previousClub?: string;
        customMessage?: string;
    }
): string {
    // If custom message provided, use it
    if (options.customMessage) {
        return options.customMessage;
    }

    // Auto-generate based on available info
    let content = `Welcome to ${teamName}, ${playerName}! `;

    if (options.previousClub) {
        content += `${playerName} joins us from ${options.previousClub}. `;
    }

    if (options.squadNumber) {
        content += `Wearing the number ${options.squadNumber} shirt`;
        if (options.position) {
            content += ` as our new ${options.position}`;
        }
        content += '. ';
    } else if (options.position) {
        content += `${playerName} will strengthen our ${options.position} options. `;
    }

    content += 'Welcome to the team!';

    return content;
}

// Legacy: Bulk update squad (KV-based)
export async function handleUpdateSquad(req: Request, env: any, corsHdrs: Headers) {
    try {
        const claims = await requireStaff(req, env);
        const tenant = claims.tenantId;

        const body = await req.json() as any[];

        // Basic validation - ensure it's an array
        if (!Array.isArray(body)) {
            return json({ success: false, error: "Body must be an array of players" }, 400, corsHdrs);
        }

        // 1. Save to KV (Legacy/Read-heavy)
        await env.KV_IDEMP.put(`squad:${tenant}:list`, JSON.stringify(body));

        // 2. Sync to D1
        if (body.length > 0) {
            const stmt = env.DB.prepare(`
                INSERT INTO squad (id, tenant_id, name, first_name, last_name, number, position, photo_url, dob, bio, role, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                    name=excluded.name,
                    first_name=excluded.first_name,
                    last_name=excluded.last_name,
                    number=excluded.number,
                    position=excluded.position,
                    photo_url=excluded.photo_url,
                    dob=excluded.dob,
                    bio=excluded.bio,
                    role=excluded.role
            `);
            const named = body.map((p: any) => ({ p, name: readPlayerName(p) }));
            const bad = named.find((x) => !x.name || "error" in x.name);
            if (bad) {
                return json({ success: false, error: bad.name && "error" in bad.name ? bad.name.error : "Every player needs a first name." }, 400, corsHdrs);
            }
            const batch = named.map(({ p, name }: { p: any; name: any }) => stmt.bind(
                p.id, tenant, name.full, name.first, name.last, p.number || null, p.position || null, p.photo_url || null,
                p.dob || null, p.bio || null, p.role || 'Player', p.created_at || Date.now()
            ));
            await env.DB.batch(batch);
        }

        return json({ success: true, count: body.length }, 200, corsHdrs);
    } catch (err: any) {
        console.error('Update Squad Error:', err);
        return json({ success: false, error: "Failed to update squad" }, 500, corsHdrs);
    }
}

// Get all players in squad
export async function handleGetSquad(req: Request, env: any, corsHdrs: Headers) {
    try {
        const claims = await requireJWT(req, env);

        const players = await env.DB.prepare(
            `SELECT *, number AS squad_number, dob AS date_of_birth FROM squad WHERE tenant_id = ? ORDER BY number ASC, name ASC`
        ).bind(claims.tenantId).all();

        const visible = await playersForViewer(env, claims as TenantClaims, players.results || []);
        return json({ success: true, data: visible }, 200, corsHdrs);
    } catch (err) {
        if (err instanceof Response) { throw err; }
        console.error('Get squad error:', err);
        return json({ success: false, error: "Failed to get squad" }, 500, corsHdrs);
    }
}

// Get single player
export async function handleGetPlayer(req: Request, env: any, corsHdrs: Headers, playerId: string) {
    try {
        const claims = await requireJWT(req, env);

        const player = await env.DB.prepare(
            `SELECT * FROM squad WHERE id = ? AND tenant_id = ?`
        ).bind(playerId, claims.tenantId).first();

        if (!player) {
            return json({ success: false, error: "Player not found" }, 404, corsHdrs);
        }

        const [visible] = await playersForViewer(env, claims as TenantClaims, [player]);
        return json({ success: true, data: visible }, 200, corsHdrs);
    } catch (err) {
        if (err instanceof Response) { throw err; }
        console.error('Get player error:', err);
        return json({ success: false, error: "Failed to get player" }, 500, corsHdrs);
    }
}

// Add new player with optional welcome post
export async function handleAddPlayer(req: Request, env: any, corsHdrs: Headers) {
    try {
        const claims = await requireStaff(req, env);
        const body = await req.json() as AddPlayerRequest;

        // Validate required fields
        const name = readPlayerName(body as unknown as Record<string, unknown>);
        if (!name) return json({ success: false, error: "Enter the player's first name and surname." }, 400, corsHdrs);
        if ("error" in name) return json({ success: false, error: name.error }, 400, corsHdrs);
        body.name = name.full;

        const shirt = shirtNumber(body);
        if (shirt !== undefined) body.squadNumber = shirt ?? undefined;
        const playerId = crypto.randomUUID();
        const now = Date.now();
        const signedDate = body.signedDate || new Date().toISOString().split('T')[0];

        // Insert player into squad table
        await env.DB.prepare(
            `INSERT INTO squad (id, tenant_id, name, first_name, last_name, position, number, photo_url, dob, previous_club, signed_date, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(
            playerId,
            claims.tenantId,
            name.full,
            name.first,
            name.last,
            body.position || null,
            body.squadNumber || null,
            body.photoUrl || null,
            body.dateOfBirth || null,
            body.previousClub || null,
            signedDate,
            now
        ).run();

        // Add to current season roster
        const currentSeason = await env.DB.prepare(
            "SELECT id FROM seasons WHERE tenant_id = ? AND is_current = 1"
        ).bind(claims.tenantId).first();

        if (currentSeason) {
            await env.DB.prepare(
                `INSERT INTO player_seasons (id, tenant_id, season_id, player_id, squad_number, position, joined_date, status, created_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?)`
            ).bind(
                crypto.randomUUID(),
                claims.tenantId,
                currentSeason.id,
                playerId,
                body.squadNumber || null,
                body.position || null,
                signedDate,
                now
            ).run();
        }

        let welcomePostId: string | null = null;

        // Create welcome post if requested
        if (body.createWelcomePost) {
            // Get tenant name for the post
            const tenant = await env.DB.prepare(
                "SELECT name FROM tenants WHERE id = ?"
            ).bind(claims.tenantId).first();

            const teamName = tenant?.name || 'the team';
            const options = body.welcomePostOptions || {};

            const postContent = generateWelcomePostContent(body.name, teamName, {
                position: body.position,
                squadNumber: body.squadNumber,
                previousClub: body.previousClub || options.previousClub,
                customMessage: options.customMessage
            });

            welcomePostId = crypto.randomUUID();

            await env.DB.prepare(
                `INSERT INTO feed_posts (id, tenant_id, title, content, author, image_url, post_type, related_player_id, created_at, updated_at)
                 VALUES (?, ?, ?, ?, ?, ?, 'signing', ?, ?, ?)`
            ).bind(
                welcomePostId,
                claims.tenantId,
                `New Signing: ${body.name}`,
                postContent,
                'Club Admin',
                (options.includePhoto !== false && body.photoUrl) ? body.photoUrl : null,
                playerId,
                now,
                now
            ).run();
        }

        return json({
            success: true,
            playerId,
            welcomePostId,
            message: welcomePostId
                ? `Player "${body.name}" added and welcome post created`
                : `Player "${body.name}" added to squad`
        }, 200, corsHdrs);
    } catch (err) {
        console.error('Add player error:', err);
        return json({ success: false, error: "Failed to add player" }, 500, corsHdrs);
    }
}

// Update existing player
export async function handleUpdatePlayer(req: Request, env: any, corsHdrs: Headers, playerId: string) {
    try {
        const claims = await requireStaff(req, env);
        const body = await req.json() as Partial<AddPlayerRequest>;

        // Check player exists
        const existing = await env.DB.prepare(
            "SELECT id FROM squad WHERE id = ? AND tenant_id = ?"
        ).bind(playerId, claims.tenantId).first();

        if (!existing) {
            return json({ success: false, error: "Player not found" }, 404, corsHdrs);
        }

        // Build update query dynamically
        const updates: string[] = [];
        const values: any[] = [];

        const name = readPlayerName(body as unknown as Record<string, unknown>);
        if (name && "error" in name) return json({ success: false, error: name.error }, 400, corsHdrs);
        if (name) {
            updates.push("name = ?", "first_name = ?", "last_name = ?");
            values.push(name.full, name.first, name.last);
        }
        if (body.position !== undefined) {
            updates.push("position = ?");
            values.push(body.position);
        }
        const shirt = shirtNumber(body);
        if (shirt !== undefined) {
            body.squadNumber = shirt ?? undefined;
            updates.push("number = ?");
            values.push(shirt);
        }
        if (body.photoUrl !== undefined) {
            updates.push("photo_url = ?");
            values.push(body.photoUrl);
        }
        if (body.dateOfBirth !== undefined) {
            const dob = body.dateOfBirth === null || body.dateOfBirth === "" ? null : String(body.dateOfBirth);
            if (dob !== null && !/^\d{4}-\d{2}-\d{2}$/.test(dob)) {
                return json({ success: false, error: { code: "BAD_REQUEST", message: "Date of birth must be a date like 2012-03-14." } }, 400, corsHdrs);
            }
            updates.push("dob = ?");
            values.push(dob);
        }
        if (body.previousClub !== undefined) {
            updates.push("previous_club = ?");
            values.push(body.previousClub);
        }

        if (updates.length === 0) {
            return json({ success: false, error: "No fields to update" }, 400, corsHdrs);
        }

        values.push(playerId, claims.tenantId);

        await env.DB.prepare(
            `UPDATE squad SET ${updates.join(', ')} WHERE id = ? AND tenant_id = ?`
        ).bind(...values).run();

        // Also update current season roster if position/number changed
        if (body.position !== undefined || body.squadNumber !== undefined) {
            const currentSeason = await env.DB.prepare(
                "SELECT id FROM seasons WHERE tenant_id = ? AND is_current = 1"
            ).bind(claims.tenantId).first();

            if (currentSeason) {
                const seasonUpdates: string[] = [];
                const seasonValues: any[] = [];

                if (body.position !== undefined) {
                    seasonUpdates.push("position = ?");
                    seasonValues.push(body.position);
                }
                if (body.squadNumber !== undefined) {
                    seasonUpdates.push("squad_number = ?");
                    seasonValues.push(body.squadNumber);
                }

                if (seasonUpdates.length > 0) {
                    seasonValues.push(playerId, currentSeason.id, claims.tenantId);
                    await env.DB.prepare(
                        `UPDATE player_seasons SET ${seasonUpdates.join(', ')} WHERE player_id = ? AND season_id = ? AND tenant_id = ?`
                    ).bind(...seasonValues).run();
                }
            }
        }

        return json({ success: true }, 200, corsHdrs);
    } catch (err) {
        console.error('Update player error:', err);
        return json({ success: false, error: "Failed to update player" }, 500, corsHdrs);
    }
}

// Delete player
export async function handleDeletePlayer(req: Request, env: any, corsHdrs: Headers, playerId: string) {
    try {
        const claims = await requireStaff(req, env);

        // Check player exists
        const existing = await env.DB.prepare(
            "SELECT id, name FROM squad WHERE id = ? AND tenant_id = ?"
        ).bind(playerId, claims.tenantId).first();

        if (!existing) {
            return json({ success: false, error: "Player not found" }, 404, corsHdrs);
        }

        // Delete from player_seasons first (foreign key)
        await env.DB.prepare(
            "DELETE FROM player_seasons WHERE player_id = ? AND tenant_id = ?"
        ).bind(playerId, claims.tenantId).run();

        // Delete from squad
        await env.DB.prepare(
            "DELETE FROM squad WHERE id = ? AND tenant_id = ?"
        ).bind(playerId, claims.tenantId).run();

        return json({ success: true, message: `Player "${existing.name}" deleted` }, 200, corsHdrs);
    } catch (err) {
        console.error('Delete player error:', err);
        return json({ success: false, error: "Failed to delete player" }, 500, corsHdrs);
    }
}

// Generate welcome post preview (for UI preview before submitting)
export async function handlePreviewWelcomePost(req: Request, env: any, corsHdrs: Headers) {
    try {
        const claims = await requireJWT(req, env);
        const body = await req.json() as {
            playerName: string;
            position?: string;
            squadNumber?: number;
            previousClub?: string;
            customMessage?: string;
        };

        if (!body.playerName) {
            return json({ success: false, error: "playerName is required" }, 400, corsHdrs);
        }

        // Get tenant name
        const tenant = await env.DB.prepare(
            "SELECT name FROM tenants WHERE id = ?"
        ).bind(claims.tenantId).first();

        const teamName = tenant?.name || 'the team';

        const content = generateWelcomePostContent(body.playerName, teamName, {
            position: body.position,
            squadNumber: body.squadNumber,
            previousClub: body.previousClub,
            customMessage: body.customMessage
        });

        return json({
            success: true,
            data: {
                title: `New Signing: ${body.playerName}`,
                content
            }
        }, 200, corsHdrs);
    } catch (err) {
        console.error('Preview welcome post error:', err);
        return json({ success: false, error: "Failed to generate preview" }, 500, corsHdrs);
    }
}

import { json } from "../services/util";
import { requireJWT } from "../services/auth";

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
    photoUrl?: string;
    dateOfBirth?: string;
    previousClub?: string;
    signedDate?: string;
    // Welcome post options
    createWelcomePost?: boolean;
    welcomePostOptions?: WelcomePostOptions;
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
// Bulk update squad (replace all)
export async function handleUpdateSquad(req: Request, env: any, corsHdrs: Headers) {
    try {
        const claims = await requireJWT(req, env);
        const tenant = claims.tenantId;

        const body = await req.json() as any[];

        // Basic validation - ensure it's an array
        if (!Array.isArray(body)) {
            return json({ success: false, error: "Body must be an array of players" }, 400, corsHdrs);
        }

        // 1. Save to KV (Legacy/Read-heavy)
        await env.KV_IDEMP.put(`squad:${tenant}:list`, JSON.stringify(body));

        // 2. Sync to D1
        // Used for joins in stats/seasons.
        // We do batch upserts.
        if (body.length > 0) {
            const stmt = env.DB.prepare(`
                INSERT INTO squad (id, tenant_id, name, number, position, photo_url, dob, bio, role, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                    name=excluded.name,
                    number=excluded.number,
                    position=excluded.position,
                    photo_url=excluded.photo_url,
                    dob=excluded.dob,
                    bio=excluded.bio,
                    role=excluded.role
            `);
            const batch = body.map((p: any) => stmt.bind(
                p.id, tenant, p.name, p.number || null, p.position || null, p.photo_url || null,
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
            `SELECT * FROM squad WHERE tenant_id = ? ORDER BY squad_number ASC, name ASC`
        ).bind(claims.tenantId).all();

        return json({ success: true, data: players.results || [] }, 200, corsHdrs);
    } catch (err) {
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

        return json({ success: true, data: player }, 200, corsHdrs);
    } catch (err) {
        console.error('Get player error:', err);
        return json({ success: false, error: "Failed to get player" }, 500, corsHdrs);
    }
}

// Add new player with optional welcome post
export async function handleAddPlayer(req: Request, env: any, corsHdrs: Headers) {
    try {
        const claims = await requireJWT(req, env);
        const body = await req.json() as AddPlayerRequest;

        // Validate required fields
// Get all players
export async function handleGetSquad(req: Request, env: any, corsHdrs: Headers) {
    try {
        const claims = await requireJWT(req, env);
        const tenant = claims.tenantId;

        // Try KV first
        const kvSquad = await env.KV_IDEMP.get(`squad:${tenant}:list`, 'json');
        if (kvSquad) {
            return json({ success: true, data: kvSquad }, 200, corsHdrs);
        }

        // Fallback to D1
        const dbSquad = await env.DB.prepare(
            `SELECT * FROM squad WHERE tenant_id = ? ORDER BY number ASC`
        ).bind(tenant).all();

        return json({ success: true, data: dbSquad.results || [] }, 200, corsHdrs);
    } catch (err) {
        return json({ success: false, error: "Failed to get squad" }, 500, corsHdrs);
    }
}

// Add new player (with announcement option)
export async function handleAddPlayer(req: Request, env: any, corsHdrs: Headers) {
    try {
        const claims = await requireJWT(req, env);
        const tenant = claims.tenantId;
        const body = await req.json() as any;
        // body: { name, number, position, ... announce: boolean, signingNotes: string }

        if (!body.name) {
            return json({ success: false, error: "Player name is required" }, 400, corsHdrs);
        }

        const playerId = crypto.randomUUID();
        const now = Date.now();
        const signedDate = body.signedDate || new Date().toISOString().split('T')[0];

        // Insert player into squad table
        await env.DB.prepare(
            `INSERT INTO squad (id, tenant_id, name, position, squad_number, photo_url, date_of_birth, previous_club, signed_date, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(
            playerId,
            claims.tenantId,
            body.name,
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
                `INSERT INTO feed_posts (id, tenant_id, title, content, author, image_url, post_type, related_player_id, created_at)
                 VALUES (?, ?, ?, ?, ?, ?, 'signing', ?, ?)`
            ).bind(
                welcomePostId,
                claims.tenantId,
                `New Signing: ${body.name}`,
                postContent,
                'Club Admin',
                (options.includePhoto !== false && body.photoUrl) ? body.photoUrl : null,
                playerId,
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
        const claims = await requireJWT(req, env);
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

        if (body.name !== undefined) {
            updates.push("name = ?");
            values.push(body.name);
        }
        if (body.position !== undefined) {
            updates.push("position = ?");
            values.push(body.position);
        }
        if (body.squadNumber !== undefined) {
            updates.push("squad_number = ?");
            values.push(body.squadNumber);
        }
        if (body.photoUrl !== undefined) {
            updates.push("photo_url = ?");
            values.push(body.photoUrl);
        }
        if (body.dateOfBirth !== undefined) {
            updates.push("date_of_birth = ?");
            values.push(body.dateOfBirth);
        }
        if (body.previousClub !== undefined) {
            updates.push("previous_club = ?");
            values.push(body.previousClub);

        const id = crypto.randomUUID();
        const now = Date.now();
        const player = {
            id,
            ...body,
            created_at: now
        };

        // 1. Insert into D1
        await env.DB.prepare(`
            INSERT INTO squad (id, tenant_id, name, number, position, photo_url, dob, bio, role, signed_date, previous_club, signing_notes, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
            id, tenant, body.name, body.number || null, body.position || null, body.photo_url || null,
            body.dob || null, body.bio || null, body.role || 'Player',
            body.signedDate || new Date().toISOString(), body.previousClub || null, body.signingNotes || null,
            now
        ).run();

        // 2. Update KV list
        const listStr = await env.KV_IDEMP.get(`squad:${tenant}:list`);
        const list = listStr ? JSON.parse(listStr) : [];
        list.push(player);
        await env.KV_IDEMP.put(`squad:${tenant}:list`, JSON.stringify(list));

        // 3. Create Feed Post (if announced)
        if (body.announce) {
            const postId = crypto.randomUUID();
            const content = `✍️ **New Signing!**\n\nWe are delighted to announce the signing of **${body.name}**${body.previousClub ? ` from ${body.previousClub}` : ''}! ${body.signingNotes ? `\n\n"${body.signingNotes}"` : ''}\n\nWelcome to the club! 🐯`;

            await env.DB.prepare(`
                INSERT INTO feed_posts (id, tenant_id, title, content, type, author_id, created_at)
                VALUES (?, ?, ?, ?, 'news', ?, ?)
            `).bind(postId, tenant, `Welcome ${body.name}!`, content, claims.userId, now).run();
        }

        // 4. Add to Current Season (optional but recommended if season active)
        // Check active season
        const currentSeason = await env.DB.prepare("SELECT id FROM seasons WHERE tenant_id = ? AND is_current = 1").bind(tenant).first();
        if (currentSeason) {
            const psId = crypto.randomUUID();
            await env.DB.prepare("INSERT INTO player_seasons (id, tenant_id, season_id, player_id, created_at) VALUES (?, ?, ?, ?, ?)").bind(psId, tenant, currentSeason.id, id, now).run();
        }

        return json({ success: true, id }, 201, corsHdrs);

    } catch (err: any) {
        console.error('Add Player Error:', err);
        return json({ success: false, error: err.message }, 500, corsHdrs);
    }
}

// Get single player
export async function handleGetPlayer(req: Request, env: any, corsHdrs: Headers, playerId: string) {
    try {
        const claims = await requireJWT(req, env);
        const tenant = claims.tenantId;

        const player = await env.DB.prepare(
            `SELECT * FROM squad WHERE id = ? AND tenant_id = ?`
        ).bind(playerId, tenant).first();

        if (!player) {
            return json({ success: false, error: "Player not found" }, 404, corsHdrs);
        }

        return json({ success: true, data: player }, 200, corsHdrs);
    } catch (err) {
        return json({ success: false, error: "Failed to get player" }, 500, corsHdrs);
    }
}

// Update single player
export async function handleUpdatePlayer(req: Request, env: any, corsHdrs: Headers, playerId: string) {
    try {
        const claims = await requireJWT(req, env);
        const tenant = claims.tenantId;
        const body = await req.json() as any;

        // Build update query dynamically
        const updates: string[] = [];
        const params: any[] = [];

        if (body.name !== undefined) {
            updates.push("name = ?");
            params.push(body.name);
        }
        if (body.number !== undefined) {
            updates.push("number = ?");
            params.push(body.number);
        }
        if (body.position !== undefined) {
            updates.push("position = ?");
            params.push(body.position);
        }
        if (body.dob !== undefined) {
            updates.push("dob = ?");
            params.push(body.dob);
        }
        if (body.photo_url !== undefined) {
            updates.push("photo_url = ?");
            params.push(body.photo_url);
        }
        if (body.bio !== undefined) {
            updates.push("bio = ?");
            params.push(body.bio);
        }
        if (body.role !== undefined) {
            updates.push("role = ?");
            params.push(body.role);
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

        params.push(playerId, tenant);

        await env.DB.prepare(
            `UPDATE squad SET ${updates.join(", ")} WHERE id = ? AND tenant_id = ?`
        ).bind(...params).run();

        // Update KV list
        const kvSquad = await env.KV_IDEMP.get(`squad:${tenant}:list`, 'json') as any[] || [];
        const updatedSquad = kvSquad.map((p: any) => {
            if (p.id === playerId) {
                return { ...p, ...body };
            }
            return p;
        });
        await env.KV_IDEMP.put(`squad:${tenant}:list`, JSON.stringify(updatedSquad));

        return json({ success: true }, 200, corsHdrs);
    } catch (err) {
        console.error('Update player error:', err);
        return json({ success: false, error: "Failed to update player" }, 500, corsHdrs);
    }
}

// Delete player
export async function handleDeletePlayer(req: Request, env: any, corsHdrs: Headers, playerId: string) {
    try {
        const claims = await requireJWT(req, env);

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
        const tenant = claims.tenantId;

        // Delete from D1
        await env.DB.prepare(
            `DELETE FROM squad WHERE id = ? AND tenant_id = ?`
        ).bind(playerId, tenant).run();

        // Update KV list
        const kvSquad = await env.KV_IDEMP.get(`squad:${tenant}:list`, 'json') as any[] || [];
        const filteredSquad = kvSquad.filter((p: any) => p.id !== playerId);
        await env.KV_IDEMP.put(`squad:${tenant}:list`, JSON.stringify(filteredSquad));

        return json({ success: true }, 200, corsHdrs);
    } catch (err) {
        return json({ success: false, error: "Failed to delete player" }, 500, corsHdrs);
    }
}

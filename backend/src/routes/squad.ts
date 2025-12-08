import { json } from "../services/util";
import { requireJWT } from "../services/auth";

// Bulk update squad (replace all)
export async function handleUpdateSquad(req: Request, env: any, corsHdrs: Headers) {
    try {
        const claims = await requireJWT(req, env);
        const tenant = claims.tenantId;

        const body = await req.json();

        // Basic validation - ensure it's an array
        if (!Array.isArray(body)) {
            return json({ success: false, error: "Body must be an array of players" }, 400, corsHdrs);
        }

        // Save to KV
        await env.KV_IDEMP.put(`squad:${tenant}:list`, JSON.stringify(body));

        return json({ success: true, count: body.length }, 200, corsHdrs);
    } catch (err) {
        return json({ success: false, error: "Failed to update squad" }, 500, corsHdrs);
    }
}

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
            `SELECT * FROM squad_players WHERE tenant_id = ? ORDER BY number ASC`
        ).bind(tenant).all();

        return json({ success: true, data: dbSquad.results || [] }, 200, corsHdrs);
    } catch (err) {
        return json({ success: false, error: "Failed to get squad" }, 500, corsHdrs);
    }
}

// Create player
export async function handleCreatePlayer(req: Request, env: any, corsHdrs: Headers) {
    try {
        const claims = await requireJWT(req, env);
        const tenant = claims.tenantId;
        const body = await req.json() as any;

        if (!body.name) {
            return json({ success: false, error: "Player name is required" }, 400, corsHdrs);
        }

        const playerId = crypto.randomUUID();
        const player = {
            id: playerId,
            name: body.name,
            number: body.number || null,
            position: body.position || 'Unknown',
            birthday: body.birthday || null,
            photo_url: body.photoUrl || null,
            goals: body.goals || 0,
            assists: body.assists || 0,
            appearances: body.appearances || 0,
            yellow_cards: body.yellowCards || 0,
            red_cards: body.redCards || 0,
            created_at: Date.now(),
        };

        // Save to D1
        await env.DB.prepare(`
            INSERT INTO squad_players (id, tenant_id, name, number, position, birthday, photo_url, goals, assists, appearances, yellow_cards, red_cards, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
            player.id, tenant, player.name, player.number, player.position,
            player.birthday, player.photo_url, player.goals, player.assists,
            player.appearances, player.yellow_cards, player.red_cards, player.created_at
        ).run();

        // Update KV list
        const kvSquad = await env.KV_IDEMP.get(`squad:${tenant}:list`, 'json') as any[] || [];
        kvSquad.push(player);
        await env.KV_IDEMP.put(`squad:${tenant}:list`, JSON.stringify(kvSquad));

        return json({ success: true, data: player }, 201, corsHdrs);
    } catch (err) {
        console.error('Create player error:', err);
        return json({ success: false, error: "Failed to create player" }, 500, corsHdrs);
    }
}

// Get single player
export async function handleGetPlayer(req: Request, env: any, corsHdrs: Headers, playerId: string) {
    try {
        const claims = await requireJWT(req, env);
        const tenant = claims.tenantId;

        const player = await env.DB.prepare(
            `SELECT * FROM squad_players WHERE id = ? AND tenant_id = ?`
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
        if (body.birthday !== undefined) {
            updates.push("birthday = ?");
            params.push(body.birthday);
        }
        if (body.photoUrl !== undefined) {
            updates.push("photo_url = ?");
            params.push(body.photoUrl);
        }
        if (body.goals !== undefined) {
            updates.push("goals = ?");
            params.push(body.goals);
        }
        if (body.assists !== undefined) {
            updates.push("assists = ?");
            params.push(body.assists);
        }
        if (body.appearances !== undefined) {
            updates.push("appearances = ?");
            params.push(body.appearances);
        }
        if (body.yellowCards !== undefined) {
            updates.push("yellow_cards = ?");
            params.push(body.yellowCards);
        }
        if (body.redCards !== undefined) {
            updates.push("red_cards = ?");
            params.push(body.redCards);
        }

        if (updates.length === 0) {
            return json({ success: false, error: "No fields to update" }, 400, corsHdrs);
        }

        // Add updated_at timestamp
        updates.push("updated_at = ?");
        params.push(Date.now());

        params.push(playerId, tenant);

        await env.DB.prepare(
            `UPDATE squad_players SET ${updates.join(", ")} WHERE id = ? AND tenant_id = ?`
        ).bind(...params).run();

        // Update KV list
        const kvSquad = await env.KV_IDEMP.get(`squad:${tenant}:list`, 'json') as any[] || [];
        const updatedSquad = kvSquad.map((p: any) => {
            if (p.id === playerId) {
                return { ...p, ...body, updated_at: Date.now() };
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
        const tenant = claims.tenantId;

        // Delete from D1
        await env.DB.prepare(
            `DELETE FROM squad_players WHERE id = ? AND tenant_id = ?`
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

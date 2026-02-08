import { json } from "../services/util";
import { requireJWT } from "../services/auth";

export async function handlePlayerPhotoUpload(req: Request, env: any, corsHdrs: Headers) {
    try {
        const claims = await requireJWT(req, env);

        // Parse multipart form data
        const formData = await req.formData();
        const file = formData.get('photo') as File;
        const playerId = formData.get('playerId') as string;

        if (!file) {
            return json({ success: false, error: "No photo provided" }, 400, corsHdrs);
        }

        const photoId = crypto.randomUUID();
        const key = `players/${claims.tenantId}/${playerId}/${photoId}`;

        // Upload to R2
        await env.BUCKET.put(key, file.stream());

        // Store metadata in D1
        await env.DB.prepare(
            `UPDATE squad_players SET photo_url = ? WHERE id = ? AND tenant_id = ?`
        ).bind(key, playerId, claims.tenantId).run();

        return json({ success: true, photoUrl: key }, 200, corsHdrs);
    } catch (err) {
        if (err instanceof Response) {throw err;}
        return json({ success: false, error: "Failed to upload photo" }, 500, corsHdrs);
    }
}

export async function handlePlayerPhotoDelete(req: Request, env: any, corsHdrs: Headers, playerId: string) {
    try {
        const claims = await requireJWT(req, env);

        // Get current photo URL
        const player = await env.DB.prepare(
            `SELECT photo_url FROM squad_players WHERE id = ? AND tenant_id = ?`
        ).bind(playerId, claims.tenantId).first();

        if (player && player.photo_url) {
            // Delete from R2
            await env.BUCKET.delete(player.photo_url);

            // Clear from DB
            await env.DB.prepare(
                `UPDATE squad_players SET photo_url = NULL WHERE id = ? AND tenant_id = ?`
            ).bind(playerId, claims.tenantId).run();
        }

        return json({ success: true }, 200, corsHdrs);
    } catch (err) {
        if (err instanceof Response) {throw err;}
        return json({ success: false, error: "Failed to delete photo" }, 500, corsHdrs);
    }
}

// Get player goal history
export async function handleGetPlayerGoals(req: Request, env: any, corsHdrs: Headers, playerId: string) {
    try {
        const claims = await requireJWT(req, env);

        // Get goals by season
        const goals = await env.DB.prepare(`
            SELECT 
                COALESCE(f.season_id, 'all-time') as season_id, 
                s.name as season_name,
                COUNT(*) as goals
            FROM match_events me
            LEFT JOIN fixtures f ON me.fixture_id = f.id
            LEFT JOIN seasons s ON f.season_id = s.id
            WHERE me.tenant_id = ? AND me.player_id = ? AND me.event_type = 'goal'
            GROUP BY f.season_id, s.name
            ORDER BY s.start_date DESC
        `).bind(claims.tenantId, playerId).all();

        const bySeason = (goals.results || []).map((row: any) => ({
            seasonId: row.season_id,
            seasonName: row.season_name || 'All-Time',
            goals: row.goals
        }));

        const total = bySeason.reduce((sum: number, season: any) => sum + season.goals, 0);

        return json({
            success: true,
            data: { total, bySeason }
        }, 200, corsHdrs);
    } catch (err) {
        console.error('Get player goals error:', err);
        return json({ success: false, error: "Failed to get player goals" }, 500, corsHdrs);
    }
}

// Get player details including contacts and login code
export async function handleGetPlayer(req: Request, env: any, corsHdrs: Headers, playerId: string) {
    try {
        const claims = await requireJWT(req, env);

        const player = await env.DB.prepare(`
            SELECT 
                id, name, number, position, dob, photo_url, role,
                login_code,
                contact1_relationship, contact1_name, contact1_phone, contact1_email,
                contact2_relationship, contact2_name, contact2_phone, contact2_email,
                contact3_relationship, contact3_name, contact3_phone, contact3_email
            FROM players
            WHERE id = ? AND tenant_id = ?
        `).bind(playerId, claims.tenantId).first();

        // Fallback to squad_players table
        if (!player) {
            const squadPlayer = await env.DB.prepare(`
                SELECT id, name, number, position, dob, photo_url, role
                FROM squad_players
                WHERE id = ? AND tenant_id = ?
            `).bind(playerId, claims.tenantId).first();

            if (!squadPlayer) {
                return json({ success: false, error: "Player not found" }, 404, corsHdrs);
            }

            return json({ success: true, data: squadPlayer }, 200, corsHdrs);
        }

        return json({ success: true, data: player }, 200, corsHdrs);
    } catch (err) {
        if (err instanceof Response) {throw err;}
        console.error('Get player error:', err);
        return json({ success: false, error: "Failed to get player" }, 500, corsHdrs);
    }
}

// Update player details including contacts
export async function handleUpdatePlayer(req: Request, env: any, corsHdrs: Headers, playerId: string) {
    try {
        const claims = await requireJWT(req, env);
        const body = await req.json() as Record<string, any>;

        // Build update query dynamically based on provided fields
        const allowedFields = [
            'name', 'number', 'position', 'dob', 'role',
            'contact1_relationship', 'contact1_name', 'contact1_phone', 'contact1_email',
            'contact2_relationship', 'contact2_name', 'contact2_phone', 'contact2_email',
            'contact3_relationship', 'contact3_name', 'contact3_phone', 'contact3_email',
        ];

        const updates: string[] = [];
        const values: any[] = [];

        for (const field of allowedFields) {
            if (body[field] !== undefined) {
                updates.push(`${field} = ?`);
                values.push(body[field]);
            }
        }

        if (updates.length === 0) {
            return json({ success: true, message: "No updates provided" }, 200, corsHdrs);
        }

        // Try players table first
        values.push(playerId, claims.tenantId);
        const result = await env.DB.prepare(`
            UPDATE players SET ${updates.join(', ')} WHERE id = ? AND tenant_id = ?
        `).bind(...values).run();

        // If no rows updated, try squad_players (for basic fields only)
        if (result.meta.changes === 0) {
            const basicFields = allowedFields.slice(0, 5);
            const basicUpdates: string[] = [];
            const basicValues: any[] = [];

            for (const field of basicFields) {
                if (body[field] !== undefined) {
                    basicUpdates.push(`${field} = ?`);
                    basicValues.push(body[field]);
                }
            }

            if (basicUpdates.length > 0) {
                basicValues.push(playerId, claims.tenantId);
                await env.DB.prepare(`
                    UPDATE squad_players SET ${basicUpdates.join(', ')} WHERE id = ? AND tenant_id = ?
                `).bind(...basicValues).run();
            }
        }

        return json({ success: true, message: "Player updated" }, 200, corsHdrs);
    } catch (err) {
        if (err instanceof Response) {throw err;}
        console.error('Update player error:', err);
        return json({ success: false, error: "Failed to update player" }, 500, corsHdrs);
    }
}

// Regenerate login code for a player
export async function handleRegenerateCode(req: Request, env: any, corsHdrs: Headers, playerId: string) {
    try {
        const claims = await requireJWT(req, env);

        // Get tenant name for code prefix
        const tenant = await env.DB.prepare(`
            SELECT name, slug FROM tenants WHERE id = ?
        `).bind(claims.tenantId).first();

        if (!tenant) {
            return json({ success: false, error: "Tenant not found" }, 404, corsHdrs);
        }

        // Generate new code
        const prefix = (tenant.name || tenant.slug || 'TEAM').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 7);
        const num = Math.random().toString().slice(2, 6);
        const newCode = `${prefix}-${num}`;

        // Update player
        const result = await env.DB.prepare(`
            UPDATE players SET login_code = ? WHERE id = ? AND tenant_id = ?
        `).bind(newCode, playerId, claims.tenantId).run();

        // Also try squad_players if players update didn't work
        if (result.meta.changes === 0) {
            // Check if column exists, if not just return the code anyway
            try {
                await env.DB.prepare(`
                    UPDATE squad_players SET login_code = ? WHERE id = ? AND tenant_id = ?
                `).bind(newCode, playerId, claims.tenantId).run();
            } catch {
                // Column might not exist in squad_players, that's ok
            }
        }

        // Also update/create in login_codes table
        const existingCode = await env.DB.prepare(`
            SELECT id FROM login_codes WHERE player_id = ? AND tenant_id = ? AND code_type = 'player'
        `).bind(playerId, claims.tenantId).first();

        if (existingCode) {
            // SECURITY: Verify tenant ownership when updating
            await env.DB.prepare(`
                UPDATE login_codes SET code = ? WHERE id = ? AND tenant_id = ?
            `).bind(newCode, existingCode.id, claims.tenantId).run();
        } else {
            await env.DB.prepare(`
                INSERT INTO login_codes (id, tenant_id, code, code_type, player_id, is_active, created_at)
                VALUES (?, ?, ?, 'player', ?, 1, datetime('now'))
            `).bind(crypto.randomUUID(), claims.tenantId, newCode, playerId).run();
        }

        return json({ success: true, code: newCode }, 200, corsHdrs);
    } catch (err) {
        if (err instanceof Response) {throw err;}
        console.error('Regenerate code error:', err);
        return json({ success: false, error: "Failed to regenerate code" }, 500, corsHdrs);
    }
}

// Generate coach code
export async function handleGenerateCoachCode(req: Request, env: any, corsHdrs: Headers) {
    try {
        const claims = await requireJWT(req, env);
        const body = await req.json().catch(() => ({})) as Record<string, any>;
        const label = body.label || 'Coach';

        // Get tenant name for code prefix
        const tenant = await env.DB.prepare(`
            SELECT name, slug FROM tenants WHERE id = ?
        `).bind(claims.tenantId).first();

        if (!tenant) {
            return json({ success: false, error: "Tenant not found" }, 404, corsHdrs);
        }

        // Generate coach code (with C prefix)
        const prefix = (tenant.name || tenant.slug || 'TEAM').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 7);
        const num = Math.random().toString().slice(2, 5);
        const newCode = `${prefix}-C${num}`;

        // Insert into login_codes
        const codeId = crypto.randomUUID();
        await env.DB.prepare(`
            INSERT INTO login_codes (id, tenant_id, code, code_type, label, is_active, created_at)
            VALUES (?, ?, ?, 'coach', ?, 1, datetime('now'))
        `).bind(codeId, claims.tenantId, newCode, label).run();

        return json({ success: true, code: newCode, id: codeId }, 200, corsHdrs);
    } catch (err) {
        if (err instanceof Response) {throw err;}
        console.error('Generate coach code error:', err);
        return json({ success: false, error: "Failed to generate coach code" }, 500, corsHdrs);
    }
}

// Get/generate team fan code
export async function handleGetFanCode(req: Request, env: any, corsHdrs: Headers) {
    try {
        const claims = await requireJWT(req, env);

        const tenant = await env.DB.prepare(`
            SELECT id, name, slug, fan_code FROM tenants WHERE id = ?
        `).bind(claims.tenantId).first();

        if (!tenant) {
            return json({ success: false, error: "Tenant not found" }, 404, corsHdrs);
        }

        let fanCode = tenant.fan_code;

        // Generate if doesn't exist
        if (!fanCode) {
            const prefix = (tenant.name || tenant.slug || 'TEAM').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 7);
            fanCode = `${prefix}-FAN`;

            await env.DB.prepare(`
                UPDATE tenants SET fan_code = ? WHERE id = ?
            `).bind(fanCode, claims.tenantId).run();
        }

        return json({ success: true, code: fanCode }, 200, corsHdrs);
    } catch (err) {
        if (err instanceof Response) {throw err;}
        console.error('Get fan code error:', err);
        return json({ success: false, error: "Failed to get fan code" }, 500, corsHdrs);
    }
}

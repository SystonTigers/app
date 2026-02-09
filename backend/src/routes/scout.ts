// routes/scout.ts
// Opposition scout notes for pre-match prep

import { z } from 'zod';
import { requireJWT } from '../services/auth';
import { json } from '../services/util';
import { logJSON } from '../lib/log';

// Validation schemas
const KeyPlayerSchema = z.object({
    number: z.string().optional(),
    position: z.string(),
    notes: z.string(),
});

const ScoutNoteSchema = z.object({
    opponent_name: z.string().min(1),
    formation: z.string().optional(),
    key_players: z.array(KeyPlayerSchema).optional(),
    strengths: z.array(z.string()).optional(),
    weaknesses: z.array(z.string()).optional(),
    set_pieces: z.string().optional(),
    notes: z.string().optional(),
    visible_to_players: z.boolean().optional(),
});

/**
 * GET /api/v1/fixtures/:fixtureId/scout
 * Get scout notes for a fixture
 */
export async function handleGetScoutNotes(
    req: Request,
    env: any,
    corsHdrs: Headers,
    fixtureId: string
): Promise<Response> {
    try {
        const claims = await requireJWT(req, env);
        const tenant = claims.tenantId;

        if (!tenant) {
            return json(
                { success: false, error: { code: 'MISSING_TENANT', message: 'Tenant not found' } },
                400,
                corsHdrs
            );
        }

        const db = env.DB as D1Database;

        const result = await db.prepare(`
      SELECT 
        id,
        fixture_id,
        opponent_name,
        key_players,
        formation,
        strengths,
        weaknesses,
        set_pieces,
        notes,
        visible_to_players,
        created_by,
        created_at,
        updated_at
      FROM scout_notes
      WHERE fixture_id = ? AND tenant_id = ?
    `).bind(fixtureId, tenant).first();

        if (!result) {
            return json(
                { success: true, data: null },
                200,
                corsHdrs
            );
        }

        // Parse JSON fields
        const scoutNote = {
            ...result,
            key_players: result.key_players ? JSON.parse(result.key_players as string) : [],
            strengths: result.strengths ? JSON.parse(result.strengths as string) : [],
            weaknesses: result.weaknesses ? JSON.parse(result.weaknesses as string) : [],
            visible_to_players: Boolean(result.visible_to_players),
        };

        return json({ success: true, data: scoutNote }, 200, corsHdrs);

    } catch (err) {
        logJSON({ level: 'error', msg: 'Failed to get scout notes', error: String(err) });
        return json(
            { success: false, error: { code: 'FETCH_ERROR', message: 'Failed to fetch scout notes' } },
            500,
            corsHdrs
        );
    }
}

/**
 * POST /api/v1/fixtures/:fixtureId/scout
 * Create or update scout notes for a fixture
 */
export async function handleSaveScoutNotes(
    req: Request,
    env: any,
    corsHdrs: Headers,
    fixtureId: string
): Promise<Response> {
    try {
        const claims = await requireJWT(req, env);
        const tenant = claims.tenantId;
        const userId = (claims as any).userId || claims.sub || 'unknown';

        if (!tenant) {
            return json(
                { success: false, error: { code: 'MISSING_TENANT', message: 'Tenant not found' } },
                400,
                corsHdrs
            );
        }

        const body = await req.json();
        const validated = ScoutNoteSchema.parse(body);
        const db = env.DB as D1Database;

        // Check if notes already exist
        const existing = await db.prepare(
            'SELECT id FROM scout_notes WHERE fixture_id = ? AND tenant_id = ?'
        ).bind(fixtureId, tenant).first();

        const now = Math.floor(Date.now() / 1000);

        if (existing) {
            // Update existing
            await db.prepare(`
        UPDATE scout_notes SET
          opponent_name = ?,
          formation = ?,
          key_players = ?,
          strengths = ?,
          weaknesses = ?,
          set_pieces = ?,
          notes = ?,
          visible_to_players = ?,
          updated_at = ?
        WHERE id = ?
      `).bind(
                validated.opponent_name,
                validated.formation || null,
                validated.key_players ? JSON.stringify(validated.key_players) : null,
                validated.strengths ? JSON.stringify(validated.strengths) : null,
                validated.weaknesses ? JSON.stringify(validated.weaknesses) : null,
                validated.set_pieces || null,
                validated.notes || null,
                validated.visible_to_players ? 1 : 0,
                now,
                existing.id
            ).run();

            logJSON({ level: 'info', msg: 'Scout notes updated', fixtureId, tenant });

            return json({ success: true, data: { id: existing.id, updated: true } }, 200, corsHdrs);

        } else {
            // Create new
            const id = `scout-${Date.now()}-${Math.random().toString(36).substring(7)}`;

            await db.prepare(`
        INSERT INTO scout_notes (
          id, tenant_id, fixture_id, opponent_name, formation,
          key_players, strengths, weaknesses, set_pieces, notes,
          visible_to_players, created_by, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
                id,
                tenant,
                fixtureId,
                validated.opponent_name,
                validated.formation || null,
                validated.key_players ? JSON.stringify(validated.key_players) : null,
                validated.strengths ? JSON.stringify(validated.strengths) : null,
                validated.weaknesses ? JSON.stringify(validated.weaknesses) : null,
                validated.set_pieces || null,
                validated.notes || null,
                validated.visible_to_players ? 1 : 0,
                userId,
                now,
                now
            ).run();

            logJSON({ level: 'info', msg: 'Scout notes created', id, fixtureId, tenant });

            return json({ success: true, data: { id, created: true } }, 201, corsHdrs);
        }

    } catch (err) {
        logJSON({ level: 'error', msg: 'Failed to save scout notes', error: String(err) });
        return json(
            { success: false, error: { code: 'SAVE_ERROR', message: 'Failed to save scout notes' } },
            500,
            corsHdrs
        );
    }
}

/**
 * DELETE /api/v1/fixtures/:fixtureId/scout
 * Delete scout notes for a fixture
 */
export async function handleDeleteScoutNotes(
    req: Request,
    env: any,
    corsHdrs: Headers,
    fixtureId: string
): Promise<Response> {
    try {
        const claims = await requireJWT(req, env);
        const tenant = claims.tenantId;

        if (!tenant) {
            return json(
                { success: false, error: { code: 'MISSING_TENANT', message: 'Tenant not found' } },
                400,
                corsHdrs
            );
        }

        const db = env.DB as D1Database;

        const result = await db.prepare(
            'DELETE FROM scout_notes WHERE fixture_id = ? AND tenant_id = ?'
        ).bind(fixtureId, tenant).run();

        logJSON({ level: 'info', msg: 'Scout notes deleted', fixtureId, tenant });

        return json({ success: true, data: { deleted: result.meta.changes > 0 } }, 200, corsHdrs);

    } catch (err) {
        logJSON({ level: 'error', msg: 'Failed to delete scout notes', error: String(err) });
        return json(
            { success: false, error: { code: 'DELETE_ERROR', message: 'Failed to delete scout notes' } },
            500,
            corsHdrs
        );
    }
}

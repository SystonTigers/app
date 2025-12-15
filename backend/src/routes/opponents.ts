/**
 * Opponent Badge Management Routes
 * Handles badge library, opponent teams, and Google image search proxy
 * 
 * SECURITY: All routes use requireJWT for authentication and enforce tenant isolation
 */

import { json } from '../utils/response';
import { requireJWT } from '../services/auth';

// Helper to normalize team names for matching
function normalizeTeamName(name: string): string {
    return name
        .toLowerCase()
        .trim()
        .replace(/\b(fc|f\.c\.|afc|a\.f\.c\.|football club|united|town|city)\b/gi, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .trim();
}

// ===========================================
// GET /api/v1/opponents - List tenant's opponents
// SECURITY: Uses JWT to get tenant_id, not query params
// ===========================================
export async function handleListOpponents(req: Request, env: any, corsHdrs: Headers) {
    try {
        // SECURITY: Get tenant from authenticated JWT, not from query params
        const claims = await requireJWT(req, env);
        const tenantId = claims.tenantId;

        if (!tenantId) {
            return json({ success: false, error: { message: 'Tenant not found in token' } }, 401, corsHdrs);
        }

        const opponents = await env.DB.prepare(`
            SELECT 
                ot.*,
                bl.badge_url as library_badge_url,
                bl.verified as library_verified
            FROM opponent_teams ot
            LEFT JOIN badge_library bl ON ot.badge_library_id = bl.id
            WHERE ot.tenant_id = ?
            ORDER BY ot.team_name ASC
        `).bind(tenantId).all();

        // Calculate effective badge URL for each opponent
        const results = (opponents.results || []).map((opp: any) => ({
            ...opp,
            effective_badge_url: opp.custom_badge_url || opp.library_badge_url || null,
            needs_approval: opp.status === 'pending' && opp.pending_badge_url
        }));

        return json({ success: true, data: results }, 200, corsHdrs);
    } catch (error: any) {
        if (error instanceof Response) throw error;
        console.error('[Opponents] List error:', error);
        return json({ success: false, error: { message: error.message } }, 500, corsHdrs);
    }
}

// ===========================================
// POST /api/v1/opponents - Create/update opponent
// SECURITY: Uses JWT tenant, ignores any client-provided tenant_id
// ===========================================
export async function handleCreateOpponent(req: Request, env: any, corsHdrs: Headers) {
    try {
        // SECURITY: Get tenant from authenticated JWT
        const claims = await requireJWT(req, env);
        const tenantId = claims.tenantId;

        if (!tenantId) {
            return json({ success: false, error: { message: 'Tenant not found in token' } }, 401, corsHdrs);
        }

        const body = await req.json() as any;
        const { team_name } = body;

        if (!team_name) {
            return json({ success: false, error: { message: 'team_name required' } }, 400, corsHdrs);
        }

        const normalizedName = normalizeTeamName(team_name);
        const id = crypto.randomUUID();

        // Check if exists in shared library
        const libraryMatch = await env.DB.prepare(
            `SELECT id, badge_url, verified FROM badge_library WHERE normalized_name = ?`
        ).bind(normalizedName).first();

        let badgeLibraryId = null;
        let status = 'pending';
        let pendingBadgeUrl = null;

        if (libraryMatch && libraryMatch.verified) {
            // Use verified badge from library
            badgeLibraryId = libraryMatch.id;
            status = 'approved';

            // Increment usage count
            await env.DB.prepare(
                `UPDATE badge_library SET usage_count = usage_count + 1, updated_at = unixepoch() WHERE id = ?`
            ).bind(libraryMatch.id).run();
        } else {
            // Try to fetch from Google Images
            try {
                const searchResult = await searchGoogleImages(team_name + ' badge logo', env);
                if (searchResult) {
                    pendingBadgeUrl = searchResult;
                }
            } catch (e) {
                console.warn('[Opponents] Google search failed:', e);
            }
        }

        // Insert or update - SECURITY: Uses JWT tenant_id, not user-provided
        await env.DB.prepare(`
            INSERT INTO opponent_teams (id, tenant_id, team_name, normalized_name, badge_library_id, pending_badge_url, status, first_seen_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, unixepoch())
            ON CONFLICT(tenant_id, normalized_name) DO UPDATE SET
                team_name = excluded.team_name,
                badge_library_id = COALESCE(excluded.badge_library_id, badge_library_id),
                pending_badge_url = COALESCE(excluded.pending_badge_url, pending_badge_url),
                status = CASE WHEN excluded.badge_library_id IS NOT NULL THEN 'approved' ELSE status END,
                updated_at = unixepoch()
        `).bind(id, tenantId, team_name, normalizedName, badgeLibraryId, pendingBadgeUrl, status).run();

        return json({
            success: true,
            data: {
                id,
                team_name,
                normalized_name: normalizedName,
                status,
                pending_badge_url: pendingBadgeUrl,
                library_match: !!badgeLibraryId
            }
        }, 200, corsHdrs);
    } catch (error: any) {
        if (error instanceof Response) throw error;
        console.error('[Opponents] Create error:', error);
        return json({ success: false, error: { message: error.message } }, 500, corsHdrs);
    }
}

// ===========================================
// POST /api/v1/opponents/:id/confirm - Confirm pending badge
// SECURITY: Verifies opponent belongs to tenant before allowing changes
// ===========================================
export async function handleConfirmBadge(req: Request, env: any, corsHdrs: Headers) {
    try {
        // SECURITY: Get tenant from authenticated JWT
        const claims = await requireJWT(req, env);
        const tenantId = claims.tenantId;

        if (!tenantId) {
            return json({ success: false, error: { message: 'Tenant not found in token' } }, 401, corsHdrs);
        }

        const url = new URL(req.url);
        const opponentId = url.pathname.split('/').slice(-2)[0];
        const body = await req.json() as any;
        const { action, custom_url } = body;

        // SECURITY: Verify opponent belongs to this tenant
        const opponent = await env.DB.prepare(
            `SELECT * FROM opponent_teams WHERE id = ? AND tenant_id = ?`
        ).bind(opponentId, tenantId).first();

        if (!opponent) {
            return json({ success: false, error: { message: 'Opponent not found' } }, 404, corsHdrs);
        }

        if (action === 'confirm' && opponent.pending_badge_url) {
            // Add to shared library
            const libraryId = crypto.randomUUID();
            await env.DB.prepare(`
                INSERT INTO badge_library (id, team_name, normalized_name, badge_url, verified, contributed_by)
                VALUES (?, ?, ?, ?, 1, ?)
                ON CONFLICT(normalized_name) DO UPDATE SET
                    badge_url = excluded.badge_url,
                    verified = 1,
                    usage_count = usage_count + 1,
                    updated_at = unixepoch()
            `).bind(libraryId, opponent.team_name, opponent.normalized_name, opponent.pending_badge_url, tenantId).run();

            // Update opponent to use library
            await env.DB.prepare(`
                UPDATE opponent_teams 
                SET badge_library_id = ?, status = 'approved', pending_badge_url = NULL, updated_at = unixepoch()
                WHERE id = ? AND tenant_id = ?
            `).bind(libraryId, opponentId, tenantId).run();

            return json({ success: true, message: 'Badge confirmed and added to shared library' }, 200, corsHdrs);
        }

        if (action === 'custom' && custom_url) {
            await env.DB.prepare(`
                UPDATE opponent_teams 
                SET custom_badge_url = ?, status = 'custom', pending_badge_url = NULL, updated_at = unixepoch()
                WHERE id = ? AND tenant_id = ?
            `).bind(custom_url, opponentId, tenantId).run();

            return json({ success: true, message: 'Custom badge saved' }, 200, corsHdrs);
        }

        if (action === 'reject') {
            await env.DB.prepare(`
                UPDATE opponent_teams SET pending_badge_url = NULL, updated_at = unixepoch() 
                WHERE id = ? AND tenant_id = ?
            `).bind(opponentId, tenantId).run();

            return json({ success: true, message: 'Badge rejected, awaiting manual upload' }, 200, corsHdrs);
        }

        return json({ success: false, error: { message: 'Invalid action' } }, 400, corsHdrs);
    } catch (error: any) {
        if (error instanceof Response) throw error;
        console.error('[Opponents] Confirm error:', error);
        return json({ success: false, error: { message: error.message } }, 500, corsHdrs);
    }
}

// ===========================================
// POST /api/v1/opponents/search-badge - Search Google Images
// SECURITY: Requires JWT authentication
// ===========================================
export async function handleSearchBadge(req: Request, env: any, corsHdrs: Headers) {
    try {
        // SECURITY: Require authentication for search
        await requireJWT(req, env);

        const body = await req.json() as any;
        const { query } = body;

        if (!query) {
            return json({ success: false, error: { message: 'query required' } }, 400, corsHdrs);
        }

        const imageUrl = await searchGoogleImages(query + ' badge logo football', env);

        return json({
            success: true,
            data: { image_url: imageUrl }
        }, 200, corsHdrs);
    } catch (error: any) {
        if (error instanceof Response) throw error;
        console.error('[Opponents] Search error:', error);
        return json({ success: false, error: { message: error.message } }, 500, corsHdrs);
    }
}

// ===========================================
// GET /api/v1/badge-library/search - Search shared library
// SECURITY: Requires JWT authentication (but data is shared across tenants)
// ===========================================
export async function handleSearchLibrary(req: Request, env: any, corsHdrs: Headers) {
    try {
        // SECURITY: Require authentication
        await requireJWT(req, env);

        const url = new URL(req.url);
        const query = url.searchParams.get('q') || '';
        const normalized = normalizeTeamName(query);

        const results = await env.DB.prepare(`
            SELECT * FROM badge_library 
            WHERE normalized_name LIKE ? OR team_name LIKE ?
            ORDER BY verified DESC, usage_count DESC
            LIMIT 20
        `).bind(`%${normalized}%`, `%${query}%`).all();

        return json({ success: true, data: results.results || [] }, 200, corsHdrs);
    } catch (error: any) {
        if (error instanceof Response) throw error;
        console.error('[BadgeLibrary] Search error:', error);
        return json({ success: false, error: { message: error.message } }, 500, corsHdrs);
    }
}

// ===========================================
// DELETE /api/v1/opponents/:id - Delete opponent
// SECURITY: Verifies opponent belongs to tenant before deleting
// ===========================================
export async function handleDeleteOpponent(req: Request, env: any, corsHdrs: Headers) {
    try {
        // SECURITY: Get tenant from authenticated JWT
        const claims = await requireJWT(req, env);
        const tenantId = claims.tenantId;

        if (!tenantId) {
            return json({ success: false, error: { message: 'Tenant not found in token' } }, 401, corsHdrs);
        }

        const url = new URL(req.url);
        const opponentId = url.pathname.split('/').pop();

        // SECURITY: Only delete if belongs to this tenant
        const result = await env.DB.prepare(
            `DELETE FROM opponent_teams WHERE id = ? AND tenant_id = ?`
        ).bind(opponentId, tenantId).run();

        if (result.meta?.changes === 0) {
            return json({ success: false, error: { message: 'Opponent not found' } }, 404, corsHdrs);
        }

        return json({ success: true }, 200, corsHdrs);
    } catch (error: any) {
        if (error instanceof Response) throw error;
        console.error('[Opponents] Delete error:', error);
        return json({ success: false, error: { message: error.message } }, 500, corsHdrs);
    }
}

// ===========================================
// POST /api/v1/opponents/:id/upload-badge - Upload badge to R2
// SECURITY: Verifies opponent belongs to tenant before allowing upload
// ===========================================
export async function handleUploadBadge(req: Request, env: any, corsHdrs: Headers) {
    try {
        // SECURITY: Get tenant from authenticated JWT
        const claims = await requireJWT(req, env);
        const tenantId = claims.tenantId;

        if (!tenantId) {
            return json({ success: false, error: { message: 'Tenant not found in token' } }, 401, corsHdrs);
        }

        const url = new URL(req.url);
        const opponentId = url.pathname.split('/').slice(-2)[0];

        const contentType = req.headers.get('content-type') || '';
        if (!contentType.includes('image/')) {
            return json({ success: false, error: { message: 'Must be an image file' } }, 400, corsHdrs);
        }

        // SECURITY: Verify opponent belongs to this tenant
        const opponent = await env.DB.prepare(
            `SELECT * FROM opponent_teams WHERE id = ? AND tenant_id = ?`
        ).bind(opponentId, tenantId).first();

        if (!opponent) {
            return json({ success: false, error: { message: 'Opponent not found' } }, 404, corsHdrs);
        }

        // Upload to R2 - uses tenant's folder for isolation
        const fileBuffer = await req.arrayBuffer();
        const extension = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg';
        const r2Key = `badges/${tenantId}/${opponent.normalized_name}.${extension}`;

        await env.R2_MEDIA.put(r2Key, fileBuffer, {
            httpMetadata: { contentType }
        });

        // Use public bucket URL from env if available
        const publicBucketUrl = env.R2_PUBLIC_URL || 'https://pub-YOUR_R2_PUBLIC_URL.r2.dev';
        const badgeUrl = `${publicBucketUrl}/${r2Key}`;

        // Update opponent with custom badge
        await env.DB.prepare(`
            UPDATE opponent_teams 
            SET custom_badge_url = ?, status = 'custom', pending_badge_url = NULL, updated_at = unixepoch()
            WHERE id = ? AND tenant_id = ?
        `).bind(badgeUrl, opponentId, tenantId).run();

        return json({
            success: true,
            data: { badge_url: badgeUrl }
        }, 200, corsHdrs);
    } catch (error: any) {
        if (error instanceof Response) throw error;
        console.error('[Opponents] Upload error:', error);
        return json({ success: false, error: { message: error.message } }, 500, corsHdrs);
    }
}

// ===========================================
// Helper: Google Custom Search for images
// ===========================================
async function searchGoogleImages(query: string, env: any): Promise<string | null> {
    const apiKey = env.GOOGLE_CUSTOM_SEARCH_KEY;
    const searchEngineId = env.GOOGLE_CUSTOM_SEARCH_CX;

    if (!apiKey || !searchEngineId) {
        console.warn('[GoogleSearch] API key or CX not configured');
        return null;
    }

    try {
        const url = new URL('https://www.googleapis.com/customsearch/v1');
        url.searchParams.set('key', apiKey);
        url.searchParams.set('cx', searchEngineId);
        url.searchParams.set('q', query);
        url.searchParams.set('searchType', 'image');
        url.searchParams.set('num', '1');
        url.searchParams.set('imgSize', 'medium');
        url.searchParams.set('safe', 'active');

        const response = await fetch(url.toString());
        if (!response.ok) {
            console.error('[GoogleSearch] API error:', response.status);
            return null;
        }

        const data = await response.json() as any;
        if (data.items && data.items.length > 0) {
            return data.items[0].link;
        }

        return null;
    } catch (error) {
        console.error('[GoogleSearch] Error:', error);
        return null;
    }
}

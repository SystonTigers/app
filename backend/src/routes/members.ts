
import { json } from "../services/util";
import { hasAnyRole, requireTenantJWT, STAFF_ROLES } from "../services/auth";

// GET /api/v1/members/search?q=...
export async function handleSearchMembers(req: Request, env: any, corsHdrs: Headers) {
    try {
        const claims = await requireTenantJWT(req, env);
        const url = new URL(req.url);
        const query = url.searchParams.get('q') || '';

        if (query.length < 2) {
            return json({ success: true, data: [] }, 200, corsHdrs);
        }

        // Search users by email or name (inside profile JSON)
        // Note: SQLite JSON queries can be tricky. We'll fetch potential matches and filter if needed, 
        // or use simple LIKE on the text column if valid.
        // For 'profile', it's a text column containing JSON. 

        // Everyone can find people by name (for @mentions); only staff can search
        // by email or see addresses, so families' emails stay private.
        const staff = hasAnyRole(claims, STAFF_ROLES);
        const searchPattern = `%${query.replace(/[%_]/g, '')}%`;
        const result = await env.DB.prepare(`
            SELECT id, email, profile
            FROM auth_users
            WHERE tenant_id = ?
            AND (${staff ? 'email LIKE ? OR ' : ''}json_extract(profile, '$.name') LIKE ?)
            LIMIT 10
        `).bind(...(staff ? [claims.tenantId, searchPattern, searchPattern] : [claims.tenantId, searchPattern]))
            .all();

        const members = (result.results || []).map((row: any) => {
            let profile: Record<string, unknown> = {};
            try {
                profile = JSON.parse(row.profile || '{}');
            } catch { /* keep empty */ }
            const name = typeof profile.name === 'string' && profile.name.trim() ? profile.name.trim() : null;
            return {
                id: row.id,
                ...(staff ? { email: row.email } : {}),
                name: name ?? (staff ? row.email.split('@')[0] : 'Club member'),
                avatar: typeof profile.avatar === 'string' ? profile.avatar : null
            };
        });

        return json({ success: true, data: members }, 200, corsHdrs);
    } catch (err) {
        console.error('Search members error:', err);
        if (err instanceof Response) {throw err;}
        return json({ success: false, error: 'Failed to search members' }, 500, corsHdrs);
    }
}

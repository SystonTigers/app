
import { json } from "../services/util";
import { requireJWT } from "../services/auth";

// GET /api/v1/members/search?q=...
export async function handleSearchMembers(req: Request, env: any, corsHdrs: Headers) {
    try {
        const claims = await requireJWT(req, env);
        const url = new URL(req.url);
        const query = url.searchParams.get('q') || '';

        if (query.length < 2) {
            return json({ success: true, data: [] }, 200, corsHdrs);
        }

        // Search users by email or name (inside profile JSON)
        // Note: SQLite JSON queries can be tricky. We'll fetch potential matches and filter if needed, 
        // or use simple LIKE on the text column if valid.
        // For 'profile', it's a text column containing JSON. 

        const sql = `
            SELECT id, email, profile 
            FROM auth_users 
            WHERE tenant_id = ? 
            AND (email LIKE ? OR profile LIKE ?)
            LIMIT 10
        `;

        const searchPattern = `%${query}%`;
        const result = await env.DB.prepare(sql)
            .bind(claims.tenantId, searchPattern, searchPattern)
            .all();

        const members = (result.results || []).map((row: any) => {
            let profile = {};
            try {
                profile = JSON.parse(row.profile || '{}');
            } catch (e) { }

            return {
                id: row.id,
                email: row.email,
                name: (profile as any).name || row.email.split('@')[0],
                avatar: (profile as any).avatar || null
            };
        });

        return json({ success: true, data: members }, 200, corsHdrs);
    } catch (err) {
        console.error('Search members error:', err);
        if (err instanceof Response) {throw err;}
        return json({ success: false, error: 'Failed to search members' }, 500, corsHdrs);
    }
}

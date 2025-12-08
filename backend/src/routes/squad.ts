import { json } from "../services/util";
import { requireJWT } from "../services/auth";

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

export async function handleAddPlayer(req: Request, env: any, corsHdrs: Headers) {
    try {
        const claims = await requireJWT(req, env);
        const tenant = claims.tenantId;
        const body = await req.json() as any;
        // body: { name, number, position, ... announce: boolean, signingNotes: string }

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

        return json({ success: true, id }, 200, corsHdrs);

    } catch (err: any) {
        console.error('Add Player Error:', err);
        return json({ success: false, error: err.message }, 500, corsHdrs);
    }
}

import { json } from "../services/util";
import { requireJWT } from "../services/auth";

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
        console.error("SQUAD_UPDATE_FAIL", err);
        return json({ success: false, error: "Failed to update squad" }, 500, corsHdrs);
    }
}

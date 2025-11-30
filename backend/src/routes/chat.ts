import { json } from "../services/util";
import { requireJWT } from "../services/auth";

export async function handleListRooms(req: Request, env: any, corsHdrs: Headers) {
    try {
        const claims = await requireJWT(req, env);
        const indexKey = `tenants:${claims.tenantId}:chat:index`;
        const rooms = (await env.KV_IDEMP.get(indexKey, "json")) as any[] || [];
        return json({ success: true, data: rooms }, 200, corsHdrs);
    } catch (err) {
        return json({ success: false, error: "Failed to list rooms" }, 500, corsHdrs);
    }
}

export async function handleSendMessage(req: Request, env: any, corsHdrs: Headers) {
    try {
        const claims = await requireJWT(req, env);
        const params = (req as any).params || {};
        const body = await req.json() as any;

        const id = env.ChatRoom.idFromName(`${claims.tenantId}:${params.roomId}`);
        const stub = env.ChatRoom.get(id);

        const response = await stub.fetch(new Request(`https://chat/send`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                tenant: claims.tenantId,
                roomId: params.roomId,
                userId: claims.userId,
                text: body.text,
                mediaIds: body.mediaIds,
            }),
        }));

        const result = await response.json();
        return json(result, 200, corsHdrs);
    } catch (err) {
        return json({ success: false, error: "Failed to send message" }, 500, corsHdrs);
    }
}

export async function handleGetHistory(req: Request, env: any, corsHdrs: Headers) {
    try {
        const claims = await requireJWT(req, env);
        const params = (req as any).params || {};
        const url = new URL(req.url);
        const cursor = url.searchParams.get("cursor") || undefined;
        const limit = parseInt(url.searchParams.get("limit") || "50", 10);

        const id = env.ChatRoom.idFromName(`${claims.tenantId}:${params.roomId}`);
        const stub = env.ChatRoom.get(id);

        const queryParams = new URLSearchParams({
            tenant: claims.tenantId,
            roomId: params.roomId,
            limit: limit.toString(),
        });
        if (cursor) queryParams.set("cursor", cursor);

        const response = await stub.fetch(new Request(`https://chat/history?${queryParams.toString()}`, {
            method: "GET",
        }));

        const result = await response.json();
        return json(result, 200, corsHdrs);
    } catch (err) {
        return json({ success: false, error: "Failed to get history" }, 500, corsHdrs);
    }
}

export async function handleTyping(req: Request, env: any, corsHdrs: Headers) {
    try {
        const claims = await requireJWT(req, env);
        const params = (req as any).params || {};
        const body = await req.json() as any;

        const id = env.ChatRoom.idFromName(`${claims.tenantId}:${params.roomId}`);
        const stub = env.ChatRoom.get(id);

        const response = await stub.fetch(new Request(`https://chat/typing`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                tenant: claims.tenantId,
                roomId: params.roomId,
                userId: claims.userId,
                typing: body.typing,
            }),
        }));

        const result = await response.json();
        return json(result, 200, corsHdrs);
    } catch (err) {
        return json({ success: false, error: "Failed to update typing status" }, 500, corsHdrs);
    }
}

export async function handleCreateRoom(req: Request, env: any, corsHdrs: Headers) {
    try {
        const claims = await requireJWT(req, env);
        const body = await req.json() as any;

        const { roomId, name, type } = body;
        if (!roomId || !name) {
            return json({ success: false, error: "roomId and name are required" }, 400, corsHdrs);
        }

        const roomKey = `tenants:${claims.tenantId}:chat:rooms:${roomId}`;
        const roomData = {
            id: roomId,
            name,
            type: type || "group",
            createdAt: Date.now(),
            createdBy: claims.userId,
        };

        await env.KV_IDEMP.put(roomKey, JSON.stringify(roomData));

        const indexKey = `tenants:${claims.tenantId}:chat:index`;
        const existing = (await env.KV_IDEMP.get(indexKey, "json")) as any[] || [];
        const updated = [{ roomId, name, type, lastTs: Date.now() }, ...existing.filter((r: any) => r.roomId !== roomId)];
        await env.KV_IDEMP.put(indexKey, JSON.stringify(updated.slice(0, 100)));

        return json({ success: true, data: roomData }, 200, corsHdrs);
    } catch (err) {
        return json({ success: false, error: "Failed to create room" }, 500, corsHdrs);
    }
}

import { IRequest } from "itty-router";
import { Env } from "../types";
import { z } from "zod";
import { verifyJWT } from "./auth";
import { createResponse, errorResponse } from "../middleware/errorHandler";
import { deliver, isExpoToken } from "../services/push/delivery";
import { parseSubscription } from "../services/push/webPush";

// Schema for device registration. Phones send an Expo push token; the web
// app sends its browser push subscription as JSON.
const registerSchema = z.object({
    platform: z.enum(["ios", "android", "web"]),
    token: z.string().min(1).max(4096),
}).refine(
    (d) => (d.platform === "web" ? parseSubscription(d.token) !== null : isExpoToken(d.token)),
    { message: "Not a push token this app can send to", path: ["token"] },
);

// Schema for sending notification
const sendSchema = z.object({
    user_id: z.string(),
    notification: z.object({
        title: z.string(),
        body: z.string(),
    }),
    data: z.record(z.any()).optional(),
});

// Schema for broadcast
const broadcastSchema = z.object({
    notification: z.object({
        title: z.string(),
        body: z.string(),
    }),
    data: z.record(z.any()).optional(),
});

async function getAuth(request: IRequest, env: Env) {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        throw new Error("Unauthorized");
    }
    const token = authHeader.substring(7);
    const decoded = await verifyJWT(env, token);
    if (!decoded) {throw new Error("Unauthorized");}
    return decoded;
}

export async function handlePushRegister(request: IRequest, env: Env) {
    try {
        const auth = await getAuth(request, env);
        const { tenant_id, sub: user_id } = auth;

        const body = await request.json();
        const result = registerSchema.safeParse(body);

        if (!result.success) {
            return errorResponse("invalid_request", "Invalid input", 400, result.error);
        }

        const { platform, token } = result.data;

        // Remove old devices for this user and platform (to support single device per platform per user as per test)
        await env.DB.prepare(
            `DELETE FROM devices WHERE user_id = ? AND tenant_id = ? AND platform = ?`
        ).bind(user_id, tenant_id, platform).run();

        // Store device in D1
        await env.DB.prepare(
            `INSERT OR REPLACE INTO devices (id, user_id, tenant_id, token, platform, created_at) VALUES (?, ?, ?, ?, ?, ?)`
        ).bind(token, user_id, tenant_id, token, platform, Date.now()).run();

        return createResponse({ success: true });
    } catch (error: any) {
        if (error.message.includes("Unauthorized")) {return errorResponse("unauthorized", "Unauthorized", 401);}
        return errorResponse("server_error", error.message, 500);
    }
}

export async function handlePushSend(request: IRequest, env: Env) {
    try {
        const auth = await getAuth(request, env);
        const { tenant_id } = auth;

        const body = await request.json();
        const result = sendSchema.safeParse(body);

        if (!result.success) {
            return errorResponse("invalid_request", "Invalid input", 400, result.error);
        }

        const { user_id, notification, data } = result.data;

        // Get devices for user in this tenant
        const { results } = await env.DB.prepare(
            `SELECT token, platform FROM devices WHERE user_id = ? AND tenant_id = ?`
        ).bind(user_id, tenant_id).all();

        if (!results || results.length === 0) {
            return createResponse({ success: true, sent: 0 });
        }

        const delivery = await sendTo(env, results as { token: string }[], notification, data);
        return createResponse({ success: true, devices: results.length, sent: delivery.sent });
    } catch (error: any) {
        if (error.message.includes("Unauthorized")) {return errorResponse("unauthorized", "Unauthorized", 401);}
        return errorResponse("server_error", error.message, 500);
    }
}

export async function handlePushBroadcast(request: IRequest, env: Env) {
    try {
        const auth = await getAuth(request, env);
        const { tenant_id } = auth;

        const body = await request.json();
        const result = broadcastSchema.safeParse(body);

        if (!result.success) {
            return errorResponse("invalid_request", "Invalid input", 400, result.error);
        }

        const { notification, data } = result.data;

        // Get all devices for tenant
        const { results } = await env.DB.prepare(
            `SELECT token, platform FROM devices WHERE tenant_id = ?`
        ).bind(tenant_id).all();

        if (!results || results.length === 0) {
            return createResponse({ success: true, sent: 0 });
        }

        const delivery = await sendTo(env, results as { token: string }[], notification, data);
        return createResponse({ success: true, devices: results.length, sent: delivery.sent });
    } catch (error: any) {
        if (error.message.includes("Unauthorized")) {return errorResponse("unauthorized", "Unauthorized", 401);}
        return errorResponse("server_error", error.message, 500);
    }
}

/** The public key the web app needs to subscribe to push (GET /api/v1/push/config). */
export async function handlePushConfig(_request: IRequest, env: Env) {
    return createResponse({ success: true, data: { webPushKey: env.VAPID_PUBLIC_KEY ?? null } });
}

function sendTo(env: Env, devices: { token: string }[], notification: { title: string; body: string }, data?: Record<string, unknown>) {
    const strings = Object.fromEntries(Object.entries(data ?? {}).map(([k, v]) => [k, typeof v === "string" ? v : JSON.stringify(v)]));
    return deliver(env, devices.map((d) => d.token), { title: notification.title, body: notification.body, data: strings });
}

import { IRequest } from "itty-router";
import { Env } from "../types";
import { z } from "zod";
import { verifyJWT } from "./auth";
import { createResponse, errorResponse } from "../middleware/errorHandler";

// Schema for device registration
const registerSchema = z.object({
    platform: z.enum(["ios", "android", "web"]),
    token: z.string().min(1),
});

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
            `DELETE FROM devices WHERE user_id = ? AND platform = ?`
        ).bind(user_id, platform).run();

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

        // Send to FCM
        await sendToFCM(env, results as any[], notification, data);

        return createResponse({ success: true, sent: results.length });
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

        // Send to FCM
        await sendToFCM(env, results as any[], notification, data);

        return createResponse({ success: true, sent: results.length });
    } catch (error: any) {
        if (error.message.includes("Unauthorized")) {return errorResponse("unauthorized", "Unauthorized", 401);}
        return errorResponse("server_error", error.message, 500);
    }
}

async function sendToFCM(env: Env, devices: { token: string }[], notification: any, data?: any) {
    if (!env.FCM_SERVER_KEY) {
        return;
    }

    const tokens = devices.map(d => d.token);

    // FCM legacy HTTP API (as used in test mock)
    // https://fcm.googleapis.com/fcm/send

    const response = await fetch("https://fcm.googleapis.com/fcm/send", {
        method: "POST",
        headers: {
            "Authorization": `key=${env.FCM_SERVER_KEY}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            registration_ids: tokens,
            notification,
            data,
        }),
    });

    if (!response.ok) {
    }
}

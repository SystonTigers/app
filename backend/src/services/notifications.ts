/**
 * Notification Service
 * Centralized helper for sending push notifications across the app
 * (delivered by services/push/delivery.ts: Web Push and Expo).
 */
import { deliver } from "./push/delivery";

export interface NotificationPayload {
    title: string;
    body: string;
    data?: Record<string, any>;
}

/**
 * Send push notification to all devices of a specific tenant
 */
export async function notifyTenant(
    env: any,
    tenantId: string,
    notification: NotificationPayload
): Promise<{ sent: number }> {
    try {
        // Get all devices for tenant
        const { results } = await env.DB.prepare(
            `SELECT token FROM devices WHERE tenant_id = ?`
        ).bind(tenantId).all();

        if (!results || results.length === 0) {
            return { sent: 0 };
        }

        const tokens = results.map((d: any) => d.token);
        await sendFCM(env, tokens, notification);

        return { sent: tokens.length };
    } catch (error) {
        console.error('[Notify] Failed to send tenant notification:', error);
        return { sent: 0 };
    }
}

/**
 * Send push notification to all admins of a tenant
 */
export async function notifyTenantAdmins(
    env: any,
    tenantId: string,
    notification: NotificationPayload
): Promise<{ sent: number }> {
    try {
        // Get devices for admin users in this tenant
        const { results } = await env.DB.prepare(`
            SELECT d.token 
            FROM devices d
            JOIN auth_users u ON d.user_id = u.id
            WHERE d.tenant_id = ?
            AND u.roles LIKE '%admin%'
        `).bind(tenantId).all();

        if (!results || results.length === 0) {
            return { sent: 0 };
        }

        const tokens = results.map((d: any) => d.token);
        await sendFCM(env, tokens, notification);

        return { sent: tokens.length };
    } catch (error) {
        console.error('[Notify] Failed to send admin notification:', error);
        return { sent: 0 };
    }
}

/**
 * Create in-app notification (stored in DB)
 */
export async function createInAppNotification(
    env: any,
    tenantId: string,
    userId: string | null,
    type: string,
    title: string,
    body: string,
    data?: Record<string, any>
): Promise<void> {
    const id = crypto.randomUUID();

    await env.DB.prepare(`
        INSERT INTO notifications (id, tenant_id, user_id, type, title, body, data, read, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 0, unixepoch())
    `).bind(
        id,
        tenantId,
        userId,
        type,
        title,
        body,
        JSON.stringify(data || {})
    ).run();
}

/** Send one notification to these device tokens. */
async function sendFCM(
    env: any,
    tokens: string[],
    notification: NotificationPayload
): Promise<void> {
    const data = Object.fromEntries(Object.entries(notification.data ?? {}).map(([k, v]) => [k, typeof v === "string" ? v : JSON.stringify(v)]));
    await deliver(env, tokens, { title: notification.title, body: notification.body, data });
}

// Pre-built notification templates
export const NotificationTemplates = {
    friendlyMatchRequest: (requesterTeam: string) => ({
        title: '⚽ New Friendly Request!',
        body: `${requesterTeam} wants to play a friendly match`,
    }),

    friendlyMatchAccepted: (hostTeam: string, date: string) => ({
        title: '✅ Friendly Confirmed!',
        body: `${hostTeam} accepted your friendly request${date ? ` for ${date}` : ''}`,
    }),

    friendlyMatchDeclined: (hostTeam: string) => ({
        title: '❌ Friendly Declined',
        body: `${hostTeam} declined your friendly request`,
    }),

    matchReminder: (opponent: string, kickoff: string) => ({
        title: '⏰ Match Today!',
        body: `vs ${opponent} at ${kickoff}`,
    }),

    newDiscussion: (title: string) => ({
        title: '💬 New Discussion',
        body: title,
    }),
};

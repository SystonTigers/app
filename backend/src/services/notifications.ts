import { STAFF_ROLES } from "./auth";
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
        // Every member of staff (coaches and managers too), not only admins
        const { results } = await env.DB.prepare(`
            SELECT d.token
            FROM devices d
            JOIN auth_users u ON d.user_id = u.id AND u.tenant_id = d.tenant_id
            WHERE d.tenant_id = ? AND ${STAFF_SQL}
        `).bind(tenantId, ...STAFF_ROLES).all();

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
    // No one named: the club's staff each get it (a notification always belongs to someone)
    let userIds: string[] = userId ? [userId] : [];
    if (!userId) {
        const { results } = await env.DB.prepare(
            `SELECT u.id FROM auth_users u WHERE u.tenant_id = ? AND ${STAFF_SQL}`,
        ).bind(tenantId, ...STAFF_ROLES).all();
        userIds = (results ?? []).map((r: { id: string }) => r.id);
    }
    if (!userIds.length) return;
    const payload = JSON.stringify(data || {});
    await env.DB.batch(userIds.map((uid) => env.DB.prepare(`
        INSERT INTO notifications (id, tenant_id, user_id, type, title, body, data, read, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 0, unixepoch())
    `).bind(crypto.randomUUID(), tenantId, uid, type, title, body, payload)));
}

/** Staff accounts: a role in the user's roles list (a JSON array) is a staff role. */
const STAFF_SQL = `EXISTS (SELECT 1 FROM json_each(CASE WHEN json_valid(u.roles) THEN u.roles ELSE '[]' END) r WHERE r.value IN (${STAFF_ROLES.map(() => '?').join(', ')}))`;

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

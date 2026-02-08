import { json } from "../services/util";
import { requireJWT } from "../services/auth";

interface Notification {
    id: string;
    tenant_id: string;
    user_id: string;
    type: 'discussion_comment' | 'comment_reply' | 'mention' | 'discussion_locked' | 'discussion_pinned';
    title: string;
    message: string;
    link: string | null;
    related_id: string | null;
    read: boolean;
    created_at: number;
}

// GET /api/v1/notifications - List user's notifications
export async function handleListNotifications(req: Request, env: any, corsHdrs: Headers) {
    try {
        const claims = await requireJWT(req, env);
        const url = new URL(req.url);
        const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100);
        const offset = parseInt(url.searchParams.get('offset') || '0');
        const unreadOnly = url.searchParams.get('unread') === 'true';

        let query = `
            SELECT * FROM notifications 
            WHERE tenant_id = ? AND user_id = ?
        `;
        const binds: any[] = [claims.tenantId, claims.userId];

        if (unreadOnly) {
            query += ` AND read = 0`;
        }

        query += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
        binds.push(limit, offset);

        const result = await env.DB.prepare(query).bind(...binds).all();

        const notifications = (result.results || []).map((row: any) => ({
            ...row,
            read: Boolean(row.read)
        }));

        return json({ success: true, data: notifications }, 200, corsHdrs);
    } catch (err) {
        console.error('List notifications error:', err);
        if (err instanceof Response) {throw err;}
        return json({ success: false, error: 'Failed to list notifications' }, 500, corsHdrs);
    }
}

// GET /api/v1/notifications/unread-count - Get unread count
export async function handleUnreadCount(req: Request, env: any, corsHdrs: Headers) {
    try {
        const claims = await requireJWT(req, env);

        const result = await env.DB.prepare(`
            SELECT COUNT(*) as count FROM notifications 
            WHERE tenant_id = ? AND user_id = ? AND read = 0
        `).bind(claims.tenantId, claims.userId).first();

        return json({ success: true, data: { count: result?.count || 0 } }, 200, corsHdrs);
    } catch (err) {
        console.error('Unread count error:', err);
        if (err instanceof Response) {throw err;}
        return json({ success: false, error: 'Failed to get unread count' }, 500, corsHdrs);
    }
}

// POST /api/v1/notifications/:id/read - Mark as read
export async function handleMarkRead(req: Request, env: any, corsHdrs: Headers, notificationId: string) {
    try {
        const claims = await requireJWT(req, env);

        await env.DB.prepare(`
            UPDATE notifications SET read = 1 
            WHERE id = ? AND tenant_id = ? AND user_id = ?
        `).bind(notificationId, claims.tenantId, claims.userId).run();

        return json({ success: true }, 200, corsHdrs);
    } catch (err) {
        console.error('Mark read error:', err);
        if (err instanceof Response) {throw err;}
        return json({ success: false, error: 'Failed to mark notification read' }, 500, corsHdrs);
    }
}

// POST /api/v1/notifications/read-all - Mark all as read
export async function handleMarkAllRead(req: Request, env: any, corsHdrs: Headers) {
    try {
        const claims = await requireJWT(req, env);

        await env.DB.prepare(`
            UPDATE notifications SET read = 1 
            WHERE tenant_id = ? AND user_id = ? AND read = 0
        `).bind(claims.tenantId, claims.userId).run();

        return json({ success: true }, 200, corsHdrs);
    } catch (err) {
        console.error('Mark all read error:', err);
        if (err instanceof Response) {throw err;}
        return json({ success: false, error: 'Failed to mark all read' }, 500, corsHdrs);
    }
}

// Helper: Create a notification
export async function createNotification(
    env: any,
    tenantId: string,
    userId: string,
    type: Notification['type'],
    title: string,
    message: string,
    link?: string,
    relatedId?: string
) {
    const id = crypto.randomUUID();
    const now = Date.now();

    try {
        await env.DB.prepare(`
            INSERT INTO notifications (id, tenant_id, user_id, type, title, message, link, related_id, read, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
        `).bind(id, tenantId, userId, type, title, message, link || null, relatedId || null, now).run();

        return { id, tenant_id: tenantId, user_id: userId, type, title, message, link, related_id: relatedId, read: false, created_at: now };
    } catch (err) {
        console.error('Failed to create notification:', err);
        return null;
    }
}

// Helper: Extract @mentions from text
export function extractMentions(content: string): string[] {
    const mentionRegex = /@(\w+)/g;
    const mentions: string[] = [];
    let match;
    while ((match = mentionRegex.exec(content)) !== null) {
        mentions.push(match[1]);
    }
    return [...new Set(mentions)]; // Remove duplicates
}

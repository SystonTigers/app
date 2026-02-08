import { json } from "../services/util";
import { requireJWT } from "../services/auth";

/**
 * Mobile API Service - Notification Scheduling
 * Handles match reminders and MOTM voting alerts
 */

export async function handleScheduleMatchReminder(req: Request, env: any, corsHdrs: Headers) {
    try {
        const claims = await requireJWT(req, env);
        const body = await req.json() as { fixtureId: string; matchTitle: string; kickoffTime: string };

        const { fixtureId, matchTitle, kickoffTime } = body;

        if (!fixtureId || !matchTitle || !kickoffTime) {
            return json({ success: false, error: "Missing required fields" }, 400, corsHdrs);
        }

        // Calculate 1 hour before kickoff
        const kickoffDate = new Date(kickoffTime);
        const reminderTime = new Date(kickoffDate.getTime() - 60 * 60 * 1000);

        // Store scheduled notification
        const notificationId = crypto.randomUUID();
        await env.DB.prepare(`
            INSERT INTO scheduled_notifications (
                id, tenant_id, user_id, notification_type,
                title, body, data, scheduled_for, created_at
            ) VALUES (?, ?, ?, 'match_reminder', ?, ?, ?, ?, ?)
        `).bind(
            notificationId,
            claims.tenantId,
            null, // null = broadcast to all tenant users
            '⚽ Match Starting Soon!',
            `${matchTitle} starts in 1 hour`,
            JSON.stringify({ fixtureId, kickoffTime }),
            reminderTime.getTime(),
            Date.now()
        ).run();

        return json({
            success: true,
            notificationId,
            scheduledFor: reminderTime.toISOString()
        }, 200, corsHdrs);
    } catch (err) {
        if (err instanceof Response) {throw err;}
        console.error('Schedule match reminder error:', err);
        return json({ success: false, error: "Failed to schedule reminder" }, 500, corsHdrs);
    }
}

export async function handleScheduleMOTMVoting(req: Request, env: any, corsHdrs: Headers) {
    try {
        const claims = await requireJWT(req, env);
        const body = await req.json() as { fixtureId: string; matchTitle: string };

        const { fixtureId, matchTitle } = body;

        if (!fixtureId || !matchTitle) {
            return json({ success: false, error: "Missing required fields" }, 400, corsHdrs);
        }

        // Schedule immediately
        const notificationId = crypto.randomUUID();
        await env.DB.prepare(`
            INSERT INTO scheduled_notifications (
                id, tenant_id, user_id, notification_type,
                title, body, data, scheduled_for, created_at
            ) VALUES (?, ?, ?, 'motm_voting', ?, ?, ?, ?, ?)
        `).bind(
            notificationId,
            claims.tenantId,
            null,
            '🌟 Vote for Man of the Match',
            `${matchTitle} - Cast your vote now!`,
            JSON.stringify({ fixtureId }),
            Date.now() + 5000, // 5 seconds from now
            Date.now()
        ).run();

        return json({
            success: true,
            notificationId
        }, 200, corsHdrs);
    } catch (err) {
        if (err instanceof Response) {throw err;}
        console.error('Schedule MOTM voting error:', err);
        return json({ success: false, error: "Failed to schedule notification" }, 500, corsHdrs);
    }
}

/**
 * Process scheduled notifications (called by cron job)
 */
export async function processScheduledNotifications(env: any) {
    try {
        // Get notifications that should be sent
        const notifications = await env.DB.prepare(`
            SELECT * FROM scheduled_notifications
            WHERE scheduled_for <= ? AND sent_at IS NULL
            ORDER BY scheduled_for ASC
            LIMIT 100
        `).bind(Date.now()).all();

        if (!notifications.results || notifications.results.length === 0) {
            return { processed: 0 };
        }

        let processed = 0;

        for (const notification of notifications.results) {
            try {
                // Get devices for this tenant (or specific user if set)
                const query = notification.user_id
                    ? `SELECT token, platform FROM devices WHERE tenant_id = ? AND user_id = ?`
                    : `SELECT token, platform FROM devices WHERE tenant_id = ?`;

                const binds = notification.user_id
                    ? [notification.tenant_id, notification.user_id]
                    : [notification.tenant_id];

                const devices = await env.DB.prepare(query).bind(...binds).all();

                if (devices.results && devices.results.length > 0) {
                    // Send via FCM
                    await sendToFCM(env, devices.results as any[], {
                        title: notification.title,
                        body: notification.body
                    }, notification.data ? JSON.parse(notification.data) : undefined);
                }

                // Mark as sent
                await env.DB.prepare(`
                    UPDATE scheduled_notifications SET sent_at = ? WHERE id = ?
                `).bind(Date.now(), notification.id).run();

                processed++;
            } catch (err) {
                console.error(`Failed to process notification ${notification.id}:`, err);
            }
        }

        return { processed };
    } catch (err) {
        console.error('Process scheduled notifications error:', err);
        return { processed: 0, error: err };
    }
}

async function sendToFCM(env: any, devices: { token: string }[], notification: any, data?: any) {
    if (!env.FCM_SERVER_KEY) {
        return;
    }

    const tokens = devices.map(d => d.token);

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
        console.error('FCM send failed:', await response.text());
    }
}

import { z } from "zod";
import { json } from "../services/util";
import { parse, isValidationError } from "../lib/validate";
import { requireStaff, requireTenantJWT, type TenantClaims } from "../services/auth";

/**
 * Members report posts and Team talk messages; staff review them.
 * Content types: `post` = club feed post, `comment` = Team talk comment,
 * `message` = a Team talk conversation (its title). The club always comes
 * from the sign-in, never from the request.
 */

const REASONS = ['spam', 'harassment', 'hate_speech', 'violence', 'inappropriate', 'misinformation', 'other'] as const;
type ContentType = 'post' | 'comment' | 'message';

const ReportContentSchema = z.object({
    contentType: z.enum(['post', 'comment', 'message'], {
        errorMap: () => ({ message: "contentType must be 'post', 'comment', or 'message'" })
    }),
    contentId: z.string().min(1, "contentId required").max(200),
    reason: z.enum(REASONS, { errorMap: () => ({ message: "Invalid report reason" }) }),
    details: z.string().max(1000).optional()
});

/** A failed login check (thrown Response) becomes a proper 401/403 with CORS headers. */
function authFailure(err: unknown, corsHdrs: Headers): Response | null {
    if (!(err instanceof Response)) return null;
    const message = err.status === 401 ? 'Please log in again.' : "You can't do that for this club.";
    return json({ success: false, error: { code: err.status === 401 ? 'UNAUTHORIZED' : 'FORBIDDEN', message } }, err.status, corsHdrs);
}

/** Does this piece of content exist at this club? (Reports for other clubs' content are refused.) */
async function contentExists(env: any, tenantId: string, type: ContentType, id: string): Promise<boolean> {
    const sql = type === 'post'
        ? `SELECT id FROM feed_posts WHERE id = ? AND tenant_id = ?`
        : type === 'comment'
            ? `SELECT dc.id FROM discussion_comments dc JOIN discussions d ON d.id = dc.discussion_id WHERE dc.id = ? AND d.tenant_id = ?`
            : `SELECT id FROM discussions WHERE id = ? AND tenant_id = ?`;
    return !!(await env.DB.prepare(sql).bind(id, tenantId).first());
}

/**
 * Take reported content down (staff "Remove it"). Comments take their
 * replies with them; a conversation takes all its comments.
 */
async function removeContent(env: any, tenantId: string, type: ContentType, id: string): Promise<void> {
    if (type === 'post') {
        await env.DB.prepare(`DELETE FROM feed_posts WHERE id = ? AND tenant_id = ?`).bind(id, tenantId).run();
        return;
    }
    if (type === 'comment') {
        await env.DB.batch([
            env.DB.prepare(`DELETE FROM discussion_comments WHERE parent_comment_id = ? AND discussion_id IN (SELECT id FROM discussions WHERE tenant_id = ?)`).bind(id, tenantId),
            env.DB.prepare(`DELETE FROM discussion_comments WHERE id = ? AND discussion_id IN (SELECT id FROM discussions WHERE tenant_id = ?)`).bind(id, tenantId),
        ]);
        return;
    }
    await env.DB.batch([
        env.DB.prepare(`DELETE FROM discussion_comments WHERE discussion_id IN (SELECT id FROM discussions WHERE id = ? AND tenant_id = ?)`).bind(id, tenantId),
        env.DB.prepare(`DELETE FROM discussions WHERE id = ? AND tenant_id = ?`).bind(id, tenantId),
    ]);
}

/**
 * Report user-generated content (signed-in members).
 * POST /api/v1/content/report
 * The same person reporting the same thing again while it's waiting is a no-op.
 */
export async function handleReportContent(req: Request, env: any, corsHdrs: Headers) {
    try {
        const claims: TenantClaims = await requireTenantJWT(req, env);
        const body = await req.json().catch(() => ({}));
        const data = parse(ReportContentSchema, body);

        if (!(await contentExists(env, claims.tenantId, data.contentType, data.contentId))) {
            return json({ success: false, error: { code: 'NOT_FOUND', message: "That's already been removed." } }, 404, corsHdrs);
        }

        const reporterId = claims.userId ?? null;
        if (reporterId) {
            const existing = await env.DB.prepare(`
                SELECT id FROM content_reports
                WHERE tenant_id = ? AND reporter_id = ? AND content_type = ? AND content_id = ? AND status = 'pending'
                LIMIT 1
            `).bind(claims.tenantId, reporterId, data.contentType, data.contentId).first() as { id: string } | null;
            if (existing) {
                return json({ success: true, data: { reportId: existing.id, message: 'Thanks. The club has your report.' } }, 200, corsHdrs);
            }
        }

        const reportId = crypto.randomUUID();
        const now = Date.now();
        await env.DB.prepare(`
            INSERT INTO content_reports (id, tenant_id, reporter_id, content_type, content_id, reason, details, status, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)
        `).bind(reportId, claims.tenantId, reporterId, data.contentType, data.contentId, data.reason, data.details?.trim() || null, now, now).run();

        console.log(JSON.stringify({ event: 'content_reported', tenant: claims.tenantId, reportId, type: data.contentType }));
        return json({ success: true, data: { reportId, message: 'Thanks. The club has your report.' } }, 201, corsHdrs);
    } catch (err: any) {
        const denied = authFailure(err, corsHdrs);
        if (denied) return denied;
        if (isValidationError(err)) {
            return json({ success: false, error: { code: 'INVALID_REQUEST', message: 'Validation failed', issues: err.issues } }, err.status, corsHdrs);
        }
        console.error('Report content error:', err);
        return json({ success: false, error: { code: 'REPORT_FAILED', message: "The report didn't send. Please try again." } }, 500, corsHdrs);
    }
}

/**
 * Reports for staff to review.
 * GET /api/v1/content/reports?status=pending
 */
export async function handleGetReports(req: Request, env: any, corsHdrs: Headers) {
    try {
        const claims = await requireStaff(req, env);
        const url = new URL(req.url);
        const status = url.searchParams.get('status') || 'pending';
        const limit = Math.min(Math.max(parseInt(url.searchParams.get('limit') || '50', 10) || 50, 1), 100);
        const offset = Math.max(parseInt(url.searchParams.get('offset') || '0', 10) || 0, 0);
        const tenantId = claims.tenantId;

        const reports = await env.DB.prepare(`
            SELECT r.id, r.content_type, r.content_id, r.reason, r.details, r.status, r.action_taken, r.created_at, r.updated_at,
              CASE
                WHEN r.content_type = 'post' THEN (SELECT COALESCE(NULLIF(title, '') || ': ', '') || content FROM feed_posts WHERE id = r.content_id AND tenant_id = r.tenant_id LIMIT 1)
                WHEN r.content_type = 'comment' THEN (SELECT dc.content FROM discussion_comments dc JOIN discussions d ON d.id = dc.discussion_id WHERE dc.id = r.content_id AND d.tenant_id = r.tenant_id LIMIT 1)
                WHEN r.content_type = 'message' THEN (SELECT title FROM discussions WHERE id = r.content_id AND tenant_id = r.tenant_id LIMIT 1)
                ELSE NULL
              END AS content_preview,
              CASE
                WHEN r.content_type = 'comment' THEN (SELECT dc.author_name FROM discussion_comments dc JOIN discussions d ON d.id = dc.discussion_id WHERE dc.id = r.content_id AND d.tenant_id = r.tenant_id LIMIT 1)
                WHEN r.content_type = 'message' THEN (SELECT author_name FROM discussions WHERE id = r.content_id AND tenant_id = r.tenant_id LIMIT 1)
                ELSE NULL
              END AS content_author,
              CASE
                WHEN r.content_type = 'comment' THEN (SELECT dc.discussion_id FROM discussion_comments dc JOIN discussions d ON d.id = dc.discussion_id WHERE dc.id = r.content_id AND d.tenant_id = r.tenant_id LIMIT 1)
                WHEN r.content_type = 'message' THEN r.content_id
                ELSE NULL
              END AS discussion_id,
              u.email AS reporter_email
            FROM content_reports r
            LEFT JOIN auth_users u ON r.reporter_id = u.id AND u.tenant_id = r.tenant_id
            WHERE r.tenant_id = ? AND r.status = ?
            ORDER BY r.created_at DESC
            LIMIT ? OFFSET ?
        `).bind(tenantId, status, limit, offset).all();

        const countResult = await env.DB.prepare(`
            SELECT COUNT(*) AS total FROM content_reports WHERE tenant_id = ? AND status = ?
        `).bind(tenantId, status).first() as { total?: number } | null;

        return json({ success: true, data: { reports: reports.results || [], total: countResult?.total || 0, limit, offset } }, 200, corsHdrs);
    } catch (err: any) {
        const denied = authFailure(err, corsHdrs);
        if (denied) return denied;
        console.error('Get reports error:', err);
        return json({ success: false, error: { code: 'FETCH_FAILED', message: "Reports didn't load. Please try again." } }, 500, corsHdrs);
    }
}

/**
 * Staff deal with a report.
 * PUT /api/v1/content/reports/:id {status, action, notes}
 * action "removed" takes the content down and closes every waiting report
 * about the same thing.
 */
export async function handleUpdateReport(req: Request, env: any, corsHdrs: Headers, reportId: string) {
    try {
        const claims = await requireStaff(req, env);
        const body = await req.json().catch(() => ({})) as { status?: string; notes?: string; action?: string };
        const { status, notes, action } = body;

        if (!status || !['pending', 'reviewed', 'actioned', 'dismissed'].includes(status)) {
            return json({ success: false, error: { code: 'INVALID_STATUS', message: 'Invalid status value' } }, 400, corsHdrs);
        }

        const report = await env.DB.prepare(`
            SELECT id, content_type, content_id FROM content_reports WHERE id = ? AND tenant_id = ?
        `).bind(reportId, claims.tenantId).first() as { id: string; content_type: ContentType; content_id: string } | null;
        if (!report) {
            return json({ success: false, error: { code: 'NOT_FOUND', message: 'Report not found' } }, 404, corsHdrs);
        }

        const now = Date.now();
        const note = typeof notes === 'string' ? notes.slice(0, 500) : null;
        const taken = typeof action === 'string' ? action.slice(0, 40) : null;

        if (taken === 'removed') {
            await removeContent(env, claims.tenantId, report.content_type, report.content_id);
            await env.DB.prepare(`
                UPDATE content_reports SET status = 'actioned', admin_notes = ?, action_taken = 'removed', updated_at = ?
                WHERE tenant_id = ? AND content_type = ? AND content_id = ? AND (id = ? OR status = 'pending')
            `).bind(note, now, claims.tenantId, report.content_type, report.content_id, reportId).run();
        } else {
            await env.DB.prepare(`
                UPDATE content_reports SET status = ?, admin_notes = ?, action_taken = ?, updated_at = ?
                WHERE id = ? AND tenant_id = ?
            `).bind(status, note, taken, now, reportId, claims.tenantId).run();
        }

        console.log(JSON.stringify({ event: 'content_report_updated', tenant: claims.tenantId, reportId, status, action: taken }));
        return json({ success: true, message: 'Report updated successfully' }, 200, corsHdrs);
    } catch (err: any) {
        const denied = authFailure(err, corsHdrs);
        if (denied) return denied;
        console.error('Update report error:', err);
        return json({ success: false, error: { code: 'UPDATE_FAILED', message: "That didn't save. Please try again." } }, 500, corsHdrs);
    }
}

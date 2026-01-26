import { z } from "zod";
import { json } from "../services/util";
import { parse, isValidationError } from "../lib/validate";

const ReportContentSchema = z.object({
    tenant_id: z.string().min(1, "tenant_id required"),
    contentType: z.enum(['post', 'comment', 'message'], {
        errorMap: () => ({ message: "contentType must be 'post', 'comment', or 'message'" })
    }),
    contentId: z.string().min(1, "contentId required"),
    reason: z.enum([
        'spam',
        'harassment',
        'hate_speech',
        'violence',
        'inappropriate',
        'misinformation',
        'other'
    ], {
        errorMap: () => ({ message: "Invalid report reason" })
    }),
    details: z.string().optional()
});

/**
 * Report user-generated content
 * POST /api/v1/content/report
 */
export async function handleReportContent(req: Request, env: any, corsHdrs: Headers) {
    try {
        // Get user from JWT (optional - allow anonymous reports too)
        const authHeader = req.headers.get('Authorization');
        let userId: string | null = null;

        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.substring(7);
            const { verifyJWT } = await import('./auth');
            const claims = await verifyJWT(env, token);
            userId = claims?.user_id || claims?.sub || null;
        }

        const body = await req.json().catch(() => ({}));
        const data = parse(ReportContentSchema, body);

        // Create report
        const reportId = crypto.randomUUID();
        await env.DB.prepare(`
      INSERT INTO content_reports (
        id, tenant_id, reporter_id, content_type, content_id, 
        reason, details, status, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)
    `).bind(
            reportId,
            data.tenant_id,
            userId,
            data.contentType,
            data.contentId,
            data.reason,
            data.details || null,
            Date.now(),
            Date.now()
        ).run();

        // Optionally notify admins (could implement later)
        // await notifyAdmins(env, data.tenant_id, reportId);

        return json({
            success: true,
            data: {
                reportId,
                message: 'Report submitted successfully. Our team will review it shortly.'
            }
        }, 201, corsHdrs);

    } catch (err: any) {
        if (isValidationError(err)) {
            return json({
                success: false,
                error: {
                    code: 'INVALID_REQUEST',
                    message: 'Validation failed',
                    issues: err.issues
                }
            }, err.status, corsHdrs);
        }

        console.error('Report content error:', err);
        return json({
            success: false,
            error: {
                code: 'REPORT_FAILED',
                message: err?.message || 'Failed to submit report'
            }
        }, 500, corsHdrs);
    }
}

/**
 * Get content reports (admin only)
 * GET /api/v1/content/reports
 */
export async function handleGetReports(req: Request, env: any, corsHdrs: Headers) {
    try {
        // Verify admin JWT
        const authHeader = req.headers.get('Authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authorization required' } }, 401, corsHdrs);
        }

        const token = authHeader.substring(7);
        const { verifyJWT } = await import('./auth');
        const claims = await verifyJWT(env, token);

        if (!claims || !claims.tenant_id) {
            return json({ success: false, error: { code: 'INVALID_TOKEN', message: 'Invalid token' } }, 401, corsHdrs);
        }

        const tenantId = claims.tenant_id;
        const url = new URL(req.url);
        const status = url.searchParams.get('status') || 'pending';
        const limit = parseInt(url.searchParams.get('limit') || '50');
        const offset = parseInt(url.searchParams.get('offset') || '0');

        // Get reports with content details
        const reports = await env.DB.prepare(`
      SELECT 
        r.*,
        CASE 
          WHEN r.content_type = 'post' THEN (SELECT content FROM posts WHERE id = r.content_id LIMIT 1)
          WHEN r.content_type = 'comment' THEN (SELECT content FROM comments WHERE id = r.content_id LIMIT 1)
          ELSE NULL
        END as content_preview,
        u.email as reporter_email
      FROM content_reports r
      LEFT JOIN auth_users u ON r.reporter_id = u.id
      WHERE r.tenant_id = ? AND r.status = ?
      ORDER BY r.created_at DESC
      LIMIT ? OFFSET ?
    `).bind(tenantId, status, limit, offset).all();

        // Get total count
        const countResult = await env.DB.prepare(`
      SELECT COUNT(*) as total FROM content_reports 
      WHERE tenant_id = ? AND status = ?
    `).bind(tenantId, status).first();

        return json({
            success: true,
            data: {
                reports: reports.results || [],
                total: countResult?.total || 0,
                limit,
                offset
            }
        }, 200, corsHdrs);

    } catch (err: any) {
        console.error('Get reports error:', err);
        return json({
            success: false,
            error: { code: 'FETCH_FAILED', message: err?.message || 'Failed to fetch reports' }
        }, 500, corsHdrs);
    }
}

/**
 * Update report status (admin only)
 * PUT /api/v1/content/reports/:id
 */
export async function handleUpdateReport(req: Request, env: any, corsHdrs: Headers, reportId: string) {
    try {
        // Verify admin JWT
        const authHeader = req.headers.get('Authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authorization required' } }, 401, corsHdrs);
        }

        const token = authHeader.substring(7);
        const { verifyJWT } = await import('./auth');
        const claims = await verifyJWT(env, token);

        if (!claims || !claims.tenant_id) {
            return json({ success: false, error: { code: 'INVALID_TOKEN', message: 'Invalid token' } }, 401, corsHdrs);
        }

        const body = await req.json().catch(() => ({})) as any;
        const { status, notes, action } = body;

        if (!['pending', 'reviewed', 'actioned', 'dismissed'].includes(status)) {
            return json({
                success: false,
                error: { code: 'INVALID_STATUS', message: 'Invalid status value' }
            }, 400, corsHdrs);
        }

        // Update report
        await env.DB.prepare(`
      UPDATE content_reports 
      SET status = ?, admin_notes = ?, action_taken = ?, updated_at = ?
      WHERE id = ? AND tenant_id = ?
    `).bind(status, notes || null, action || null, Date.now(), reportId, claims.tenant_id).run();

        return json({
            success: true,
            message: 'Report updated successfully'
        }, 200, corsHdrs);

    } catch (err: any) {
        console.error('Update report error:', err);
        return json({
            success: false,
            error: { code: 'UPDATE_FAILED', message: err?.message || 'Failed to update report' }
        }, 500, corsHdrs);
    }
}

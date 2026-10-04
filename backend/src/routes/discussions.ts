import { json } from "../services/util";
import { hasAnyRole, requireTenantJWT, STAFF_ROLES, type TenantClaims } from "../services/auth";

// Types
interface Discussion {
    id: string;
    tenant_id: string;
    category: 'tactics' | 'training' | 'match-analysis' | 'general';
    title: string;
    author_id: string;
    author_name: string;
    video_id: string | null;
    pinned: boolean;
    locked: boolean;
    created_at: number;
    updated_at: number;
    comment_count?: number;
}

interface Comment {
    id: string;
    discussion_id: string;
    parent_comment_id: string | null;
    author_id: string;
    author_name: string;
    content: string;
    video_timestamp: number | null;
    created_at: number;
    updated_at: number;
    replies?: Comment[];
}

type DiscussionRole = 'coach' | 'player' | 'parent' | 'fan';

/**
 * What someone can do in Team talk, from the roles in their token (tokens
 * carry a `roles` list): staff run it, players and parents see general and
 * match-analysis threads, fans see none.
 */
function discussionRole(claims: TenantClaims): DiscussionRole {
    if (hasAnyRole(claims, STAFF_ROLES)) return 'coach';
    if (hasAnyRole(claims, ['player'])) return 'player';
    if (hasAnyRole(claims, ['fan'])) return 'fan';
    return 'parent';
}

function isCoach(claims: TenantClaims): boolean {
    return discussionRole(claims) === 'coach';
}

/** Players and parents only take part in these; fans in none. */
const OPEN_CATEGORIES = ['general', 'match-analysis'];

function canSeeCategory(claims: TenantClaims, category: string): boolean {
    const role = discussionRole(claims);
    if (role === 'coach') return true;
    if (role === 'fan') return false;
    return OPEN_CATEGORIES.includes(category);
}

/** A failed login check (thrown Response) becomes a proper 401/403 with CORS headers. */
function authFailure(err: unknown, corsHdrs: Headers): Response | null {
    if (!(err instanceof Response)) return null;
    const message = err.status === 401 ? 'Please log in again.' : "You don't have access to Team talk for this club.";
    return json({ success: false, error: message }, err.status, corsHdrs);
}

/** The name shown on a post: from the token, else the member's profile, never their email. */
async function authorName(env: any, claims: TenantClaims): Promise<string> {
    if (claims.name?.trim()) return claims.name.trim().slice(0, 60);
    const row = await env.DB.prepare(`SELECT profile FROM auth_users WHERE id = ? AND tenant_id = ?`)
        .bind(claims.userId ?? '', claims.tenantId).first() as { profile?: string | null } | null;
    try {
        const name = row?.profile ? JSON.parse(row.profile)?.name : null;
        if (typeof name === 'string' && name.trim()) return name.trim().slice(0, 60);
    } catch {
        // Fall through to the generic name
    }
    return isCoach(claims) ? 'Club staff' : 'Club member';
}

// GET /api/v1/discussions - List all discussions
export async function handleListDiscussions(req: Request, env: any, corsHdrs: Headers) {
    try {
        const claims = await requireTenantJWT(req, env);
        const url = new URL(req.url);
        const category = url.searchParams.get('category');
        const pinnedOnly = url.searchParams.get('pinned') === 'true';
        const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100);
        const offset = parseInt(url.searchParams.get('offset') || '0');

        // Role-based access control
        const role = discussionRole(claims);

        // Fans cannot access discussions at all
        if (role === 'fan') {
            return json({
                success: false,
                error: { code: 'FORBIDDEN', message: 'Fans do not have access to discussions' }
            }, 403, corsHdrs);
        }

        // Players and parents can only see 'general' and 'match-analysis' categories
        const restrictedRoles = ['player', 'parent'];
        const allowedCategories = ['general', 'match-analysis'];

        if (restrictedRoles.includes(role) && category && !allowedCategories.includes(category)) {
            return json({
                success: false,
                error: { code: 'FORBIDDEN', message: 'You do not have access to this category' }
            }, 403, corsHdrs);
        }

        // For restricted roles without category filter, limit to allowed categories
        let categoryFilter = category;
        if (restrictedRoles.includes(role) && !category) {
            // Will add IN clause below
            categoryFilter = null; // Flag to use IN clause
        }

        let query = `
            SELECT d.*, 
                   COUNT(DISTINCT dc.id) as comment_count
            FROM discussions d
            LEFT JOIN discussion_comments dc ON d.id = dc.discussion_id
            WHERE d.tenant_id = ?
        `;
        const binds: any[] = [claims.tenantId];

        // Apply category restriction for limited roles
        if (restrictedRoles.includes(role) && !category) {
            query += ` AND d.category IN ('general', 'match-analysis')`;
        } else if (category) {
            query += ` AND d.category = ?`;
            binds.push(category);
        }

        if (pinnedOnly) {
            query += ` AND d.pinned = 1`;
        }

        query += ` GROUP BY d.id ORDER BY d.pinned DESC, d.updated_at DESC LIMIT ? OFFSET ?`;
        binds.push(limit, offset);

        const result = await env.DB.prepare(query).bind(...binds).all();

        const discussions = (result.results || []).map((row: any) => ({
            ...row,
            pinned: Boolean(row.pinned),
            locked: Boolean(row.locked),
            comment_count: row.comment_count || 0
        }));

        return json({ success: true, data: discussions }, 200, corsHdrs);
    } catch (err) {
        const denied = authFailure(err, corsHdrs);
        if (denied) return denied;
        console.error('List discussions error:', err);
        return json({ success: false, error: 'Failed to list discussions' }, 500, corsHdrs);
    }
}

// POST /api/v1/discussions - Create discussion
export async function handleCreateDiscussion(req: Request, env: any, corsHdrs: Headers) {
    try {
        const claims = await requireTenantJWT(req, env);
        const { category, title, video_id, related_entity_type, related_entity_id } = await req.json() as any;

        if (!category || !title) {
            return json({ success: false, error: 'Category and title required' }, 400, corsHdrs);
        }

        const validCategories = ['tactics', 'training', 'match-analysis', 'general'];
        if (!validCategories.includes(category)) {
            return json({ success: false, error: 'Invalid category' }, 400, corsHdrs);
        }
        if (!canSeeCategory(claims, category)) {
            return json({ success: false, error: 'Only coaches can start threads in that section.' }, 403, corsHdrs);
        }

        const id = crypto.randomUUID();
        const now = Date.now();

        const author = await authorName(env, claims);
        await env.DB.prepare(`
            INSERT INTO discussions 
            (id, tenant_id, category, title, author_id, author_name, video_id, related_entity_type, related_entity_id, pinned, locked, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?, ?)
        `).bind(
            id,
            claims.tenantId,
            category,
            title,
            claims.userId,
            author,
            video_id || null,
            related_entity_type || null,
            related_entity_id || null,
            now,
            now
        ).run();

        const discussion = {
            id,
            tenant_id: claims.tenantId,
            category,
            title,
            author_id: claims.userId,
            author_name: author,
            video_id: video_id || null,
            related_entity_type: related_entity_type || null,
            related_entity_id: related_entity_id || null,
            pinned: false,
            locked: false,
            created_at: now,
            updated_at: now
        };

        return json({ success: true, data: discussion }, 201, corsHdrs);
    } catch (err) {
        const denied = authFailure(err, corsHdrs);
        if (denied) return denied;
        console.error('Create discussion error:', err);
        return json({ success: false, error: 'Failed to create discussion' }, 500, corsHdrs);
    }
}

// GET /api/v1/discussions/:id - Get single discussion with comments
export async function handleGetDiscussion(req: Request, env: any, corsHdrs: Headers, discussionId: string) {
    try {
        const claims = await requireTenantJWT(req, env);

        // Get discussion
        const discussion = await env.DB.prepare(`
            SELECT * FROM discussions WHERE id = ? AND tenant_id = ?
        `).bind(discussionId, claims.tenantId).first();

        if (!discussion || !canSeeCategory(claims, String(discussion.category))) {
            return json({ success: false, error: 'Discussion not found' }, 404, corsHdrs);
        }

        // Get all comments
        const comments = await env.DB.prepare(`
            SELECT * FROM discussion_comments 
            WHERE discussion_id = ? 
            ORDER BY created_at ASC
        `).bind(discussionId).all();

        // Build nested comment tree
        const commentMap = new Map<string, Comment>();
        const rootComments: Comment[] = [];

        (comments.results || []).forEach((c: any) => {
            const comment: Comment = {
                ...c,
                video_timestamp: c.video_timestamp || null,
                parent_comment_id: c.parent_comment_id || null,
                replies: []
            };
            commentMap.set(c.id, comment);
        });

        commentMap.forEach((comment) => {
            if (comment.parent_comment_id) {
                const parent = commentMap.get(comment.parent_comment_id);
                if (parent) {
                    parent.replies = parent.replies || [];
                    parent.replies.push(comment);
                }
            } else {
                rootComments.push(comment);
            }
        });

        return json({
            success: true,
            data: {
                ...discussion,
                pinned: Boolean(discussion.pinned),
                locked: Boolean(discussion.locked),
                comments: rootComments
            }
        }, 200, corsHdrs);
    } catch (err) {
        const denied = authFailure(err, corsHdrs);
        if (denied) return denied;
        console.error('Get discussion error:', err);
        return json({ success: false, error: 'Failed to get discussion' }, 500, corsHdrs);
    }
}

// PATCH /api/v1/discussions/:id - Update discussion
export async function handleUpdateDiscussion(req: Request, env: any, corsHdrs: Headers, discussionId: string) {
    try {
        const claims = await requireTenantJWT(req, env);
        const { title, pinned, locked } = await req.json() as any;

        // Check if discussion exists and user owns it or is coach
        const discussion = await env.DB.prepare(`
            SELECT * FROM discussions WHERE id = ? AND tenant_id = ?
        `).bind(discussionId, claims.tenantId).first();

        if (!discussion) {
            return json({ success: false, error: 'Discussion not found' }, 404, corsHdrs);
        }

        // Only coaches can pin/lock
        if ((pinned !== undefined || locked !== undefined) && !isCoach(claims)) {
            return json({ success: false, error: 'Only coaches can pin or lock discussions' }, 403, corsHdrs);
        }

        // Only author or coach can edit
        if (title !== undefined && discussion.author_id !== claims.userId && !isCoach(claims)) {
            return json({ success: false, error: 'Unauthorized to edit this discussion' }, 403, corsHdrs);
        }

        const updates: string[] = [];
        const binds: any[] = [];

        if (title !== undefined) {
            updates.push('title = ?');
            binds.push(title);
        }
        if (pinned !== undefined) {
            updates.push('pinned = ?');
            binds.push(pinned ? 1 : 0);
        }
        if (locked !== undefined) {
            updates.push('locked = ?');
            binds.push(locked ? 1 : 0);
        }

        if (updates.length === 0) {
            return json({ success: false, error: 'No updates provided' }, 400, corsHdrs);
        }

        updates.push('updated_at = ?');
        binds.push(Date.now());

        binds.push(discussionId, claims.tenantId);

        await env.DB.prepare(`
            UPDATE discussions 
            SET ${updates.join(', ')} 
            WHERE id = ? AND tenant_id = ?
        `).bind(...binds).run();

        return json({ success: true }, 200, corsHdrs);
    } catch (err) {
        const denied = authFailure(err, corsHdrs);
        if (denied) return denied;
        console.error('Update discussion error:', err);
        return json({ success: false, error: 'Failed to update discussion' }, 500, corsHdrs);
    }
}

// DELETE /api/v1/discussions/:id - Delete discussion
export async function handleDeleteDiscussion(req: Request, env: any, corsHdrs: Headers, discussionId: string) {
    try {
        const claims = await requireTenantJWT(req, env);

        const discussion = await env.DB.prepare(`
            SELECT * FROM discussions WHERE id = ? AND tenant_id = ?
        `).bind(discussionId, claims.tenantId).first();

        if (!discussion) {
            return json({ success: false, error: 'Discussion not found' }, 404, corsHdrs);
        }

        // Only author or coach can delete
        if (discussion.author_id !== claims.userId && !isCoach(claims)) {
            return json({ success: false, error: 'Unauthorized to delete this discussion' }, 403, corsHdrs);
        }

        await env.DB.prepare(`
            DELETE FROM discussions WHERE id = ? AND tenant_id = ?
        `).bind(discussionId, claims.tenantId).run();

        return json({ success: true }, 200, corsHdrs);
    } catch (err) {
        const denied = authFailure(err, corsHdrs);
        if (denied) return denied;
        console.error('Delete discussion error:', err);
        return json({ success: false, error: 'Failed to delete discussion' }, 500, corsHdrs);
    }
}

// POST /api/v1/discussions/:id/comments - Create comment
export async function handleCreateComment(req: Request, env: any, corsHdrs: Headers, discussionId: string) {
    try {
        const claims = await requireTenantJWT(req, env);
        const { content, parent_comment_id, video_timestamp, mentions } = await req.json() as any;

        if (!content || content.trim().length === 0) {
            return json({ success: false, error: 'Content required' }, 400, corsHdrs);
        }

        // Verify discussion exists and is not locked
        const discussion = await env.DB.prepare(`
            SELECT id, title, author_id, locked, category FROM discussions WHERE id = ? AND tenant_id = ?
        `).bind(discussionId, claims.tenantId).first();

        if (!discussion || !canSeeCategory(claims, String(discussion.category))) {
            return json({ success: false, error: 'Discussion not found' }, 404, corsHdrs);
        }

        if (discussion.locked && !isCoach(claims)) {
            return json({ success: false, error: 'Discussion is locked' }, 403, corsHdrs);
        }

        const id = crypto.randomUUID();
        const now = Date.now();

        const author = await authorName(env, claims);
        await env.DB.prepare(`
            INSERT INTO discussion_comments 
            (id, discussion_id, parent_comment_id, author_id, author_name, content, video_timestamp, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
            id,
            discussionId,
            parent_comment_id || null,
            claims.userId,
            author,
            content,
            video_timestamp || null,
            now,
            now
        ).run();

        // Update discussion updated_at (SECURITY: Verify tenant ownership)
        await env.DB.prepare(`
            UPDATE discussions SET updated_at = ? WHERE id = ? AND tenant_id = ?
        `).bind(now, discussionId, claims.tenantId).run();

        // Create notifications (don't await to avoid blocking response)
        const discussionLink = `/team/discussions/${discussionId}`;

        // Notify discussion author (if different from commenter)
        if (discussion.author_id && discussion.author_id !== claims.userId) {
            const notifId = crypto.randomUUID();
            env.DB.prepare(`
                INSERT INTO notifications (id, tenant_id, user_id, type, title, message, link, related_id, read, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
            `).bind(
                notifId,
                claims.tenantId,
                discussion.author_id,
                'discussion_comment',
                'New Comment',
                `${claims.name || 'Someone'} commented on "${discussion.title}"`,
                discussionLink,
                discussionId,
                now
            ).run().catch((e: any) => console.error('Notification error:', e));
        }

        // Notify parent comment author (if this is a reply)
        if (parent_comment_id) {
            // SECURITY: Verify parent comment belongs to same tenant via discussion
            const parentComment = await env.DB.prepare(`
                SELECT dc.author_id
                FROM discussion_comments dc
                JOIN discussions d ON dc.discussion_id = d.id
                WHERE dc.id = ? AND d.tenant_id = ?
            `).bind(parent_comment_id, claims.tenantId).first();

            if (parentComment && parentComment.author_id !== claims.userId && parentComment.author_id !== discussion.author_id) {
                const notifId = crypto.randomUUID();
                env.DB.prepare(`
                    INSERT INTO notifications (id, tenant_id, user_id, type, title, message, link, related_id, read, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
                `).bind(
                    notifId,
                    claims.tenantId,
                    parentComment.author_id,
                    'comment_reply',
                    'New Reply',
                    `${claims.name || 'Someone'} replied to your comment`,
                    discussionLink,
                    discussionId,
                    now
                ).run().catch((e: any) => console.error('Notification error:', e));
            }
        }

        // Notify mentioned users
        if (Array.isArray(mentions) && mentions.length > 0) {
            for (const mentionedUserId of mentions) {
                if (mentionedUserId === claims.userId) {continue;} // Don't notify self

                const notifId = crypto.randomUUID();
                env.DB.prepare(`
                    INSERT INTO notifications (id, tenant_id, user_id, type, title, message, link, related_id, read, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
                `).bind(
                    notifId,
                    claims.tenantId,
                    mentionedUserId,
                    'mention',
                    'New Mention',
                    `${claims.name || 'Someone'} mentioned you in "${discussion.title}"`,
                    discussionLink,
                    discussionId,
                    now
                ).run().catch((e: any) => console.error('Notification mention error:', e));
            }
        }


        const comment = {
            id,
            discussion_id: discussionId,
            parent_comment_id: parent_comment_id || null,
            author_id: claims.userId,
            author_name: author,
            content,
            video_timestamp: video_timestamp || null,
            created_at: now,
            updated_at: now
        };

        return json({ success: true, data: comment }, 201, corsHdrs);
    } catch (err) {
        const denied = authFailure(err, corsHdrs);
        if (denied) return denied;
        console.error('Create comment error:', err);
        return json({ success: false, error: 'Failed to create comment' }, 500, corsHdrs);
    }
}

// PATCH /api/v1/comments/:id - Update comment
export async function handleUpdateComment(req: Request, env: any, corsHdrs: Headers, commentId: string) {
    try {
        const claims = await requireTenantJWT(req, env);
        const { content } = await req.json() as any;

        if (!content || content.trim().length === 0) {
            return json({ success: false, error: 'Content required' }, 400, corsHdrs);
        }

        // SECURITY: Verify comment belongs to current tenant via discussion
        const comment = await env.DB.prepare(`
            SELECT dc.*
            FROM discussion_comments dc
            JOIN discussions d ON dc.discussion_id = d.id
            WHERE dc.id = ? AND d.tenant_id = ?
        `).bind(commentId, claims.tenantId).first();

        if (!comment) {
            return json({ success: false, error: 'Comment not found' }, 404, corsHdrs);
        }

        // Only author can edit
        if (comment.author_id !== claims.userId) {
            return json({ success: false, error: 'Unauthorized to edit this comment' }, 403, corsHdrs);
        }

        // SECURITY: Double-check tenant in UPDATE (defense in depth)
        await env.DB.prepare(`
            UPDATE discussion_comments
            SET content = ?, updated_at = ?
            WHERE id = ?
              AND discussion_id IN (
                  SELECT id FROM discussions WHERE tenant_id = ?
              )
        `).bind(content, Date.now(), commentId, claims.tenantId).run();

        return json({ success: true }, 200, corsHdrs);
    } catch (err) {
        const denied = authFailure(err, corsHdrs);
        if (denied) return denied;
        console.error('Update comment error:', err);
        return json({ success: false, error: 'Failed to update comment' }, 500, corsHdrs);
    }
}

// DELETE /api/v1/comments/:id - Delete comment
export async function handleDeleteComment(req: Request, env: any, corsHdrs: Headers, commentId: string) {
    try {
        const claims = await requireTenantJWT(req, env);

        // SECURITY: Verify comment belongs to current tenant via discussion
        const comment = await env.DB.prepare(`
            SELECT dc.*
            FROM discussion_comments dc
            JOIN discussions d ON dc.discussion_id = d.id
            WHERE dc.id = ? AND d.tenant_id = ?
        `).bind(commentId, claims.tenantId).first();

        if (!comment) {
            return json({ success: false, error: 'Comment not found' }, 404, corsHdrs);
        }

        // Only author or coach can delete
        if (comment.author_id !== claims.userId && !isCoach(claims)) {
            return json({ success: false, error: 'Unauthorized to delete this comment' }, 403, corsHdrs);
        }

        // SECURITY: Double-check tenant in DELETE (defense in depth)
        await env.DB.prepare(`
            DELETE FROM discussion_comments
            WHERE id = ?
              AND discussion_id IN (
                  SELECT id FROM discussions WHERE tenant_id = ?
              )
        `).bind(commentId, claims.tenantId).run();

        return json({ success: true }, 200, corsHdrs);
    } catch (err) {
        const denied = authFailure(err, corsHdrs);
        if (denied) return denied;
        console.error('Delete comment error:', err);
        return json({ success: false, error: 'Failed to delete comment' }, 500, corsHdrs);
    }
}

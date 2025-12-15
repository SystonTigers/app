/**
 * Organization Routes
 * Manages multi-team subscriptions for clubs
 */

import { requireJWT } from '../services/auth';
import { json } from '../services/util';

const PLAN_LIMITS: Record<string, number> = {
    essentials: 1,
    team: 1,
    club: 5,
    club_pro: 999,  // Unlimited
};

/**
 * GET /api/v1/organization
 * Get current user's organization details
 */
export async function handleGetOrganization(req: Request, env: any, corsHdrs: Headers) {
    try {
        const claims = await requireJWT(req, env);
        const userEmail = claims.email;

        // Find organization where user is a member
        const membership = await env.DB.prepare(`
            SELECT o.*, om.role, 
                   (SELECT COUNT(*) FROM tenants WHERE organization_id = o.id) as team_count
            FROM organizations o
            JOIN organization_members om ON o.id = om.organization_id
            WHERE om.user_email = ?
        `).bind(userEmail).first();

        if (!membership) {
            return json({ success: false, error: { message: 'No organization found' } }, 404, corsHdrs);
        }

        // Get all teams in the organization
        const { results: teams } = await env.DB.prepare(`
            SELECT id, slug, name, created_at FROM tenants WHERE organization_id = ?
        `).bind(membership.id).all();

        return json({
            success: true,
            data: {
                id: membership.id,
                name: membership.name,
                plan: membership.plan,
                status: membership.status,
                billingInterval: membership.billing_interval,
                maxTeams: PLAN_LIMITS[membership.plan] || 1,
                teamCount: membership.team_count,
                role: membership.role,
                trialEndsAt: membership.trial_ends_at,
                teams: teams || [],
            },
        }, 200, corsHdrs);
    } catch (error: any) {
        return json({ success: false, error: { message: error.message } }, 500, corsHdrs);
    }
}

/**
 * POST /api/v1/organization/teams
 * Add a new team to the organization
 */
export async function handleAddTeam(req: Request, env: any, corsHdrs: Headers) {
    try {
        const claims = await requireJWT(req, env);
        const userEmail = claims.email;

        // Check user is admin/owner of an organization
        const membership = await env.DB.prepare(`
            SELECT o.*, om.role
            FROM organizations o
            JOIN organization_members om ON o.id = om.organization_id
            WHERE om.user_email = ? AND om.role IN ('owner', 'admin')
        `).bind(userEmail).first();

        if (!membership) {
            return json({
                success: false,
                error: { message: 'You must be an organization admin to add teams' }
            }, 403, corsHdrs);
        }

        // Check team limit
        const { count } = await env.DB.prepare(
            'SELECT COUNT(*) as count FROM tenants WHERE organization_id = ?'
        ).bind(membership.id).first() as { count: number };

        const maxTeams = PLAN_LIMITS[membership.plan] || 1;
        if (count >= maxTeams) {
            return json({
                success: false,
                error: {
                    code: 'TEAM_LIMIT_REACHED',
                    message: `Your ${membership.plan} plan allows up to ${maxTeams} team${maxTeams > 1 ? 's' : ''}. Upgrade to add more.`
                }
            }, 403, corsHdrs);
        }

        const body = await req.json() as { teamName: string; teamSlug: string };
        const { teamName, teamSlug } = body;

        if (!teamName || !teamSlug) {
            return json({
                success: false,
                error: { message: 'Team name and slug are required' }
            }, 400, corsHdrs);
        }

        // Check slug availability
        const existing = await env.DB.prepare(
            'SELECT id FROM tenants WHERE slug = ?'
        ).bind(teamSlug).first();

        if (existing) {
            return json({
                success: false,
                error: { code: 'SLUG_TAKEN', message: 'That team slug is already in use' }
            }, 400, corsHdrs);
        }

        // Create new tenant linked to organization
        const tenantId = `tenant_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

        await env.DB.prepare(`
            INSERT INTO tenants (id, slug, name, email, plan, status, organization_id)
            VALUES (?, ?, ?, ?, ?, 'active', ?)
        `).bind(
            tenantId,
            teamSlug,
            teamName,
            membership.owner_email,
            membership.plan,
            membership.id
        ).run();

        // Create default brand
        await env.DB.prepare(`
            INSERT INTO tenant_brand (tenant_id, primary_color, secondary_color)
            VALUES (?, '#FFD700', '#000000')
        `).bind(tenantId).run();

        return json({
            success: true,
            data: {
                id: tenantId,
                slug: teamSlug,
                name: teamName,
                message: 'Team created successfully!'
            }
        }, 201, corsHdrs);

    } catch (error: any) {
        return json({ success: false, error: { message: error.message } }, 500, corsHdrs);
    }
}

/**
 * DELETE /api/v1/organization/teams/:id
 * Remove a team from the organization
 */
export async function handleRemoveTeam(req: Request, env: any, corsHdrs: Headers) {
    try {
        const claims = await requireJWT(req, env);
        const userEmail = claims.email;

        const url = new URL(req.url);
        const teamId = url.pathname.split('/').pop();

        // Check user is owner of the organization
        const membership = await env.DB.prepare(`
            SELECT o.id as org_id, om.role
            FROM organizations o
            JOIN organization_members om ON o.id = om.organization_id
            WHERE om.user_email = ? AND om.role = 'owner'
        `).bind(userEmail).first();

        if (!membership) {
            return json({
                success: false,
                error: { message: 'Only organization owners can remove teams' }
            }, 403, corsHdrs);
        }

        // Verify team belongs to this organization
        const team = await env.DB.prepare(
            'SELECT id, slug FROM tenants WHERE id = ? AND organization_id = ?'
        ).bind(teamId, membership.org_id).first();

        if (!team) {
            return json({ success: false, error: { message: 'Team not found' } }, 404, corsHdrs);
        }

        // Don't allow removing the last team
        const { count } = await env.DB.prepare(
            'SELECT COUNT(*) as count FROM tenants WHERE organization_id = ?'
        ).bind(membership.org_id).first() as { count: number };

        if (count <= 1) {
            return json({
                success: false,
                error: { message: 'Cannot remove the last team. Cancel subscription instead.' }
            }, 400, corsHdrs);
        }

        // Soft delete - mark as removed but keep data
        await env.DB.prepare(
            'UPDATE tenants SET status = ?, organization_id = NULL WHERE id = ?'
        ).bind('removed', teamId).run();

        return json({
            success: true,
            message: 'Team removed from organization'
        }, 200, corsHdrs);

    } catch (error: any) {
        return json({ success: false, error: { message: error.message } }, 500, corsHdrs);
    }
}

/**
 * GET /api/v1/organization/plans
 * Get available pricing plans
 */
export async function handleGetPlans(req: Request, env: any, corsHdrs: Headers) {
    const plans = [
        {
            id: 'essentials',
            name: 'Essentials',
            description: 'Perfect for a single team',
            maxTeams: 1,
            monthlyPrice: 799,
            annualPrice: 7670,
            features: ['Squad management', 'Fixtures & results', 'Match reports', 'Team chat'],
            popular: false,
        },
        {
            id: 'team',
            name: 'Team',
            description: 'Everything you need for one team',
            maxTeams: 1,
            monthlyPrice: 1499,
            annualPrice: 14390,
            features: [
                'All Essentials features',
                'Stats & leaderboards',
                'Social media automation',
                'Video highlights',
            ],
            popular: false,
        },
        {
            id: 'club',
            name: 'Club',
            description: 'For clubs with multiple age groups',
            maxTeams: 5,
            monthlyPrice: 4999,
            annualPrice: 47990,
            features: [
                'All Team features',
                'Up to 5 teams',
                'Shared club branding',
                'Priority support',
            ],
            popular: true,
        },
        {
            id: 'club_pro',
            name: 'Club Pro',
            description: 'Unlimited teams with premium features',
            maxTeams: 999,
            monthlyPrice: 8999,
            annualPrice: 86390,
            features: [
                'All Club features',
                'Unlimited teams',
                'AI Coaching assistant',
                'Merchandise shop (10% commission)',
                'Dedicated support',
            ],
            popular: false,
        },
    ];

    return json({ success: true, data: plans }, 200, corsHdrs);
}

/**
 * POST /api/v1/organization/invite-team
 * Invite an existing team to join the organization
 * Only for Club/Club Pro plans
 */
export async function handleInviteTeam(req: Request, env: any, corsHdrs: Headers) {
    try {
        const claims = await requireJWT(req, env);
        const userEmail = claims.email;

        // Verify user is admin/owner of a Club/Club Pro org
        const membership = await env.DB.prepare(`
            SELECT o.*, om.role
            FROM organizations o
            JOIN organization_members om ON o.id = om.organization_id
            WHERE om.user_email = ? AND om.role IN ('owner', 'admin')
            AND o.plan IN ('club', 'club_pro')
        `).bind(userEmail).first();

        if (!membership) {
            return json({
                success: false,
                error: { message: 'Only Club or Club Pro organizations can invite teams' }
            }, 403, corsHdrs);
        }

        const body = await req.json() as { teamSlug: string };
        const { teamSlug } = body;

        if (!teamSlug) {
            return json({ success: false, error: { message: 'Team slug required' } }, 400, corsHdrs);
        }

        // Find the team
        const team = await env.DB.prepare(`
            SELECT id, slug, name, email, organization_id, plan
            FROM tenants WHERE slug = ?
        `).bind(teamSlug).first();

        if (!team) {
            return json({ success: false, error: { message: 'Team not found' } }, 404, corsHdrs);
        }

        if (team.organization_id) {
            return json({
                success: false,
                error: { message: 'Team is already part of an organization' }
            }, 400, corsHdrs);
        }

        // Check team limit
        const { count } = await env.DB.prepare(
            'SELECT COUNT(*) as count FROM tenants WHERE organization_id = ?'
        ).bind(membership.id).first() as { count: number };

        const maxTeams = PLAN_LIMITS[membership.plan] || 1;
        if (count >= maxTeams) {
            return json({
                success: false,
                error: { message: `Team limit reached. Upgrade to add more teams.` }
            }, 403, corsHdrs);
        }

        // Generate 6-digit verification code
        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60); // 7 days

        // Create invite
        const inviteId = `invite_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        await env.DB.prepare(`
            INSERT INTO organization_invites 
            (id, organization_id, tenant_id, invited_by_email, verification_code, expires_at)
            VALUES (?, ?, ?, ?, ?, ?)
        `).bind(inviteId, membership.id, team.id, userEmail, verificationCode, expiresAt).run();

        // TODO: Send email to team admin with verification code
        console.log(`[Org Invite] Code ${verificationCode} sent to ${team.email} for team ${team.slug}`);

        return json({
            success: true,
            data: {
                inviteId,
                teamName: team.name,
                teamSlug: team.slug,
                expiresAt,
                // In production, don't return the code - send via email
                verificationCode: process.env.NODE_ENV === 'development' ? verificationCode : undefined,
                message: `Invitation sent to ${team.email}. They'll need to enter the verification code.`
            }
        }, 201, corsHdrs);
    } catch (error: any) {
        return json({ success: false, error: { message: error.message } }, 500, corsHdrs);
    }
}

/**
 * POST /api/v1/organization/accept-invite
 * Accept an invite and join an organization (called by team being invited)
 */
export async function handleAcceptInvite(req: Request, env: any, corsHdrs: Headers) {
    try {
        const claims = await requireJWT(req, env);
        const tenantId = claims.tenantId;

        const body = await req.json() as { verificationCode: string };
        const { verificationCode } = body;

        if (!verificationCode) {
            return json({ success: false, error: { message: 'Verification code required' } }, 400, corsHdrs);
        }

        // Find pending invite for this tenant
        const invite = await env.DB.prepare(`
            SELECT i.*, o.name as org_name, o.plan as org_plan
            FROM organization_invites i
            JOIN organizations o ON i.organization_id = o.id
            WHERE i.tenant_id = ? 
            AND i.status = 'pending'
            AND i.verification_code = ?
            AND i.expires_at > unixepoch()
        `).bind(tenantId, verificationCode).first();

        if (!invite) {
            return json({
                success: false,
                error: { message: 'Invalid or expired verification code' }
            }, 400, corsHdrs);
        }

        // Get team's current subscription info for potential credit
        const team = await env.DB.prepare(
            'SELECT stripe_subscription_id, plan, trial_ends_at FROM tenants WHERE id = ?'
        ).bind(tenantId).first();

        // Calculate remaining subscription value for credit
        // TODO: In production, calculate actual remaining days and credit amount

        // Update invite status
        await env.DB.prepare(`
            UPDATE organization_invites 
            SET status = 'accepted', responded_at = unixepoch()
            WHERE id = ?
        `).bind(invite.id).run();

        // Move team to organization
        await env.DB.prepare(`
            UPDATE tenants 
            SET organization_id = ?, 
                plan = ?,
                status = 'active'
            WHERE id = ?
        `).bind(invite.organization_id, invite.org_plan, tenantId).run();

        // TODO: Cancel team's individual Stripe subscription
        // TODO: Apply pro-rated credit to organization's account

        return json({
            success: true,
            data: {
                organizationName: invite.org_name,
                message: `Successfully joined ${invite.org_name}! Your team is now part of the club.`
            }
        }, 200, corsHdrs);
    } catch (error: any) {
        return json({ success: false, error: { message: error.message } }, 500, corsHdrs);
    }
}

/**
 * GET /api/v1/organization/pending-invites
 * Get pending invites for current team (to show notification)
 */
export async function handleGetPendingInvites(req: Request, env: any, corsHdrs: Headers) {
    try {
        const claims = await requireJWT(req, env);
        const tenantId = claims.tenantId;

        const { results: invites } = await env.DB.prepare(`
            SELECT i.id, i.created_at, i.expires_at, o.name as org_name
            FROM organization_invites i
            JOIN organizations o ON i.organization_id = o.id
            WHERE i.tenant_id = ? AND i.status = 'pending' AND i.expires_at > unixepoch()
        `).bind(tenantId).all();

        return json({ success: true, data: invites || [] }, 200, corsHdrs);
    } catch (error: any) {
        return json({ success: false, error: { message: error.message } }, 500, corsHdrs);
    }
}


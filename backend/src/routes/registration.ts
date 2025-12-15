/**
 * Registration Routes
 * Handles subscription plans, registration fees, documents, e-signatures, and discounts
 */

import Stripe from 'stripe';
import { requireJWT } from '../services/auth';
import { json } from '../services/util';

function getStripe(env: any): Stripe {
    return new Stripe(env.STRIPE_SECRET_KEY, {
        apiVersion: '2024-11-20.acacia' as any,
    });
}

// ============================================
// SUBSCRIPTION PLANS (Recurring Payments)
// ============================================

/**
 * POST /api/v1/registration/plans
 * Create a recurring subscription plan
 */
export async function handleCreateSubscriptionPlan(req: Request, env: any, corsHdrs: Headers) {
    try {
        const claims = await requireJWT(req, env);
        const tenantId = claims.tenantId;

        const body = await req.json() as {
            name: string;
            description?: string;
            amount: number;  // In pounds
            frequency?: 'monthly' | 'termly' | 'annual';
            billingDay?: number;
            startDate?: string;
            endDate?: string;
        };

        if (!body.name || !body.amount) {
            return json({ success: false, error: { message: 'Name and amount required' } }, 400, corsHdrs);
        }

        const planId = `sp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        const amountPence = Math.round(body.amount * 100);
        const startDate = body.startDate ? Math.floor(new Date(body.startDate).getTime() / 1000) : null;
        const endDate = body.endDate ? Math.floor(new Date(body.endDate).getTime() / 1000) : null;

        await env.DB.prepare(`
            INSERT INTO subscription_plans 
            (id, tenant_id, name, description, amount_gbp, frequency, billing_day, start_date, end_date)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
            planId,
            tenantId,
            body.name,
            body.description || null,
            amountPence,
            body.frequency || 'monthly',
            body.billingDay || 1,
            startDate,
            endDate
        ).run();

        return json({ success: true, data: { id: planId } }, 201, corsHdrs);
    } catch (error: any) {
        return json({ success: false, error: { message: error.message } }, 500, corsHdrs);
    }
}

/**
 * GET /api/v1/registration/plans
 * List subscription plans
 */
export async function handleListSubscriptionPlans(req: Request, env: any, corsHdrs: Headers) {
    try {
        const claims = await requireJWT(req, env);
        const tenantId = claims.tenantId;

        const { results: plans } = await env.DB.prepare(`
            SELECT sp.*, 
                   (SELECT COUNT(*) FROM player_subscriptions ps WHERE ps.plan_id = sp.id AND ps.status = 'active') as subscriber_count
            FROM subscription_plans sp
            WHERE sp.tenant_id = ? AND sp.status != 'cancelled'
            ORDER BY sp.created_at DESC
        `).bind(tenantId).all();

        return json({
            success: true,
            data: (plans || []).map((p: any) => ({
                id: p.id,
                name: p.name,
                description: p.description,
                amount: p.amount_gbp / 100,
                frequency: p.frequency,
                billingDay: p.billing_day,
                startDate: p.start_date,
                endDate: p.end_date,
                status: p.status,
                subscriberCount: p.subscriber_count,
            }))
        }, 200, corsHdrs);
    } catch (error: any) {
        return json({ success: false, error: { message: error.message } }, 500, corsHdrs);
    }
}

// ============================================
// REGISTRATION FEES (One-Off)
// ============================================

/**
 * POST /api/v1/registration/fees
 * Create a one-off registration fee
 */
export async function handleCreateRegistrationFee(req: Request, env: any, corsHdrs: Headers) {
    try {
        const claims = await requireJWT(req, env);
        const tenantId = claims.tenantId;

        const body = await req.json() as {
            name: string;
            description?: string;
            amount: number;
            season?: string;
            isMandatory?: boolean;
        };

        if (!body.name || !body.amount) {
            return json({ success: false, error: { message: 'Name and amount required' } }, 400, corsHdrs);
        }

        const feeId = `rf_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        const amountPence = Math.round(body.amount * 100);

        await env.DB.prepare(`
            INSERT INTO registration_fees (id, tenant_id, name, description, amount_gbp, season, is_mandatory)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `).bind(
            feeId,
            tenantId,
            body.name,
            body.description || null,
            amountPence,
            body.season || null,
            body.isMandatory !== false ? 1 : 0
        ).run();

        return json({ success: true, data: { id: feeId } }, 201, corsHdrs);
    } catch (error: any) {
        return json({ success: false, error: { message: error.message } }, 500, corsHdrs);
    }
}

/**
 * GET /api/v1/registration/fees
 * List registration fees
 */
export async function handleListRegistrationFees(req: Request, env: any, corsHdrs: Headers) {
    try {
        const claims = await requireJWT(req, env);
        const tenantId = claims.tenantId;

        const { results: fees } = await env.DB.prepare(`
            SELECT rf.*,
                   (SELECT COUNT(*) FROM player_registrations pr WHERE pr.fee_id = rf.id AND pr.status = 'paid') as paid_count
            FROM registration_fees rf
            WHERE rf.tenant_id = ? AND rf.status = 'active'
            ORDER BY rf.created_at DESC
        `).bind(tenantId).all();

        return json({
            success: true,
            data: (fees || []).map((f: any) => ({
                id: f.id,
                name: f.name,
                description: f.description,
                amount: f.amount_gbp / 100,
                season: f.season,
                isMandatory: !!f.is_mandatory,
                paidCount: f.paid_count,
            }))
        }, 200, corsHdrs);
    } catch (error: any) {
        return json({ success: false, error: { message: error.message } }, 500, corsHdrs);
    }
}

// ============================================
// CLUB DOCUMENTS
// ============================================

/**
 * POST /api/v1/registration/documents
 * Create/upload a club document
 */
export async function handleCreateDocument(req: Request, env: any, corsHdrs: Headers) {
    try {
        const claims = await requireJWT(req, env);
        const tenantId = claims.tenantId;

        const body = await req.json() as {
            title: string;
            description?: string;
            content?: string;
            fileUrl?: string;
            requiresSignature?: boolean;
            requiredForRegistration?: boolean;
        };

        if (!body.title) {
            return json({ success: false, error: { message: 'Title required' } }, 400, corsHdrs);
        }

        const docId = `doc_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

        await env.DB.prepare(`
            INSERT INTO club_documents 
            (id, tenant_id, title, description, content, file_url, requires_signature, required_for_registration)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
            docId,
            tenantId,
            body.title,
            body.description || null,
            body.content || null,
            body.fileUrl || null,
            body.requiresSignature ? 1 : 0,
            body.requiredForRegistration ? 1 : 0
        ).run();

        return json({ success: true, data: { id: docId } }, 201, corsHdrs);
    } catch (error: any) {
        return json({ success: false, error: { message: error.message } }, 500, corsHdrs);
    }
}

/**
 * GET /api/v1/registration/documents
 * List club documents
 */
export async function handleListDocuments(req: Request, env: any, corsHdrs: Headers) {
    try {
        const claims = await requireJWT(req, env);
        const tenantId = claims.tenantId;

        const { results: docs } = await env.DB.prepare(`
            SELECT cd.*,
                   (SELECT COUNT(*) FROM player_agreements pa WHERE pa.document_id = cd.id) as signature_count
            FROM club_documents cd
            WHERE cd.tenant_id = ? AND cd.status = 'active'
            ORDER BY cd.created_at DESC
        `).bind(tenantId).all();

        return json({
            success: true,
            data: (docs || []).map((d: any) => ({
                id: d.id,
                title: d.title,
                description: d.description,
                content: d.content,
                fileUrl: d.file_url,
                requiresSignature: !!d.requires_signature,
                requiredForRegistration: !!d.required_for_registration,
                version: d.version,
                signatureCount: d.signature_count,
            }))
        }, 200, corsHdrs);
    } catch (error: any) {
        return json({ success: false, error: { message: error.message } }, 500, corsHdrs);
    }
}

// ============================================
// E-SIGNATURES
// ============================================

/**
 * POST /api/v1/registration/sign
 * Sign a document (e-signature)
 */
export async function handleSignDocument(req: Request, env: any, corsHdrs: Headers) {
    try {
        const body = await req.json() as {
            documentId: string;
            playerId: string;
            signedByName: string;
            signedByEmail: string;
            relationship?: string;
            signatureData: string;  // Base64 image or typed name
            signatureType?: 'drawn' | 'typed';
        };

        if (!body.documentId || !body.playerId || !body.signedByName || !body.signedByEmail || !body.signatureData) {
            return json({ success: false, error: { message: 'Missing required fields' } }, 400, corsHdrs);
        }

        // Get client IP and user agent for audit trail
        const ipAddress = req.headers.get('CF-Connecting-IP') || req.headers.get('X-Forwarded-For') || 'unknown';
        const userAgent = req.headers.get('User-Agent') || 'unknown';

        const agreementId = `agree_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

        await env.DB.prepare(`
            INSERT INTO player_agreements 
            (id, document_id, player_id, signed_by_name, signed_by_email, relationship, signature_data, signature_type, ip_address, user_agent)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
            agreementId,
            body.documentId,
            body.playerId,
            body.signedByName,
            body.signedByEmail,
            body.relationship || 'parent',
            body.signatureData,
            body.signatureType || 'drawn',
            ipAddress,
            userAgent
        ).run();

        return json({
            success: true,
            data: {
                id: agreementId,
                message: 'Document signed successfully'
            }
        }, 201, corsHdrs);
    } catch (error: any) {
        return json({ success: false, error: { message: error.message } }, 500, corsHdrs);
    }
}

/**
 * GET /api/v1/registration/agreements/:playerId
 * Get all agreements for a player
 */
export async function handleGetPlayerAgreements(req: Request, env: any, corsHdrs: Headers) {
    try {
        const claims = await requireJWT(req, env);
        const url = new URL(req.url);
        const playerId = url.pathname.split('/').pop();

        const { results: agreements } = await env.DB.prepare(`
            SELECT pa.*, cd.title as document_title
            FROM player_agreements pa
            JOIN club_documents cd ON pa.document_id = cd.id
            WHERE pa.player_id = ?
            ORDER BY pa.signed_at DESC
        `).bind(playerId).all();

        return json({
            success: true,
            data: (agreements || []).map((a: any) => ({
                id: a.id,
                documentTitle: a.document_title,
                signedByName: a.signed_by_name,
                signedByEmail: a.signed_by_email,
                relationship: a.relationship,
                signedAt: a.signed_at,
            }))
        }, 200, corsHdrs);
    } catch (error: any) {
        return json({ success: false, error: { message: error.message } }, 500, corsHdrs);
    }
}

// ============================================
// DISCOUNT RULES
// ============================================

/**
 * POST /api/v1/registration/discounts
 * Create a discount rule
 */
export async function handleCreateDiscount(req: Request, env: any, corsHdrs: Headers) {
    try {
        const claims = await requireJWT(req, env);
        const tenantId = claims.tenantId;

        const body = await req.json() as {
            name: string;
            description?: string;
            discountType: 'percentage' | 'fixed' | 'free';
            discountValue?: number;  // 50 for 50%, or amount in pounds for fixed
            appliesTo: string;  // 'coach_children', 'volunteer_children', 'siblings'
            maxChildren?: number;
        };

        if (!body.name || !body.discountType || !body.appliesTo) {
            return json({ success: false, error: { message: 'Name, discount type and applies to required' } }, 400, corsHdrs);
        }

        const discountId = `disc_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        let discountValue = body.discountValue || 0;
        if (body.discountType === 'fixed') {
            discountValue = Math.round(discountValue * 100);  // Convert to pence
        } else if (body.discountType === 'free') {
            discountValue = 100;  // 100% off
        }

        await env.DB.prepare(`
            INSERT INTO discount_rules 
            (id, tenant_id, name, description, discount_type, discount_value, applies_to, max_children)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
            discountId,
            tenantId,
            body.name,
            body.description || null,
            body.discountType,
            discountValue,
            body.appliesTo,
            body.maxChildren || null
        ).run();

        return json({ success: true, data: { id: discountId } }, 201, corsHdrs);
    } catch (error: any) {
        return json({ success: false, error: { message: error.message } }, 500, corsHdrs);
    }
}

/**
 * GET /api/v1/registration/discounts
 * List discount rules
 */
export async function handleListDiscounts(req: Request, env: any, corsHdrs: Headers) {
    try {
        const claims = await requireJWT(req, env);
        const tenantId = claims.tenantId;

        const { results: discounts } = await env.DB.prepare(
            'SELECT * FROM discount_rules WHERE tenant_id = ? AND status = ? ORDER BY created_at DESC'
        ).bind(tenantId, 'active').all();

        return json({
            success: true,
            data: (discounts || []).map((d: any) => ({
                id: d.id,
                name: d.name,
                description: d.description,
                discountType: d.discount_type,
                discountValue: d.discount_type === 'fixed' ? d.discount_value / 100 : d.discount_value,
                appliesTo: d.applies_to,
                maxChildren: d.max_children,
            }))
        }, 200, corsHdrs);
    } catch (error: any) {
        return json({ success: false, error: { message: error.message } }, 500, corsHdrs);
    }
}

// ============================================
// STAFF CHILDREN (Coach/Volunteer Links)
// ============================================

/**
 * POST /api/v1/registration/staff-children
 * Link a staff member to their child
 */
export async function handleLinkStaffChild(req: Request, env: any, corsHdrs: Headers) {
    try {
        const claims = await requireJWT(req, env);
        const tenantId = claims.tenantId;

        const body = await req.json() as {
            staffEmail: string;
            playerId: string;
            relationship?: string;
        };

        if (!body.staffEmail || !body.playerId) {
            return json({ success: false, error: { message: 'Staff email and player ID required' } }, 400, corsHdrs);
        }

        const linkId = `link_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

        await env.DB.prepare(`
            INSERT INTO staff_children (id, tenant_id, staff_user_id, staff_email, player_id, relationship)
            VALUES (?, ?, ?, ?, ?, ?)
        `).bind(
            linkId,
            tenantId,
            body.staffEmail,  // Using email as user_id for now
            body.staffEmail,
            body.playerId,
            body.relationship || 'parent'
        ).run();

        return json({ success: true, data: { id: linkId } }, 201, corsHdrs);
    } catch (error: any) {
        return json({ success: false, error: { message: error.message } }, 500, corsHdrs);
    }
}

/**
 * GET /api/v1/registration/staff-children
 * List staff children links
 */
export async function handleListStaffChildren(req: Request, env: any, corsHdrs: Headers) {
    try {
        const claims = await requireJWT(req, env);
        const tenantId = claims.tenantId;

        const { results: links } = await env.DB.prepare(`
            SELECT sc.*, p.name as player_name
            FROM staff_children sc
            JOIN players p ON sc.player_id = p.id
            WHERE sc.tenant_id = ?
            ORDER BY sc.created_at DESC
        `).bind(tenantId).all();

        return json({
            success: true,
            data: (links || []).map((l: any) => ({
                id: l.id,
                staffEmail: l.staff_email,
                playerId: l.player_id,
                playerName: l.player_name,
                relationship: l.relationship,
                verified: !!l.verified,
            }))
        }, 200, corsHdrs);
    } catch (error: any) {
        return json({ success: false, error: { message: error.message } }, 500, corsHdrs);
    }
}

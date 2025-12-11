
import { z } from "zod";
import { json } from "../services/util";
import { parse, isValidationError } from "../lib/validate";
import { requireJWT, hasRole } from "../services/auth";
import { logJSON } from "../lib/log";

// PATCH /api/v1/tenants/me
export async function updateTenantMe(req: Request, env: any, corsHdrs: Headers): Promise<Response> {
    try {
        const claims = await requireJWT(req, env);
        const tenantId = claims.tenantId;

        if (!tenantId) {
            return json({ success: false, error: { code: "NO_TENANT", message: "No tenant associated with user" } }, 400, corsHdrs);
        }

        if (!hasRole(claims, "owner") && !hasRole(claims, "tenant_admin")) {
            return json({ success: false, error: { code: "FORBIDDEN", message: "Requires owner or admin role" } }, 403, corsHdrs);
        }

        const body = await req.json().catch(() => ({}));

        const ParamSchema = z.object({
            name: z.string().min(2).optional(),
            slug: z.string().min(3).regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric").optional(),
            primaryColor: z.string().startsWith("#").optional(),
            secondaryColor: z.string().startsWith("#").optional(),
            badgeUrl: z.string().optional(),
            status: z.enum(["active", "trial"]).optional() // Only allow setting to active/trial from here
        });

        const data = parse(ParamSchema, body);
        const updates: string[] = [];
        const params: any[] = [];

        // Tenant Updates
        if (data.name) {
            updates.push("name = ?");
            params.push(data.name);
        }
        if (data.slug) {
            // Check Uniqueness
            const existing = await env.DB.prepare("SELECT id FROM tenants WHERE slug = ? AND id != ?")
                .bind(data.slug, tenantId).first();
            if (existing) {
                return json({ success: false, error: { code: "SLUG_TAKEN", message: "Club URL is already taken" } }, 409, corsHdrs);
            }
            updates.push("slug = ?");
            params.push(data.slug);
        }
        if (data.status) {
            updates.push("status = ?");
            params.push(data.status);
        }

        if (updates.length > 0) {
            const q = `UPDATE tenants SET ${updates.join(", ")}, updated_at = unixepoch() WHERE id = ?`;
            params.push(tenantId);
            await env.DB.prepare(q).bind(...params).run();
        }

        // Brand Updates (Upsert)
        if (data.primaryColor || data.secondaryColor || data.badgeUrl) {
            const currentBrand = await env.DB.prepare("SELECT * FROM tenant_brand WHERE tenant_id = ?").bind(tenantId).first();

            if (currentBrand) {
                const brandUpdates: string[] = [];
                const brandParams: any[] = [];
                if (data.primaryColor) { brandUpdates.push("primary_color = ?"); brandParams.push(data.primaryColor); }
                if (data.secondaryColor) { brandUpdates.push("secondary_color = ?"); brandParams.push(data.secondaryColor); }
                if (data.badgeUrl !== undefined) { brandUpdates.push("badge_url = ?"); brandParams.push(data.badgeUrl); } // Allow empty string to clear? Assuming regex url above prevents empty, but optional() allows undefined.

                if (brandUpdates.length > 0) {
                    const q = `UPDATE tenant_brand SET ${brandUpdates.join(", ")}, updated_at = unixepoch() WHERE tenant_id = ?`;
                    brandParams.push(tenantId);
                    await env.DB.prepare(q).bind(...brandParams).run();
                }
            } else {
                await env.DB.prepare(`
          INSERT INTO tenant_brand (tenant_id, primary_color, secondary_color, badge_url, created_at, updated_at)
          VALUES (?, ?, ?, ?, unixepoch(), unixepoch())
        `).bind(
                    tenantId,
                    data.primaryColor || "#000000",
                    data.secondaryColor || "#ffffff",
                    data.badgeUrl || null
                ).run();
            }
        }

        // Determine new slug to return (if changed)
        const newSlug = data.slug || (claims as any).slug || (await env.DB.prepare("SELECT slug FROM tenants WHERE id = ?").bind(tenantId).first())?.slug;

        return json({
            success: true,
            tenant: {
                id: tenantId,
                slug: newSlug,
                name: data.name,
                // ... include other returned fields if needed for frontend state update
            }
        }, 200, corsHdrs);

    } catch (err: any) {
        if (err instanceof Response) return err;
        if (isValidationError(err)) {
            return json({ success: false, error: { code: "INVALID_REQUEST", issues: err.issues } }, 400, corsHdrs);
        }
        logJSON({ level: 'error', msg: 'UPDATE_TENANT_ME_ERROR', error: err.message });
        return json({ success: false, error: { code: "UPDATE_FAILED", message: err.message } }, 500, corsHdrs);
    }
}

// GET /api/v1/tenants/me
export async function getTenantMe(req: Request, env: any, corsHdrs: Headers): Promise<Response> {
    try {
        const claims = await requireJWT(req, env);
        const tenantId = claims.tenantId;

        if (!tenantId) {
            return json({ success: false, error: { code: "NO_TENANT", message: "No tenant associated with user" } }, 400, corsHdrs);
        }

        const tenant = await env.DB.prepare(`
      SELECT t.*, tb.primary_color, tb.secondary_color, tb.badge_url
      FROM tenants t
      LEFT JOIN tenant_brand tb ON t.id = tb.tenant_id
      WHERE t.id = ?
    `).bind(tenantId).first();

        if (!tenant) {
            return json({ success: false, error: { code: "NOT_FOUND", message: "Tenant not found" } }, 404, corsHdrs);
        }

        return json({ success: true, tenant }, 200, corsHdrs);

    } catch (err: any) {
        if (err instanceof Response) return err;
        logJSON({ level: 'error', msg: 'GET_TENANT_ME_ERROR', error: err.message });
        return json({ success: false, error: { code: "SERVER_ERROR", message: err.message } }, 500, corsHdrs);
    }
}

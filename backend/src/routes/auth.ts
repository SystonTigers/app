import { z } from "zod";
import { json, readIdempotencyKey } from "../services/util";
import { ensureIdempotent } from "../services/idempotency";
import { parse, isValidationError } from "../lib/validate";
import { registerUser, authenticateUser } from "../services/users";
import { issueTenantAdminJWT, issueTenantMemberJWT } from "../services/jwt";

const RegisterSchema = z.object({
  tenant_id: z.string().min(1, "tenant_id required"),
  email: z.string().email("valid email required"),
  password: z.string().min(8, "password must be at least 8 characters"),
  profile: z.record(z.unknown()).optional(),
  roles: z.array(z.enum(["tenant_admin", "tenant_member"])).optional()
});

const LoginSchema = z.object({
  tenant_id: z.string().optional(),
  tenantId: z.string().optional(), // Accept both formats
  email: z.string().email("valid email required"),
  password: z.string().min(1, "password required")
});

export async function handleAuthRegister(req: Request, env: any, corsHdrs: Headers) {
  try {
    const body = await req.json().catch(() => ({}));
    const data = parse(RegisterSchema, body);

    const idemKey = readIdempotencyKey(req);
    const idem = await ensureIdempotent(env, data.tenant_id, body, idemKey || undefined);
    if (idem.hit) {
      return json(idem.response, 200, corsHdrs);
    }

    const registration = await registerUser(env, {
      tenantId: data.tenant_id,
      email: data.email,
      password: data.password,
      roles: data.roles,
      profile: data.profile ?? null
    });

    if (!registration.success) {
      return json({ success: false, error: registration.error }, registration.status, corsHdrs);
    }

    const { user } = registration;
    const isAdmin = user.roles.includes("tenant_admin") || data.roles?.includes("tenant_admin");
    const token = isAdmin
      ? await issueTenantAdminJWT(env, { tenant_id: user.tenant_id, ttlMinutes: 60 })
      : await issueTenantMemberJWT(env, { tenant_id: user.tenant_id, user_id: user.id, roles: user.roles });

    const responseBody = {
      success: true,
      data: {
        user,
        token
      }
    };

    await idem.store(responseBody);

    return json(responseBody, 201, corsHdrs);
  } catch (err: any) {
    if (isValidationError(err)) {
      return json({
        success: false,
        error: {
          code: "INVALID_REQUEST",
          message: "Validation failed",
          issues: err.issues
        }
      }, err.status, corsHdrs);
    }
    if (err instanceof Response) return err;
    return json({ success: false, error: { code: "REGISTER_FAILED", message: err?.message || "unexpected error" } }, 500, corsHdrs);
  }
}

const SetPasswordSchema = z.object({
  password: z.string().min(8, "password must be at least 8 characters"),
  confirmPassword: z.string().min(1, "confirm password required")
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export async function handleSetPassword(req: Request, env: any, corsHdrs: Headers) {
  try {
    const body = await req.json().catch(() => ({}));
    const data = parse(SetPasswordSchema, body);

    // Get user from JWT (should be from magic link login)
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authorization required' }
      }, 401, corsHdrs);
    }

    const token = authHeader.substring(7);
    // TODO: Verify JWT and extract user info
    // For now, assume we have tenantId and email from JWT
    const decoded = await verifyJWT(env, token);
    if (!decoded || !decoded.sub) {
      return json({
        success: false,
        error: { code: 'INVALID_TOKEN', message: 'Invalid or expired token' }
      }, 401, corsHdrs);
    }

    // Get user email from JWT sub
    const userEmail = decoded.sub;
    const tenantId = decoded.tenant_id || decoded.tenantId;

    if (!tenantId) {
      return json({
        success: false,
        error: { code: 'INVALID_TOKEN', message: 'Tenant ID not found in token' }
      }, 401, corsHdrs);
    }

    // Hash the password
    const bcrypt = await import('bcryptjs');
    const passwordHash = await bcrypt.hash(data.password, 10);

    // Update user with password
    const result = await env.DB.prepare(
      `UPDATE auth_users SET password_hash = ?, updated_at = ? WHERE tenant_id = ? AND email = ?`
    ).bind(passwordHash, Date.now(), tenantId, userEmail).run();

    if (result.meta.changes === 0) {
      return json({
        success: false,
        error: { code: 'USER_NOT_FOUND', message: 'User not found' }
      }, 404, corsHdrs);
    }

    return json({ success: true, message: 'Password set successfully' }, 200, corsHdrs);
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
    if (err instanceof Response) return err;
    return json({ success: false, error: { code: 'SET_PASSWORD_FAILED', message: err?.message || 'unexpected error' } }, 500, corsHdrs);
  }
}

async function verifyJWT(env: any, token: string): Promise<any> {
  try {
    const enc = new TextEncoder();
    const secret = enc.encode(env.JWT_SECRET || '');
    const [headerB64, payloadB64, signatureB64] = token.split('.');

    if (!headerB64 || !payloadB64 || !signatureB64) {
      return null;
    }

    const payload = JSON.parse(atob(payloadB64));

    // Check expiry
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export async function handleCheckPasswordStatus(req: Request, env: any, corsHdrs: Headers) {
  try {
    // Get user from JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authorization required' }
      }, 401, corsHdrs);
    }

    const token = authHeader.substring(7);
    const decoded = await verifyJWT(env, token);

    if (!decoded || !decoded.sub) {
      return json({
        success: false,
        error: { code: 'INVALID_TOKEN', message: 'Invalid or expired token' }
      }, 401, corsHdrs);
    }

    const userEmail = decoded.sub;
    const tenantId = decoded.tenant_id || decoded.tenantId;

    if (!tenantId) {
      return json({
        success: false,
        error: { code: 'INVALID_TOKEN', message: 'Tenant ID not found in token' }
      }, 401, corsHdrs);
    }

    // Check if user has password set
    const user = await env.DB.prepare(
      `SELECT password_hash FROM auth_users WHERE tenant_id = ? AND email = ?`
    ).bind(tenantId, userEmail).first();

    const hasPassword = !!(user && user.password_hash);

    return json({ success: true, hasPassword }, 200, corsHdrs);
  } catch (err: any) {
    if (err instanceof Response) return err;
    return json({ success: false, error: { code: 'CHECK_FAILED', message: err?.message || 'unexpected error' } }, 500, corsHdrs);
  }
}

export async function handleAuthLogin(req: Request, env: any, corsHdrs: Headers) {
  try {
    const body = await req.json().catch(() => ({}));
    const data = parse(LoginSchema, body);

    // Handle tenantId or tenant_id (both formats)
    let tenantIdentifier = data.tenant_id || data.tenantId;
    let tenantId: string | undefined;

    // If tenant provided, resolve slug to ID if needed
    if (tenantIdentifier) {
      // Check if it's a slug (doesn't start with 'tenant_')
      if (!tenantIdentifier.startsWith('tenant_')) {
        const tenant = await env.DB.prepare('SELECT id FROM tenants WHERE slug = ?')
          .bind(tenantIdentifier)
          .first();
        tenantId = tenant?.id;
      } else {
        tenantId = tenantIdentifier;
      }
    }

    // If no tenant provided or not found, try to find user by email across all tenants
    if (!tenantId) {
      const userRow = await env.DB.prepare(
        `SELECT tenant_id FROM auth_users WHERE email = ? LIMIT 1`
      ).bind(data.email.trim().toLowerCase()).first();
      tenantId = userRow?.tenant_id;
    }

    if (!tenantId) {
      return json({
        success: false,
        error: { code: "INVALID_CREDENTIALS", message: "Invalid email or password" }
      }, 401, corsHdrs);
    }

    const user = await authenticateUser(env, {
      tenantId,
      email: data.email,
      password: data.password
    });

    if (!user) {
      return json({
        success: false,
        error: { code: "INVALID_CREDENTIALS", message: "Invalid email or password" }
      }, 401, corsHdrs);
    }

    const isAdmin = user.roles.includes("tenant_admin");
    const token = isAdmin
      ? await issueTenantAdminJWT(env, { tenant_id: user.tenant_id, ttlMinutes: 60 })
      : await issueTenantMemberJWT(env, { tenant_id: user.tenant_id, user_id: user.id, roles: user.roles });

    return json({ success: true, data: { user, token } }, 200, corsHdrs);
  } catch (err: any) {
    if (isValidationError(err)) {
      return json({
        success: false,
        error: {
          code: "INVALID_REQUEST",
          message: "Validation failed",
          issues: err.issues
        }
      }, err.status, corsHdrs);
    }
    if (err instanceof Response) return err;
    return json({ success: false, error: { code: "LOGIN_FAILED", message: err?.message || "unexpected error" } }, 500, corsHdrs);
  }
}

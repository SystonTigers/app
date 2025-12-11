import { z } from "zod";
import { json, readIdempotencyKey } from "../services/util";
import { ensureIdempotent } from "../services/idempotency";
import { parse, isValidationError } from "../lib/validate";
import { registerUser, authenticateUser } from "../services/users";
import { issueTenantAdminJWT, issueTenantMemberJWT } from "../services/jwt";
import { rateLimit } from "../middleware/rateLimit";

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
    // Rate limit: 3 attempts per hour per IP
    const rateLimitResult = await rateLimit(req, env, {
      scope: "auth:register",
      limit: 3,
      windowSeconds: 3600, // 1 hour
      path: "/api/v1/auth/register"
    });

    if (!rateLimitResult.ok) {
      const headers = new Headers(corsHdrs);
      if (rateLimitResult.limit) headers.set("X-RateLimit-Limit", String(rateLimitResult.limit));
      if (rateLimitResult.remaining !== undefined) headers.set("X-RateLimit-Remaining", String(rateLimitResult.remaining));
      if (rateLimitResult.retryAfter) headers.set("Retry-After", String(rateLimitResult.retryAfter));

      return json(
        {
          success: false,
          error: {
            code: "RATE_LIMITED",
            message: rateLimitResult.error || "Too many registration attempts. Please try again later."
          }
        },
        429,
        headers
      );
    }

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
    if (err instanceof Response) { return err; }
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
    // Verify JWT and extract user info
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
    if (err instanceof Response) { return err; }
    return json({ success: false, error: { code: 'SET_PASSWORD_FAILED', message: err?.message || 'unexpected error' } }, 500, corsHdrs);
  }
}

export async function verifyJWT(env: any, token: string): Promise<any> {
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
    if (err instanceof Response) { return err; }
    return json({ success: false, error: { code: 'CHECK_FAILED', message: err?.message || 'unexpected error' } }, 500, corsHdrs);
  }
}

export async function handleAuthLogin(req: Request, env: any, corsHdrs: Headers) {
  try {
    // Rate limit: 5 attempts per 15 minutes per IP
    const rateLimitResult = await rateLimit(req, env, {
      scope: "auth:login",
      limit: 5,
      windowSeconds: 900, // 15 minutes
      path: "/api/v1/auth/login"
    });

    if (!rateLimitResult.ok) {
      const headers = new Headers(corsHdrs);
      if (rateLimitResult.limit) headers.set("X-RateLimit-Limit", String(rateLimitResult.limit));
      if (rateLimitResult.remaining !== undefined) headers.set("X-RateLimit-Remaining", String(rateLimitResult.remaining));
      if (rateLimitResult.retryAfter) headers.set("Retry-After", String(rateLimitResult.retryAfter));

      return json(
        {
          success: false,
          error: {
            code: "RATE_LIMITED",
            message: rateLimitResult.error || "Too many login attempts. Please try again later."
          }
        },
        429,
        headers
      );
    }

    const body = await req.json().catch(() => ({}));
    const data = parse(LoginSchema, body);

    // Handle tenantId or tenant_id (both formats)
    const tenantIdentifier = data.tenant_id || data.tenantId;
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
    if (err instanceof Response) { return err; }
    return json({ success: false, error: { code: "LOGIN_FAILED", message: err?.message || "unexpected error" } }, 500, corsHdrs);
  }
}


// Login Code Schemas
const CodeLoginSchema = z.object({
  code: z.string().min(4, "Login code required"),
  role: z.enum(["parent", "player", "coach"]),
  tenant: z.string().min(1, "Tenant required"),
});

const FanLoginSchema = z.object({
  email: z.string().email("Valid email required"),
  fanCode: z.string().min(4, "Fan code required"),
  tenant: z.string().min(1, "Tenant required"),
});

/**
 * Handle login with player/coach code
 * POST /api/v1/auth/code-login
 */
export async function handleCodeLogin(req: Request, env: any, corsHdrs: Headers) {
  try {
    // Rate limit: 10 attempts per 15 minutes per IP
    const rateLimitResult = await rateLimit(req, env, {
      scope: "auth:code-login",
      limit: 10,
      windowSeconds: 900,
      path: "/api/v1/auth/code-login"
    });

    if (!rateLimitResult.ok) {
      const headers = new Headers(corsHdrs);
      if (rateLimitResult.retryAfter) headers.set("Retry-After", String(rateLimitResult.retryAfter));
      return json({
        success: false,
        error: { code: "RATE_LIMITED", message: "Too many login attempts. Please try again later." }
      }, 429, headers);
    }

    const body = await req.json().catch(() => ({}));
    const data = parse(CodeLoginSchema, body);

    // Resolve tenant slug to ID
    let tenantId: string | undefined;
    if (!data.tenant.startsWith('tenant_')) {
      const tenant = await env.DB.prepare('SELECT id, name FROM tenants WHERE slug = ?')
        .bind(data.tenant)
        .first();
      tenantId = tenant?.id;
    } else {
      tenantId = data.tenant;
    }

    if (!tenantId) {
      return json({
        success: false,
        error: { code: "INVALID_TENANT", message: "Team not found" }
      }, 404, corsHdrs);
    }

    // Look up the login code
    const codeRecord = await env.DB.prepare(`
      SELECT lc.*, p.name as player_name, p.id as player_id
      FROM login_codes lc
      LEFT JOIN players p ON lc.player_id = p.id
      WHERE lc.code = ? AND lc.tenant_id = ? AND lc.is_active = 1
    `).bind(data.code.toUpperCase(), tenantId).first();

    // Also check players table directly for legacy codes
    let playerId: string | undefined;
    let playerName: string | undefined;
    let codeType = 'player';

    if (codeRecord) {
      playerId = codeRecord.player_id;
      playerName = codeRecord.player_name;
      codeType = codeRecord.code_type;
    } else {
      // Check players table for login_code field
      const player = await env.DB.prepare(`
        SELECT id, name, login_code FROM players
        WHERE login_code = ? AND tenant_id = ?
      `).bind(data.code.toUpperCase(), tenantId).first();

      if (!player) {
        return json({
          success: false,
          error: { code: "INVALID_CODE", message: "Invalid login code" }
        }, 401, corsHdrs);
      }
      playerId = player.id;
      playerName = player.name;
    }

    // Verify role is allowed for this code type
    if (data.role === 'coach' && codeType !== 'coach') {
      return json({
        success: false,
        error: { code: "INVALID_ROLE", message: "This code does not allow coach access" }
      }, 403, corsHdrs);
    }

    // Create session token
    const sessionId = crypto.randomUUID();
    const token = await generateSessionToken(env, {
      sessionId,
      tenantId,
      role: data.role,
      playerId,
      playerName,
    });

    // Store session
    await env.DB.prepare(`
      INSERT INTO user_sessions (id, tenant_id, code_id, role, player_id, display_name, token, created_at, expires_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now', '+7 days'))
    `).bind(
      sessionId,
      tenantId,
      codeRecord?.id || null,
      data.role,
      playerId,
      playerName || data.role,
      token
    ).run();

    // Auto-assign to discussion groups based on role
    await autoAssignGroups(env, {
      tenantId,
      sessionId,
      role: data.role,
    });

    return json({
      success: true,
      token,
      role: data.role,
      playerId,
      playerName,
    }, 200, corsHdrs);

  } catch (err: any) {
    if (isValidationError(err)) {
      return json({
        success: false,
        error: { code: "INVALID_REQUEST", message: "Validation failed", issues: err.issues }
      }, err.status, corsHdrs);
    }
    if (err instanceof Response) return err;
    console.error('Code login error:', err);
    return json({ success: false, error: { code: "LOGIN_FAILED", message: err?.message || "unexpected error" } }, 500, corsHdrs);
  }
}

/**
 * Handle fan login with email + team fan code
 * POST /api/v1/auth/fan-login
 */
export async function handleFanLogin(req: Request, env: any, corsHdrs: Headers) {
  try {
    const rateLimitResult = await rateLimit(req, env, {
      scope: "auth:fan-login",
      limit: 10,
      windowSeconds: 900,
      path: "/api/v1/auth/fan-login"
    });

    if (!rateLimitResult.ok) {
      const headers = new Headers(corsHdrs);
      if (rateLimitResult.retryAfter) headers.set("Retry-After", String(rateLimitResult.retryAfter));
      return json({
        success: false,
        error: { code: "RATE_LIMITED", message: "Too many login attempts. Please try again later." }
      }, 429, headers);
    }

    const body = await req.json().catch(() => ({}));
    const data = parse(FanLoginSchema, body);

    // Resolve tenant
    let tenantId: string | undefined;
    let tenantName: string | undefined;
    if (!data.tenant.startsWith('tenant_')) {
      const tenant = await env.DB.prepare('SELECT id, name, fan_code FROM tenants WHERE slug = ?')
        .bind(data.tenant)
        .first();
      tenantId = tenant?.id;
      tenantName = tenant?.name;

      // Verify fan code
      if (!tenant || tenant.fan_code?.toUpperCase() !== data.fanCode.toUpperCase()) {
        return json({
          success: false,
          error: { code: "INVALID_FAN_CODE", message: "Invalid team fan code" }
        }, 401, corsHdrs);
      }
    } else {
      const tenant = await env.DB.prepare('SELECT id, name, fan_code FROM tenants WHERE id = ?')
        .bind(data.tenant)
        .first();
      tenantId = tenant?.id;
      tenantName = tenant?.name;

      if (!tenant || tenant.fan_code?.toUpperCase() !== data.fanCode.toUpperCase()) {
        return json({
          success: false,
          error: { code: "INVALID_FAN_CODE", message: "Invalid team fan code" }
        }, 401, corsHdrs);
      }
    }

    if (!tenantId) {
      return json({
        success: false,
        error: { code: "INVALID_TENANT", message: "Team not found" }
      }, 404, corsHdrs);
    }

    // Create session
    const sessionId = crypto.randomUUID();
    const token = await generateSessionToken(env, {
      sessionId,
      tenantId,
      role: 'fan',
      email: data.email,
    });

    await env.DB.prepare(`
      INSERT INTO user_sessions (id, tenant_id, email, role, display_name, token, created_at, expires_at)
      VALUES (?, ?, ?, 'fan', ?, ?, datetime('now'), datetime('now', '+30 days'))
    `).bind(sessionId, tenantId, data.email, data.email.split('@')[0], token).run();

    return json({
      success: true,
      token,
      role: 'fan',
      teamName: tenantName,
    }, 200, corsHdrs);

  } catch (err: any) {
    if (isValidationError(err)) {
      return json({
        success: false,
        error: { code: "INVALID_REQUEST", message: "Validation failed", issues: err.issues }
      }, err.status, corsHdrs);
    }
    if (err instanceof Response) return err;
    console.error('Fan login error:', err);
    return json({ success: false, error: { code: "LOGIN_FAILED", message: err?.message || "unexpected error" } }, 500, corsHdrs);
  }
}

/**
 * Generate a session token
 */
async function generateSessionToken(env: any, payload: {
  sessionId: string;
  tenantId: string;
  role: string;
  playerId?: string;
  playerName?: string;
  email?: string;
}): Promise<string> {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const claims = {
    sub: payload.sessionId,
    tenant_id: payload.tenantId,
    role: payload.role,
    player_id: payload.playerId,
    player_name: payload.playerName,
    email: payload.email,
    iat: now,
    exp: now + (7 * 24 * 60 * 60), // 7 days
  };

  const headerB64 = btoa(JSON.stringify(header));
  const payloadB64 = btoa(JSON.stringify(claims));
  const signatureData = `${headerB64}.${payloadB64}`;

  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(env.JWT_SECRET || 'dev-secret'),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, enc.encode(signatureData));
  const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)));

  return `${headerB64}.${payloadB64}.${signatureB64}`;
}

/**
 * Auto-assign user to discussion groups based on role
 */
async function autoAssignGroups(env: any, params: {
  tenantId: string;
  sessionId: string;
  role: string;
}): Promise<void> {
  const groupAssignments: Record<string, string[]> = {
    manager: ['main', 'coaches', 'players'],
    coach: ['main', 'coaches', 'players'],
    parent: ['main'],
    player: ['players'],
    fan: [],
  };

  const groupTypes = groupAssignments[params.role] || [];
  if (groupTypes.length === 0) return;

  try {
    // Get or create discussion groups
    for (const groupType of groupTypes) {
      // Find existing group of this type
      let group = await env.DB.prepare(`
        SELECT id FROM discussion_group_types WHERE tenant_id = ? AND group_type = ?
      `).bind(params.tenantId, groupType).first();

      if (!group) {
        // Create the group type mapping
        const groupId = crypto.randomUUID();
        await env.DB.prepare(`
          INSERT INTO discussion_group_types (id, tenant_id, group_type, created_at)
          VALUES (?, ?, ?, datetime('now'))
        `).bind(groupId, params.tenantId, groupType).run();
        group = { id: groupId };
      }

      // Add membership (ignore if already exists)
      await env.DB.prepare(`
        INSERT OR IGNORE INTO group_memberships (id, user_id, group_id, joined_at)
        VALUES (?, ?, ?, datetime('now'))
      `).bind(crypto.randomUUID(), params.sessionId, group.id).run();
    }
  } catch (err) {
    console.error('Auto-assign groups error:', err);
    // Don't fail login if group assignment fails
  }
}

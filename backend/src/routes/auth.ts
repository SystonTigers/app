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
  tenant_id: z.string().min(1, "tenant_id required"),
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

export async function handleAuthLogin(req: Request, env: any, corsHdrs: Headers) {
  try {
    const body = await req.json().catch(() => ({}));
    const data = parse(LoginSchema, body);

    const user = await authenticateUser(env, {
      tenantId: data.tenant_id,
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

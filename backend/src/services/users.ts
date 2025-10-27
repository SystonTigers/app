import { getTenantConfig } from "./tenants";

export interface UserProfile {
  id: string;
  tenant_id: string;
  email: string;
  roles: string[];
  profile: Record<string, unknown> | null;
  created_at: number;
  updated_at: number;
}

interface StoredUserRow {
  id: string;
  tenant_id: string;
  email: string;
  password_hash: string;
  roles: string;
  profile: string | null;
  created_at: number;
  updated_at: number;
}

export interface RegisterUserInput {
  tenantId: string;
  email: string;
  password: string;
  roles?: string[];
  profile?: Record<string, unknown> | null;
}

export interface RegisterUserResult {
  success: true;
  user: UserProfile;
} | {
  success: false;
  status: number;
  error: { code: string; message: string };
};

export async function registerUser(env: any, input: RegisterUserInput): Promise<RegisterUserResult> {
  const tenant = await getTenantConfig(env, input.tenantId);
  if (!tenant) {
    return {
      success: false,
      status: 404,
      error: { code: "TENANT_NOT_FOUND", message: "tenant not found" }
    };
  }

  const email = normalizeEmail(input.email);
  const existing = await getUserByEmail(env, input.tenantId, email);
  if (existing) {
    return {
      success: false,
      status: 409,
      error: { code: "USER_EXISTS", message: "user already registered" }
    };
  }

  const password_hash = await hashPassword(input.password);
  const now = Date.now();
  const id = crypto.randomUUID();
  const roles = JSON.stringify(normalizeRoles(input.roles));
  const profile = input.profile ? JSON.stringify(input.profile) : null;

  try {
    await env.DB.prepare(
      `INSERT INTO auth_users (id, tenant_id, email, password_hash, roles, profile, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(id, input.tenantId, email, password_hash, roles, profile, now, now).run();
  } catch (err: any) {
    const message = String(err?.message || "");
    if (message.includes("UNIQUE constraint failed")) {
      return {
        success: false,
        status: 409,
        error: { code: "USER_EXISTS", message: "user already registered" }
      };
    }
    throw err;
  }

  const stored: StoredUserRow = {
    id,
    tenant_id: input.tenantId,
    email,
    password_hash,
    roles,
    profile,
    created_at: now,
    updated_at: now,
  };

  return {
    success: true,
    user: toUserProfile(stored)
  };
}

export interface AuthenticateUserInput {
  tenantId: string;
  email: string;
  password: string;
}

export async function authenticateUser(env: any, input: AuthenticateUserInput): Promise<UserProfile | null> {
  const email = normalizeEmail(input.email);
  const stored = await getStoredUser(env, input.tenantId, email);
  if (!stored) return null;
  const isValid = await verifyPassword(input.password, stored.password_hash);
  if (!isValid) return null;
  return toUserProfile(stored);
}

export async function getUserByEmail(env: any, tenantId: string, email: string): Promise<UserProfile | null> {
  const stored = await getStoredUser(env, tenantId, normalizeEmail(email));
  return stored ? toUserProfile(stored) : null;
}

async function getStoredUser(env: any, tenantId: string, email: string): Promise<StoredUserRow | null> {
  const result = await env.DB.prepare(
    `SELECT id, tenant_id, email, password_hash, roles, profile, created_at, updated_at
     FROM auth_users
     WHERE tenant_id = ? AND email = ?
     LIMIT 1`
  ).bind(tenantId, email).first();

  if (!result) return null;

  return {
    id: result.id,
    tenant_id: result.tenant_id,
    email: result.email,
    password_hash: result.password_hash,
    roles: result.roles,
    profile: result.profile ?? null,
    created_at: Number(result.created_at),
    updated_at: Number(result.updated_at)
  };
}

function toUserProfile(row: StoredUserRow): UserProfile {
  let roles: string[] = [];
  try {
    const parsed = JSON.parse(row.roles);
    roles = Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    roles = [];
  }

  let profile: Record<string, unknown> | null = null;
  if (row.profile) {
    try {
      const parsed = JSON.parse(row.profile);
      profile = parsed && typeof parsed === "object" ? parsed : null;
    } catch {
      profile = null;
    }
  }

  return {
    id: row.id,
    tenant_id: row.tenant_id,
    email: row.email,
    roles,
    profile,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function normalizeRoles(roles?: string[]) {
  if (!roles || !Array.isArray(roles) || roles.length === 0) {
    return ["tenant_member"];
  }
  const sanitized = new Set<string>();
  for (const role of roles) {
    if (typeof role === "string" && role.trim()) {
      sanitized.add(role.trim());
    }
  }
  return Array.from(sanitized.values());
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function generateSalt(size = 16) {
  const bytes = new Uint8Array(size);
  crypto.getRandomValues(bytes);
  return toBase64(bytes);
}

function toBase64(bytes: Uint8Array): string {
  if (typeof btoa === "function") {
    let binary = "";
    bytes.forEach((b) => { binary += String.fromCharCode(b); });
    return btoa(binary);
  }

  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  let output = "";
  let i = 0;

  while (i < bytes.length) {
    const byte1 = bytes[i++]!;
    const byte2 = i < bytes.length ? bytes[i++] : undefined;
    const byte3 = i < bytes.length ? bytes[i++] : undefined;

    const enc1 = byte1 >> 2;
    const enc2 = ((byte1 & 3) << 4) | ((byte2 ?? 0) >> 4);
    const enc3 = ((byte2 ?? 0 & 15) << 2) | ((byte3 ?? 0) >> 6);
    const enc4 = (byte3 ?? 0) & 63;

    if (byte2 === undefined) {
      output += chars.charAt(enc1) + chars.charAt(enc2) + "==";
    } else if (byte3 === undefined) {
      output += chars.charAt(enc1) + chars.charAt(enc2) + chars.charAt(enc3) + "=";
    } else {
      output +=
        chars.charAt(enc1) +
        chars.charAt(enc2) +
        chars.charAt(enc3) +
        chars.charAt(enc4);
    }
  }

  return output;
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

export async function hashPassword(password: string, salt?: string): Promise<string> {
  const normalizedSalt = salt || generateSalt();
  const data = new TextEncoder().encode(normalizedSalt + ":" + password);
  const digest = await crypto.subtle.digest("SHA-256", data);
  const digestB64 = toBase64(new Uint8Array(digest));
  return `${normalizedSalt}:${digestB64}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  if (!stored) return false;
  const parts = stored.split(":");
  if (parts.length !== 2) return false;
  const [salt, hash] = parts;
  const recalculated = await hashPassword(password, salt);
  const recalculatedHash = recalculated.split(":")[1];
  return timingSafeEqual(hash, recalculatedHash);
}

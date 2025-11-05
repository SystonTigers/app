// lib/api.ts
// Lightweight API client helpers for calling backend routes

export class ApiError extends Error {
  status: number;
  code?: string;
  details?: unknown;

  constructor(message: string, init: { status: number; code?: string; details?: unknown }) {
    super(message);
    this.name = 'ApiError';
    this.status = init.status;
    this.code = init.code;
    this.details = init.details;
  }
}

function buildUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }
  const base = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8787';
  const normalizedBase = base.endsWith('/') ? base.slice(0, -1) : base;
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${normalizedBase}${normalizedPath}`;
}

export interface ApiFetchOptions extends RequestInit {
  json?: Record<string, unknown>;
}

function compactJson(payload: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(payload)) {
    if (value === undefined || value === null) continue;
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!trimmed) continue;
      result[key] = trimmed;
      continue;
    }
    result[key] = value;
  }
  return result;
}

export async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const { json, headers, ...rest } = options;
  const requestHeaders = new Headers(headers);

  const init: RequestInit = {
    ...rest,
    headers: requestHeaders,
  };

  if (json !== undefined) {
    if (!requestHeaders.has('Content-Type')) {
      requestHeaders.set('Content-Type', 'application/json');
    }
    init.body = JSON.stringify(compactJson(json));
  } else if (init.body && !(init.body instanceof FormData) && !requestHeaders.has('Content-Type')) {
    requestHeaders.set('Content-Type', 'application/json');
  }

  const response = await fetch(buildUrl(path), init);
  const text = await response.text();
  let parsed: any = null;

  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = text;
    }
  }

  const success = typeof parsed === 'object' && parsed !== null ? parsed.success : undefined;

  if (!response.ok || success === false) {
    const message =
      (typeof parsed === 'object' && parsed?.error?.message) ||
      response.statusText ||
      'Request failed';
    const code = typeof parsed === 'object' ? parsed?.error?.code : undefined;
    throw new ApiError(message, {
      status: response.status,
      code,
      details: parsed,
    });
  }

  if (typeof parsed === 'object' && parsed !== null && 'data' in parsed) {
    return parsed.data as T;
  }

  return parsed as T;
}

export interface MagicLinkRequest {
  email: string;
  tenant?: string;
  redirectUrl?: string;
}

export interface MagicLinkResponse {
  message?: string;
  expiresAt?: string;
}

export async function requestMagicLink({
  email,
  tenant,
  redirectUrl,
}: MagicLinkRequest): Promise<MagicLinkResponse> {
  const payload: Record<string, unknown> = {
    email: email.trim().toLowerCase(),
  };

  if (tenant) {
    payload.tenantId = tenant.trim().toLowerCase();
  }

  if (redirectUrl) {
    payload.redirectUrl = redirectUrl;
  }

  return apiFetch<MagicLinkResponse>('/api/v1/auth/magic-link', {
    method: 'POST',
    json: payload,
  });
}

export interface PasswordLoginRequest {
  email: string;
  password: string;
  tenant?: string;
}

export interface PasswordLoginResponse {
  token: string;
  tenantId: string;
  redirectUrl?: string;
  expiresAt?: string;
  [key: string]: unknown;
}

export async function loginWithPassword({
  email,
  password,
  tenant,
}: PasswordLoginRequest): Promise<PasswordLoginResponse> {
  const payload: Record<string, unknown> = {
    email: email.trim().toLowerCase(),
    password,
    device: 'web-admin',
  };

  if (tenant) {
    payload.tenantId = tenant.trim().toLowerCase();
  }

  return apiFetch<PasswordLoginResponse>('/api/v1/auth/login', {
    method: 'POST',
    json: payload,
  });
}

export interface SignupRequest {
  clubName: string;
  clubShortName: string;
  contactEmail: string;
  contactName: string;
  locale?: string;
  timezone?: string;
  plan?: 'free' | 'managed' | 'enterprise';
  makeWebhookUrl?: string;
  promoCode?: string;
}

export interface SignupResponse {
  id: string;
  name?: string;
  adminJWT?: string;
  automationJWT?: string;
  setupUrl?: string;
  adminConsoleUrl?: string;
  [key: string]: unknown;
}

/**
 * @deprecated Use the new 3-step signup flow (signupStart, signupBrand, signupStarterMake/signupProConfirm) instead
 */
export async function signupTenant(request: SignupRequest): Promise<SignupResponse> {
  const payload: Record<string, unknown> = {
    clubName: request.clubName,
    clubShortName: request.clubShortName,
    contactEmail: request.contactEmail.trim().toLowerCase(),
    contactName: request.contactName,
  };

  if (request.locale) payload.locale = request.locale;
  if (request.timezone) payload.timezone = request.timezone;
  if (request.plan) payload.plan = request.plan;
  if (request.makeWebhookUrl) payload.makeWebhookUrl = request.makeWebhookUrl;
  if (request.promoCode) payload.promoCode = request.promoCode;

  return apiFetch<SignupResponse>('/api/v1/signup', {
    method: 'POST',
    json: payload,
  });
}

// ========================================
// NEW 3-STEP AUTOMATED SIGNUP FLOW
// ========================================

export interface SignupStartRequest {
  clubName: string;
  clubSlug: string;
  email: string;
  plan: 'starter' | 'pro';
  promoCode?: string;
}

export interface SignupStartResponse {
  jwt: string;
  tenant: {
    id: string;
    slug: string;
    name: string;
    email: string;
    plan: string;
    status: string;
  };
}

export async function signupStart(request: SignupStartRequest): Promise<SignupStartResponse> {
  const payload: Record<string, unknown> = {
    clubName: request.clubName.trim(),
    clubSlug: request.clubSlug.trim().toLowerCase(),
    email: request.email.trim().toLowerCase(),
    plan: request.plan,
  };

  if (request.promoCode) {
    payload.promoCode = request.promoCode.trim();
  }

  return apiFetch<SignupStartResponse>('/public/signup/start', {
    method: 'POST',
    json: payload,
  });
}

export interface SignupBrandRequest {
  primaryColor: string;
  secondaryColor: string;
}

export interface SignupBrandResponse {
  success: boolean;
}

export async function signupBrand(
  jwt: string,
  request: SignupBrandRequest
): Promise<SignupBrandResponse> {
  const payload: Record<string, unknown> = {
    primaryColor: request.primaryColor.trim(),
    secondaryColor: request.secondaryColor.trim(),
  };

  return apiFetch<SignupBrandResponse>('/public/signup/brand', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${jwt}`,
    },
    json: payload,
  });
}

export interface SignupStarterMakeRequest {
  webhookUrl: string;
  webhookSecret: string;
}

export interface SignupStarterMakeResponse {
  success: boolean;
}

export async function signupStarterMake(
  jwt: string,
  request: SignupStarterMakeRequest
): Promise<SignupStarterMakeResponse> {
  const payload: Record<string, unknown> = {
    webhookUrl: request.webhookUrl.trim(),
    webhookSecret: request.webhookSecret.trim(),
  };

  return apiFetch<SignupStarterMakeResponse>('/public/signup/starter/make', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${jwt}`,
    },
    json: payload,
  });
}

export interface SignupProConfirmResponse {
  success: boolean;
}

export async function signupProConfirm(jwt: string): Promise<SignupProConfirmResponse> {
  return apiFetch<SignupProConfirmResponse>('/public/signup/pro/confirm', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${jwt}`,
    },
  });
}

export interface ProvisionStatusResponse {
  status: 'pending' | 'processing' | 'completed' | 'failed';
  plan: string;
  completedAt?: string;
  error?: string;
  steps?: {
    name: string;
    status: 'pending' | 'completed' | 'failed';
    completedAt?: string;
    error?: string;
  }[];
}

export async function getProvisionStatus(
  jwt: string,
  tenantId: string
): Promise<ProvisionStatusResponse> {
  return apiFetch<ProvisionStatusResponse>(`/api/v1/tenants/${tenantId}/provision-status`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${jwt}`,
    },
  });
}

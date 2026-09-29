import { NextResponse } from 'next/server';
import { backendBase, cookieOptions, OWNER_COOKIE, sameOrigin } from '@/lib/owner/proxy';

/** Owner panel sign-in: checks the password on the backend and keeps the session in an HttpOnly cookie. */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return NextResponse.json({ success: false, error: { message: 'Not allowed.' } }, { status: 403 });
  const body = (await req.json().catch(() => null)) as { email?: unknown; password?: unknown } | null;
  if (typeof body?.email !== 'string' || typeof body.password !== 'string') {
    return NextResponse.json({ success: false, error: { message: 'Enter your email and password.' } }, { status: 400 });
  }
  let res: Response;
  try {
    res = await fetch(`${backendBase()}/api/v1/owner/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: body.email, password: body.password }),
    });
  } catch {
    return NextResponse.json({ success: false, error: { message: "Couldn't reach the server. Try again." } }, { status: 502 });
  }
  const data = (await res.json().catch(() => null)) as { success?: boolean; data?: { token: string; email: string; expiresAt: number }; error?: { message?: string } } | null;
  if (!res.ok || !data?.success || !data.data?.token) {
    return NextResponse.json({ success: false, error: { message: data?.error?.message || "That email and password don't match." } }, { status: res.ok ? 401 : res.status });
  }
  const out = NextResponse.json({ success: true, data: { email: data.data.email } });
  out.cookies.set(OWNER_COOKIE, data.data.token, cookieOptions((data.data.expiresAt - Date.now()) / 1000));
  return out;
}

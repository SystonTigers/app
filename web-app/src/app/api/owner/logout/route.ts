import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { backendBase, cookieOptions, OWNER_COOKIE, sameOrigin } from '@/lib/owner/proxy';

/** Ends the owner session on the backend (the token is revoked) and clears the cookie. */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return NextResponse.json({ success: false }, { status: 403 });
  const token = (await cookies()).get(OWNER_COOKIE)?.value;
  if (token) {
    await fetch(`${backendBase()}/api/v1/owner/logout`, { method: 'POST', headers: { authorization: `Bearer ${token}` } }).catch(() => undefined);
  }
  const out = NextResponse.json({ success: true });
  out.cookies.set(OWNER_COOKIE, '', cookieOptions(0));
  return out;
}

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { backendBase, cookieOptions, OWNER_COOKIE, ownerBackendPath, ownerQuery, sameOrigin } from '@/lib/owner/proxy';

type Ctx = { params: Promise<{ path: string[] }> };

const fail = (status: number, message: string) => NextResponse.json({ success: false, error: { message } }, { status });

/** Forwards the owner panel's own calls to the backend with the session from the cookie. */
async function forward(req: Request, ctx: Ctx): Promise<Response> {
  const { path } = await ctx.params;
  const target = ownerBackendPath(req.method, path ?? []);
  if (!target) return fail(404, 'Not found.');
  if (req.method !== 'GET' && !sameOrigin(req)) return fail(403, 'Not allowed.');
  const token = (await cookies()).get(OWNER_COOKIE)?.value;
  if (!token) return fail(401, 'Please sign in.');

  let res: Response;
  try {
    res = await fetch(`${backendBase()}${target}${req.method === 'GET' ? ownerQuery(new URL(req.url).searchParams) : ''}`, {
      method: req.method,
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: req.method === 'GET' ? undefined : await req.text(),
      cache: 'no-store',
    });
  } catch {
    return fail(502, "Couldn't reach the server. Try again.");
  }
  const out = new NextResponse(await res.text(), {
    status: res.status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });
  // An ended session: drop the cookie so the next page load goes straight to sign-in
  if (res.status === 401) out.cookies.set(OWNER_COOKIE, '', cookieOptions(0));
  return out;
}

export const GET = forward;
export const POST = forward;

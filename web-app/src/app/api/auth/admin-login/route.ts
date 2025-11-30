import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { email, password, token } = await req.json();

  // If you already have a JWT (e.g., from your generator), allow direct cookie set:
  if (token) {
    const res = NextResponse.json({ ok: true, mode: 'token' });
    res.cookies.set('admin_jwt', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });
    return res;
  }

  // Normal password login via backend
  const r = await fetch(process.env.BACKEND_API_BASE! + '/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!r.ok) {
    const msg = await r.text().catch(() => '');
    return new NextResponse(msg || 'Unauthorized', { status: 401 });
  }

  const { jwt } = await r.json(); // backend returns { jwt }
  const res = NextResponse.json({ ok: true, mode: 'password' });
  res.cookies.set('admin_jwt', jwt, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  });
  return res;
}

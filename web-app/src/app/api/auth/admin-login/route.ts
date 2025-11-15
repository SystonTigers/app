import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { email, password, token } = await req.json();
  const r = await fetch((process.env.BACKEND_API_BASE! + '/api/v1/admin/login'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, token })
  });
  if (!r.ok) return new NextResponse('Unauthorized', { status: 401 });

  const { jwt } = await r.json(); // backend returns { jwt }
  const res = NextResponse.json({ ok: true });
  res.cookies.set('admin_jwt', jwt, {
    httpOnly: true, secure: false, sameSite: 'lax', path: '/', maxAge: 60*60*24*7
  });
  return res;
}

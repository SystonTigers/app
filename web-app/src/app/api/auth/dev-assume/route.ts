import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const t = req.nextUrl.searchParams.get('t');
  if (!t) return new NextResponse('Missing token', { status: 400 });

  const res = NextResponse.redirect(new URL('/admin', req.url));
  const isLocal = process.env.NODE_ENV !== 'production';
  res.cookies.set('admin_jwt', t, {
    httpOnly: true,
    secure: !isLocal,
    sameSite: 'lax',
    path: '/',
    maxAge: 60*60*24*7
  });
  return res;
}

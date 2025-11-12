import { NextRequest } from 'next/server';

const backend = process.env.BACKEND_API_BASE!;

function joinURL(base: string, path: string) {
  return `${base.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const target = joinURL(backend, path.join('/')) + req.nextUrl.search;
  const res = await fetch(target, {
    method: 'GET',
    headers: {
      // forward auth from browser
      'authorization': req.headers.get('authorization') || '',
      'content-type': req.headers.get('content-type') || '',
    },
    redirect: 'manual',
  });
  return new Response(res.body, { status: res.status, headers: res.headers });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const target = joinURL(backend, path.join('/')) + req.nextUrl.search;
  const body = await req.text();
  const res = await fetch(target, {
    method: 'POST',
    headers: {
      'authorization': req.headers.get('authorization') || '',
      'content-type': req.headers.get('content-type') || 'application/json',
    },
    body,
    redirect: 'manual',
  });
  return new Response(res.body, { status: res.status, headers: res.headers });
}

export async function PUT(req: NextRequest, ctx: any)  { return POST(req, ctx); }
export async function PATCH(req: NextRequest, ctx: any){ return POST(req, ctx); }
export async function DELETE(req: NextRequest, ctx: any){ return POST(req, ctx); }

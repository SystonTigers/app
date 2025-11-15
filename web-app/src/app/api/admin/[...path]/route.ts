import { NextRequest } from 'next/server';

const backend = process.env.BACKEND_API_BASE!;
const join = (a: string, b: string) => `${a.replace(/\/+$/,'')}/${b.replace(/^\/+/,'')}`;

async function forward(req: NextRequest, method: string, path: string[], withBody = false) {
  const target = join(backend, path.join('/')) + req.nextUrl.search;

  // Pull admin JWT from cookie and forward as Bearer
  const cookieToken = req.cookies.get('admin_jwt')?.value;
  const headers: Record<string,string> = {};
  if (cookieToken) headers['Authorization'] = `Bearer ${cookieToken}`;

  const init: RequestInit = { method, headers };
  if (withBody) init.body = await req.text();

  const res = await fetch(target, init);
  return new Response(res.body, { status: res.status, headers: res.headers });
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params; return forward(req, 'GET', path);
}
export async function POST(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params; return forward(req, 'POST', path, true);
}
export async function PUT(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params; return forward(req, 'PUT', path, true);
}
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params; return forward(req, 'PATCH', path, true);
}
export async function DELETE(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params; return forward(req, 'DELETE', path);
}
export const dynamic = 'force-dynamic';

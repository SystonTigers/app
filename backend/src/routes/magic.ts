// backend/src/routes/magic.ts
import type { Env } from '../types';
import { json } from '../lib/validate';
import { SignJWT, jwtVerify } from 'jose';
import { sendMagicLinkEmail } from '../lib/email';

// POST /auth/magic/start  { email, tenantId? }
export async function handleMagicStart(req: Request, env: Env, corsHdrs?: Headers): Promise<Response> {
  const body = await req.json().catch(()=>({}));
  const email = (body.email || '').toString().trim().toLowerCase();
  const tenantId = (body.tenantId || 'platform').toString().trim(); // Default to 'platform' for admin login
  if (!email) return json({ success:false, error:'email required' }, 400);

  // Get tenant name from database for personalized email
  let clubName = 'Platform Admin'; // Default for platform admin
  if (tenantId && tenantId !== 'platform') {
    try {
      const row = await env.DB.prepare('SELECT name FROM tenants WHERE id = ?')
        .bind(tenantId)
        .first<{ name: string }>();
      if (row?.name) {
        clubName = row.name;
      }
    } catch (error) {
      console.warn('[Magic] Could not fetch tenant name:', error);
    }
  }

  // Generate token (24h)
  const now = Math.floor(Date.now()/1000);
  const token = await new SignJWT({ type:'magic_link', roles:['owner','admin'], tenantId })
    .setProtectedHeader({ alg:'HS256', typ:'JWT' })
    .setIssuer(env.JWT_ISSUER || 'syston.app')
    .setAudience('syston-admin')
    .setSubject(email)
    .setIssuedAt(now)
    .setExpirationTime(now + 24*3600)
    .sign(new TextEncoder().encode(env.JWT_SECRET));

  const link = `${env.ADMIN_CONSOLE_URL}/admin/onboard?token=${token}`;

  // Send magic link email
  const emailResult = await sendMagicLinkEmail(email, link, clubName, env);

  if (emailResult.success) {
    console.log(`[Magic] Email sent to ${email} (messageId: ${emailResult.messageId})`);
  } else {
    console.error(`[Magic] Email send failed for ${email}:`, emailResult.error);
    // Don't fail the request - link is still logged and can be manually shared
  }

  return json({ success:true }, 200, corsHdrs);
}

// GET /auth/magic/verify?token=...
export async function handleMagicVerify(req: Request, env: Env, corsHdrs?: Headers): Promise<Response> {
  const token = new URL(req.url).searchParams.get('token') || '';
  if (!token) return json({ success:false, error:'token required' }, 400, corsHdrs);

  const { payload } = await jwtVerify(token, new TextEncoder().encode(env.JWT_SECRET), {
    issuer: env.JWT_ISSUER || 'syston.app',
    audience: 'syston-admin',
    clockTolerance: 10,
  });

  // Create owner session JWT (shorter ttl, e.g. 7d)
  const now = Math.floor(Date.now()/1000);
  const session = await new SignJWT({
    roles: ['owner','admin'],
    tenantId: payload.tenantId,
  })
    .setProtectedHeader({ alg:'HS256', typ:'JWT' })
    .setIssuer(env.JWT_ISSUER || 'syston.app')
    .setAudience('syston-admin')
    .setSubject(payload.sub as string)
    .setIssuedAt(now)
    .setExpirationTime(now + 7*24*3600)
    .sign(new TextEncoder().encode(env.JWT_SECRET));

  const hdrs = new Headers(corsHdrs || {});
  hdrs.set('content-type', 'application/json');
  // HttpOnly cookie for browser
  hdrs.append('Set-Cookie', `owner_session=${session}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${7*24*3600}`);
  return new Response(JSON.stringify({ success:true, tenantId: payload.tenantId }), { status:200, headers: hdrs });
}

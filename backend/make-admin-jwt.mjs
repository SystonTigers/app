import { SignJWT } from 'jose';

const run = async () => {
  // Use the actual JWT_SECRET from .dev.vars, decoded from base64 (same as backend)
  const raw = process.env.JWT_SECRET || '6e4f7eb3357f1f2f9b46a6097a93a58c8643fa642caa904c05eb0b52c62985a5';
  let secret;
  try {
    // Try base64 decode first (same logic as backend getJwtSecret)
    secret = Uint8Array.from(atob(raw), c => c.charCodeAt(0));
  } catch {
    // Fallback to plain text
    secret = new TextEncoder().encode(raw);
  }

  const jwt = await new SignJWT({
    sub: 'systontowntigersfc@gmail.com',
    tenant_id: 'tenant_syston_2024',
    roles: ['admin', 'tenant_admin', 'platform_admin'],
    iss: 'syston.app',
    aud: 'syston-admin'
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secret);

  console.log('\n🔑 Admin JWT Token:\n');
  console.log(jwt);
  console.log('\n📋 To use: Visit this URL in your browser:\n');
  console.log(`http://localhost:3000/api/auth/dev-assume?t=${jwt}`);
  console.log('\n✅ This will set the admin cookie and redirect to /admin\n');
};

run().catch(console.error);

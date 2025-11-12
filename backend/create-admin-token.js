// Create admin JWT token
import { SignJWT } from 'jose';

const JWT_SECRET = '6e4f7eb3357f1f2f9b46a6097a93a58c8643fa642caa904c05eb0b52c62985a5';
const email = 'systontowntigersfc@gmail.com';

async function createToken() {
  const secret = new TextEncoder().encode(JWT_SECRET);
  const now = Math.floor(Date.now() / 1000);
  const exp = now + (7 * 24 * 60 * 60); // 7 days

  const token = await new SignJWT({
    sub: email,
    roles: ['admin']
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuer('syston.app')
    .setAudience('syston-mobile')
    .setIssuedAt(now)
    .setExpirationTime(exp)
    .sign(secret);

  console.log('\n=== ADMIN JWT TOKEN ===');
  console.log(token);
  console.log('\n=== Copy this token and paste it in your browser console: ===');
  console.log(`localStorage.setItem('admin_token', '${token}');`);
  console.log('\nThen refresh the admin page.\n');
}

createToken().catch(console.error);

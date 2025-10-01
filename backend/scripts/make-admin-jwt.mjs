// scripts/make-admin-jwt.mjs
import { SignJWT } from "jose";

const secret = process.env.JWT_SECRET;
if (!secret) {
  console.error("Set JWT_SECRET env var first (same value you stored with wrangler).");
  process.exit(1);
}

const key = new TextEncoder().encode(secret);

// expire in ~180 days (in seconds)
const now = Math.floor(Date.now() / 1000);
const exp = now + 180 * 24 * 60 * 60;

const payload = {
  iss: "syston.app",
  aud: "syston-mobile",
  sub: "admin-user",
  tenantId: "system",
  role: "admin",
  iat: now,
  exp
};

const token = await new SignJWT(payload)
  .setProtectedHeader({ alg: "HS256", typ: "JWT" })
  .sign(key);

console.log(token);

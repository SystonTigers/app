// scripts/make-admin-jwt.mjs
import { SignJWT } from "jose";

const raw = process.env.JWT_SECRET || "";
if (!raw) {
  console.error("ERROR: JWT_SECRET env var is required in this shell (same value as wrangler secret).");
  process.exit(1);
}

// Accept either plain text or base64. Try both.
let secretBytes;
try {
  secretBytes = Uint8Array.from(atob(raw), c => c.charCodeAt(0));
} catch {
  secretBytes = new TextEncoder().encode(raw);
}

const now = Math.floor(Date.now() / 1000);
const exp = now + 60 * 60 * 24 * 180; // 180 days

const payload = {
  iss: "syston.app",
  aud: "syston-mobile",
  sub: "admin-user",
  tenant_id: "system",
  roles: ["admin"], // IMPORTANT: array
  iat: now,
  exp,
};

const token = await new SignJWT(payload)
  .setProtectedHeader({ alg: "HS256" })
  .sign(secretBytes);

console.log(token);

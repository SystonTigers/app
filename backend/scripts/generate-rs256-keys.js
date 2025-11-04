#!/usr/bin/env node

/**
 * Generate RS256 Key Pair for JWT Signing
 *
 * This script generates a new RSA key pair for RS256 JWT signing.
 * Run this once and store the keys securely (e.g., Cloudflare Secrets).
 *
 * Usage:
 *   node scripts/generate-rs256-keys.js
 *
 * Output:
 *   - private_key.pem (keep secret!)
 *   - public_key.pem (can be shared)
 *   - Wrangler secret commands
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

console.log('🔐 Generating RS256 Key Pair...\n');

// Generate RSA key pair
const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: {
    type: 'spki',
    format: 'pem'
  },
  privateKeyEncoding: {
    type: 'pkcs8',
    format: 'pem'
  }
});

// Create keys directory if it doesn't exist
const keysDir = path.join(__dirname, '../keys');
if (!fs.existsSync(keysDir)) {
  fs.mkdirSync(keysDir, { recursive: true });
}

// Write keys to files
const privateKeyPath = path.join(keysDir, 'private_key.pem');
const publicKeyPath = path.join(keysDir, 'public_key.pem');

fs.writeFileSync(privateKeyPath, privateKey);
fs.writeFileSync(publicKeyPath, publicKey);

console.log('✅ Keys generated successfully!\n');
console.log('📁 Private Key:', privateKeyPath);
console.log('📁 Public Key:', publicKeyPath);
console.log('\n⚠️  IMPORTANT: Keep the private key SECRET!\n');

// Display keys
console.log('🔑 Private Key (PEM):');
console.log('─'.repeat(80));
console.log(privateKey);
console.log('─'.repeat(80));
console.log('\n🔓 Public Key (PEM):');
console.log('─'.repeat(80));
console.log(publicKey);
console.log('─'.repeat(80));

// Generate Wrangler secret commands
console.log('\n📋 Wrangler Commands to Set Secrets:');
console.log('─'.repeat(80));

// Escape the private key for shell
const escapedPrivateKey = privateKey.replace(/\n/g, '\\n');
console.log('\n# Set private key (KEEP SECRET!)');
console.log(`npx wrangler secret put JWT_RS256_PRIVATE_KEY <<EOF`);
console.log(privateKey);
console.log('EOF\n');

console.log('# Set public key (can be shared)');
console.log(`npx wrangler secret put JWT_RS256_PUBLIC_KEY <<EOF`);
console.log(publicKey);
console.log('EOF\n');

// Add to wrangler.toml instructions
console.log('─'.repeat(80));
console.log('\n📝 Add to wrangler.toml:');
console.log('─'.repeat(80));
console.log(`
[vars]
JWT_ALGORITHM = "RS256"  # or "HS256" for backwards compatibility

# In production, use secrets instead of vars:
# JWT_RS256_PRIVATE_KEY (secret)
# JWT_RS256_PUBLIC_KEY (secret)
`);

// Environment variable format
console.log('─'.repeat(80));
console.log('\n🌍 Environment Variables Format (.env):');
console.log('─'.repeat(80));
console.log(`
JWT_ALGORITHM=RS256
JWT_RS256_PRIVATE_KEY="${escapedPrivateKey}"
JWT_RS256_PUBLIC_KEY="${publicKey.replace(/\n/g, '\\n')}"
`);

// Security recommendations
console.log('─'.repeat(80));
console.log('\n🛡️  Security Recommendations:');
console.log('─'.repeat(80));
console.log(`
1. NEVER commit private_key.pem to git
2. Add 'keys/' to .gitignore
3. Store private key in Cloudflare Secrets or environment variables
4. Rotate keys every 6-12 months
5. Keep backups of keys in secure vault
6. Public key can be exposed via /api/v1/.well-known/jwks.json
7. Use RS256 for production, HS256 for development
`);

// Add to .gitignore
const gitignorePath = path.join(__dirname, '../.gitignore');
if (fs.existsSync(gitignorePath)) {
  let gitignore = fs.readFileSync(gitignorePath, 'utf8');
  if (!gitignore.includes('keys/')) {
    fs.appendFileSync(gitignorePath, '\n# RS256 JWT Keys\nkeys/\n*.pem\n');
    console.log('\n✅ Added keys/ to .gitignore');
  }
}

console.log('\n🎉 Done! Keys are ready to use.\n');

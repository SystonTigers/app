#!/usr/bin/env node
/**
 * Manual Tenant Provisioning Script
 *
 * Usage:
 *   node scripts/provision-tenant.js
 *
 * Requirements:
 *   - Set SERVICE_JWT_SECRET environment variable
 *   - Set BACKEND_URL environment variable (e.g., https://your-worker.workers.dev)
 *
 * Example:
 *   SERVICE_JWT_SECRET=your-secret BACKEND_URL=https://syston-postbus.team-platform-2025.workers.dev \
 *     node scripts/provision-tenant.js
 */

const crypto = require('crypto');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

// Simple HS256 JWT signing
function signJWT(payload, secret, expiresIn = 300) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);

  const jwtPayload = {
    ...payload,
    iat: now,
    exp: now + expiresIn,
  };

  const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
  const encodedPayload = Buffer.from(JSON.stringify(jwtPayload)).toString('base64url');

  const signature = crypto
    .createHmac('sha256', secret)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest('base64url');

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

async function main() {
  console.log('=== Manual Tenant Provisioning ===\n');

  // Check environment variables
  const secret = process.env.SERVICE_JWT_SECRET || process.env.JWT_SECRET;
  const backendUrl = process.env.BACKEND_URL;

  if (!secret) {
    console.error('❌ Error: SERVICE_JWT_SECRET or JWT_SECRET environment variable is required');
    process.exit(1);
  }

  if (!backendUrl) {
    console.error('❌ Error: BACKEND_URL environment variable is required');
    console.error('   Example: export BACKEND_URL=https://syston-postbus.team-platform-2025.workers.dev');
    process.exit(1);
  }

  // Get tenant details
  const tenantId = await question('Tenant ID (lowercase, alphanumeric with hyphens): ');
  const name = await question('Tenant Name (e.g., "Demo Football Club"): ');
  const contactEmail = await question('Contact Email: ');
  const contactName = await question('Contact Name: ');
  const plan = await question('Plan (starter/pro/enterprise) [starter]: ') || 'starter';
  const primaryColor = await question('Primary Color (optional, e.g., #FF0000): ');
  const secondaryColor = await question('Secondary Color (optional, e.g., #0000FF): ');

  console.log('\n--- Summary ---');
  console.log(`Tenant ID: ${tenantId}`);
  console.log(`Name: ${name}`);
  console.log(`Contact: ${contactName} <${contactEmail}>`);
  console.log(`Plan: ${plan}`);
  if (primaryColor) console.log(`Colors: ${primaryColor} / ${secondaryColor}`);

  const confirm = await question('\nProceed? (yes/no): ');
  if (confirm.toLowerCase() !== 'yes') {
    console.log('Cancelled.');
    rl.close();
    process.exit(0);
  }

  console.log('\n🔐 Generating platform admin JWT...');

  // Create platform admin JWT
  const platformAdminJWT = signJWT(
    {
      roles: ['admin'],
      sub: 'platform-admin',
      iss: process.env.JWT_ISSUER || 'syston.app',
      aud: 'syston-admin'
    },
    secret,
    300 // 5 minutes
  );

  // Prepare request body
  const body = {
    tenantId,
    name,
    contactEmail,
    contactName,
    plan,
  };

  if (primaryColor && secondaryColor) {
    body.primaryColor = primaryColor;
    body.secondaryColor = secondaryColor;
  }

  console.log('📡 Calling backend API...');

  try {
    const response = await fetch(`${backendUrl}/api/v1/admin/tenants/manual`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${platformAdminJWT}`
      },
      body: JSON.stringify(body)
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('\n❌ Error:', response.status, response.statusText);
      console.error(JSON.stringify(data, null, 2));
      rl.close();
      process.exit(1);
    }

    console.log('\n✅ Tenant created successfully!\n');
    console.log('--- Tenant Details ---');
    console.log(JSON.stringify(data.data.tenant, null, 2));
    console.log('\n--- Admin JWT (Share with tenant owner) ---');
    console.log(data.data.adminJWT);
    console.log('\n--- JWT Expires At ---');
    console.log(data.data.expiresAt);
    console.log('\n💡 Tip: The owner can use /whoami endpoint to verify their JWT');

  } catch (error) {
    console.error('\n❌ Network error:', error.message);
    rl.close();
    process.exit(1);
  }

  rl.close();
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

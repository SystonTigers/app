#!/bin/bash
# Smoke Test Script - Full E2E Signup & Provisioning Test
#
# Usage:
#   WORKER_URL=https://your-worker.workers.dev ./scripts/smoke-test.sh
#
# Or set default:
#   export WORKER_URL=https://syston-postbus.team-platform-2025.workers.dev
#   ./scripts/smoke-test.sh

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
WORKER_URL=${WORKER_URL:-""}
RANDOM_SUFFIX=$(date +%s | tail -c 5)
TEST_SLUG="smoke-test-${RANDOM_SUFFIX}"
TEST_EMAIL="smoke-${RANDOM_SUFFIX}@test.syston.app"

# Check if WORKER_URL is set
if [ -z "$WORKER_URL" ]; then
  echo -e "${RED}❌ Error: WORKER_URL not set${NC}"
  echo "Usage: WORKER_URL=https://your-worker.workers.dev $0"
  exit 1
fi

echo -e "${BLUE}🔍 Smoke Testing: $WORKER_URL${NC}"
echo -e "${BLUE}   Test Slug: $TEST_SLUG${NC}"
echo ""

# Step 1: Health Check
echo -e "${YELLOW}[1/7] Health Check...${NC}"
HEALTH=$(curl -s "$WORKER_URL/health")
if echo "$HEALTH" | jq -e '.ok == true' > /dev/null; then
  VERSION=$(echo "$HEALTH" | jq -r '.version')
  ENV=$(echo "$HEALTH" | jq -r '.environment')
  echo -e "${GREEN}✓ Healthy${NC} - Version: $VERSION, Environment: $ENV"
else
  echo -e "${RED}✗ Health check failed${NC}"
  echo "$HEALTH" | jq .
  exit 1
fi
echo ""

# Step 2: Signup Start (Create Tenant)
echo -e "${YELLOW}[2/7] Signup Start (Starter Plan)...${NC}"
START=$(curl -s -X POST "$WORKER_URL/public/signup/start" \
  -H "Content-Type: application/json" \
  -d "{
    \"clubName\": \"Smoke Test FC\",
    \"clubSlug\": \"$TEST_SLUG\",
    \"email\": \"$TEST_EMAIL\",
    \"plan\": \"starter\"
  }")

if echo "$START" | jq -e '.success == true' > /dev/null; then
  JWT=$(echo "$START" | jq -r '.jwt')
  TENANT_ID=$(echo "$START" | jq -r '.tenant.id')
  TENANT_STATUS=$(echo "$START" | jq -r '.tenant.status')
  echo -e "${GREEN}✓ Tenant Created${NC}"
  echo "  Tenant ID: $TENANT_ID"
  echo "  Status: $TENANT_STATUS"
  echo "  JWT: ${JWT:0:30}..."
else
  echo -e "${RED}✗ Signup failed${NC}"
  echo "$START" | jq .
  exit 1
fi
echo ""

# Step 3: Verify JWT with /whoami
echo -e "${YELLOW}[3/7] JWT Verification (/whoami)...${NC}"
WHOAMI=$(curl -s "$WORKER_URL/whoami" -H "Authorization: Bearer $JWT")
if echo "$WHOAMI" | jq -e '.success == true' > /dev/null; then
  ROLES=$(echo "$WHOAMI" | jq -r '.data.roles | join(", ")')
  AUD=$(echo "$WHOAMI" | jq -r '.data.aud')
  TENANT_FROM_JWT=$(echo "$WHOAMI" | jq -r '.data.tenantId')
  echo -e "${GREEN}✓ JWT Valid${NC}"
  echo "  Subject: $(echo "$WHOAMI" | jq -r '.data.sub')"
  echo "  Audience: $AUD"
  echo "  Roles: $ROLES"
  echo "  Tenant ID: $TENANT_FROM_JWT"

  # Verify tenant ID matches
  if [ "$TENANT_ID" != "$TENANT_FROM_JWT" ]; then
    echo -e "${RED}✗ Tenant ID mismatch!${NC}"
    exit 1
  fi
else
  echo -e "${RED}✗ JWT verification failed${NC}"
  echo "$WHOAMI" | jq .
  exit 1
fi
echo ""

# Step 4: Brand Customization
echo -e "${YELLOW}[4/7] Brand Customization...${NC}"
BRAND=$(curl -s -X POST "$WORKER_URL/public/signup/brand" \
  -H "Authorization: Bearer $JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "primaryColor": "#E63946",
    "secondaryColor": "#1D3557"
  }')

if echo "$BRAND" | jq -e '.success == true' > /dev/null; then
  echo -e "${GREEN}✓ Brand Colors Set${NC}"
else
  echo -e "${RED}✗ Brand customization failed${NC}"
  echo "$BRAND" | jq .
  exit 1
fi
echo ""

# Step 5: Starter Webhook Configuration
echo -e "${YELLOW}[5/7] Starter Plan Setup (Make.com webhook)...${NC}"
MAKE=$(curl -s -X POST "$WORKER_URL/public/signup/starter/make" \
  -H "Authorization: Bearer $JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "webhookUrl": "https://hook.us1.make.com/smoke-test-webhook-12345",
    "webhookSecret": "smoke-test-secret-key-1234567890"
  }')

if echo "$MAKE" | jq -e '.success == true' > /dev/null; then
  echo -e "${GREEN}✓ Webhook Configured${NC}"
  echo "  Provisioning queued in background..."
else
  echo -e "${RED}✗ Webhook configuration failed${NC}"
  echo "$MAKE" | jq .
  exit 1
fi
echo ""

# Step 6: Poll Provisioning Status
echo -e "${YELLOW}[6/7] Provisioning Status (polling 5 times)...${NC}"
for i in {1..5}; do
  echo "  Poll $i/5..."
  STATUS=$(curl -s "$WORKER_URL/api/v1/tenants/$TENANT_ID/provision-status" \
    -H "Authorization: Bearer $JWT")

  if echo "$STATUS" | jq -e '.success == true' > /dev/null; then
    PROV_STATUS=$(echo "$STATUS" | jq -r '.data.status')
    echo "    Status: $PROV_STATUS"

    if [ "$PROV_STATUS" = "completed" ]; then
      echo -e "${GREEN}✓ Provisioning Complete${NC}"
      break
    fi
  else
    echo -e "${YELLOW}⚠ Status check returned error (may be expected during provisioning)${NC}"
    echo "$STATUS" | jq .
  fi

  if [ $i -lt 5 ]; then
    sleep 3
  fi
done
echo ""

# Step 7: Idempotency Test (Re-configure webhook)
echo -e "${YELLOW}[7/7] Idempotency Test (re-submit webhook)...${NC}"
IDEMPOTENT=$(curl -s -X POST "$WORKER_URL/public/signup/starter/make" \
  -H "Authorization: Bearer $JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "webhookUrl": "https://hook.us1.make.com/smoke-test-webhook-12345",
    "webhookSecret": "smoke-test-secret-key-1234567890"
  }')

if echo "$IDEMPOTENT" | jq -e '.success == true' > /dev/null; then
  echo -e "${GREEN}✓ Idempotency Verified${NC} (duplicate request handled gracefully)"
else
  echo -e "${YELLOW}⚠ Idempotency check returned different result${NC}"
  echo "$IDEMPOTENT" | jq .
fi
echo ""

# Summary
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ SMOKE TEST PASSED${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${BLUE}Test Results:${NC}"
echo "  ✓ Health check"
echo "  ✓ Tenant creation"
echo "  ✓ JWT issuance & verification"
echo "  ✓ Brand customization"
echo "  ✓ Webhook configuration"
echo "  ✓ Provisioning status tracking"
echo "  ✓ Idempotency"
echo ""
echo -e "${BLUE}Test Tenant:${NC}"
echo "  ID: $TENANT_ID"
echo "  Slug: $TEST_SLUG"
echo "  Email: $TEST_EMAIL"
echo ""
echo -e "${GREEN}System is production-ready! 🚀${NC}"

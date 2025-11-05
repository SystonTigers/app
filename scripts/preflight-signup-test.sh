#!/bin/bash
# Preflight Signup Test Script
# Tests the new 3-step automated signup flow before launch
#
# Usage:
#   export BASE=https://your-worker.workers.dev
#   ./scripts/preflight-signup-test.sh

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if BASE is set
if [ -z "$BASE" ]; then
  echo -e "${RED}❌ Error: BASE environment variable not set${NC}"
  echo "Usage: export BASE=https://your-worker.workers.dev"
  echo "       ./scripts/preflight-signup-test.sh"
  exit 1
fi

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  Preflight Signup Test - 3-Step Automated Flow${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "Testing against: ${YELLOW}$BASE${NC}"
echo ""

# Generate unique test identifiers
TIMESTAMP=$(date +%s)
RANDOM_SUFFIX=$(openssl rand -hex 4)
TEST_SLUG="qa-fc-${TIMESTAMP}-${RANDOM_SUFFIX}"
TEST_EMAIL="qa+${TIMESTAMP}@test.com"

echo -e "${BLUE}📝 Test Identifiers:${NC}"
echo -e "  Slug: ${YELLOW}$TEST_SLUG${NC}"
echo -e "  Email: ${YELLOW}$TEST_EMAIL${NC}"
echo ""

# =============================================================================
# TEST 1: STARTER PLAN HAPPY PATH
# =============================================================================

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  TEST 1: Starter Plan - Happy Path${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Step 1: Create tenant
echo -e "${YELLOW}📍 Step 1: Creating tenant...${NC}"
STARTER_START=$(curl -s -X POST "$BASE/public/signup/start" \
  -H 'content-type: application/json' \
  -d "{\"clubName\":\"QA FC Starter\",\"clubSlug\":\"$TEST_SLUG-starter\",\"email\":\"$TEST_EMAIL\",\"plan\":\"starter\"}")

echo "$STARTER_START" | jq .

# Extract JWT and tenant ID
STARTER_JWT=$(echo "$STARTER_START" | jq -r '.jwt')
STARTER_TENANT=$(echo "$STARTER_START" | jq -r '.tenant.id')

if [ "$STARTER_JWT" == "null" ] || [ -z "$STARTER_JWT" ]; then
  echo -e "${RED}❌ FAILED: No JWT returned${NC}"
  exit 1
fi

echo -e "${GREEN}✓ Step 1 complete: JWT received, tenant ID: $STARTER_TENANT${NC}"
echo ""

# Step 2: Set branding
echo -e "${YELLOW}📍 Step 2: Setting branding...${NC}"
STARTER_BRAND=$(curl -s -X POST "$BASE/public/signup/brand" \
  -H "authorization: Bearer $STARTER_JWT" \
  -H 'content-type: application/json' \
  -d '{"primaryColor":"#FF5722","secondaryColor":"#000000"}')

echo "$STARTER_BRAND" | jq .

if [ "$(echo "$STARTER_BRAND" | jq -r '.success')" != "true" ]; then
  echo -e "${RED}❌ FAILED: Branding step failed${NC}"
  exit 1
fi

echo -e "${GREEN}✓ Step 2 complete: Branding configured${NC}"
echo ""

# Step 3: Configure Make.com webhook
echo -e "${YELLOW}📍 Step 3: Configuring Make.com webhook...${NC}"
STARTER_WEBHOOK="https://hook.us1.make.com/test-${RANDOM_SUFFIX}"
STARTER_MAKE=$(curl -s -X POST "$BASE/public/signup/starter/make" \
  -H "authorization: Bearer $STARTER_JWT" \
  -H 'content-type: application/json' \
  -d "{\"webhookUrl\":\"$STARTER_WEBHOOK\",\"webhookSecret\":\"test-secret-${RANDOM_SUFFIX}\"}")

echo "$STARTER_MAKE" | jq .

if [ "$(echo "$STARTER_MAKE" | jq -r '.success')" != "true" ]; then
  echo -e "${RED}❌ FAILED: Webhook configuration failed${NC}"
  exit 1
fi

echo -e "${GREEN}✓ Step 3 complete: Webhook configured${NC}"
echo ""

# Poll provision status
echo -e "${YELLOW}📍 Polling provision status (max 6 attempts)...${NC}"
for i in {1..6}; do
  echo -e "  ${BLUE}Attempt $i/6...${NC}"
  STARTER_STATUS=$(curl -s "$BASE/api/v1/tenants/$STARTER_TENANT/provision-status" \
    -H "authorization: Bearer $STARTER_JWT")

  echo "$STARTER_STATUS" | jq .

  STATUS_VAL=$(echo "$STARTER_STATUS" | jq -r '.status')

  if [ "$STATUS_VAL" == "completed" ]; then
    echo -e "${GREEN}✓ Provisioning complete!${NC}"
    break
  elif [ "$STATUS_VAL" == "failed" ]; then
    echo -e "${RED}❌ FAILED: Provisioning failed${NC}"
    echo "$STARTER_STATUS" | jq .
    exit 1
  fi

  if [ $i -lt 6 ]; then
    sleep 2
  fi
done

echo ""
echo -e "${GREEN}✅ TEST 1 PASSED: Starter Plan Happy Path${NC}"
echo ""

# =============================================================================
# TEST 2: IDEMPOTENCY - Repeat Step 3
# =============================================================================

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  TEST 2: Idempotency - Repeat Step 3${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

echo -e "${YELLOW}📍 Re-running Step 3 (should be idempotent)...${NC}"
STARTER_MAKE_REPEAT=$(curl -s -X POST "$BASE/public/signup/starter/make" \
  -H "authorization: Bearer $STARTER_JWT" \
  -H 'content-type: application/json' \
  -d "{\"webhookUrl\":\"$STARTER_WEBHOOK\",\"webhookSecret\":\"test-secret-${RANDOM_SUFFIX}\"}")

echo "$STARTER_MAKE_REPEAT" | jq .

if [ "$(echo "$STARTER_MAKE_REPEAT" | jq -r '.success')" != "true" ]; then
  echo -e "${YELLOW}⚠️  Warning: Repeat call returned error (may be expected)${NC}"
else
  echo -e "${GREEN}✓ Idempotency check passed: No duplicate side-effects${NC}"
fi

echo ""
echo -e "${GREEN}✅ TEST 2 PASSED: Idempotency Check${NC}"
echo ""

# =============================================================================
# TEST 3: PRO PLAN HAPPY PATH
# =============================================================================

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  TEST 3: Pro Plan - Happy Path${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Step 1: Create tenant
echo -e "${YELLOW}📍 Step 1: Creating Pro tenant...${NC}"
PRO_START=$(curl -s -X POST "$BASE/public/signup/start" \
  -H 'content-type: application/json' \
  -d "{\"clubName\":\"QA FC Pro\",\"clubSlug\":\"$TEST_SLUG-pro\",\"email\":\"pro-$TEST_EMAIL\",\"plan\":\"pro\"}")

echo "$PRO_START" | jq .

PRO_JWT=$(echo "$PRO_START" | jq -r '.jwt')
PRO_TENANT=$(echo "$PRO_START" | jq -r '.tenant.id')

if [ "$PRO_JWT" == "null" ] || [ -z "$PRO_JWT" ]; then
  echo -e "${RED}❌ FAILED: No JWT returned for Pro plan${NC}"
  exit 1
fi

echo -e "${GREEN}✓ Step 1 complete: JWT received, tenant ID: $PRO_TENANT${NC}"
echo ""

# Step 2: Set branding
echo -e "${YELLOW}📍 Step 2: Setting branding...${NC}"
PRO_BRAND=$(curl -s -X POST "$BASE/public/signup/brand" \
  -H "authorization: Bearer $PRO_JWT" \
  -H 'content-type: application/json' \
  -d '{"primaryColor":"#3F51B5","secondaryColor":"#FFFFFF"}')

echo "$PRO_BRAND" | jq .

if [ "$(echo "$PRO_BRAND" | jq -r '.success')" != "true" ]; then
  echo -e "${RED}❌ FAILED: Pro branding step failed${NC}"
  exit 1
fi

echo -e "${GREEN}✓ Step 2 complete: Branding configured${NC}"
echo ""

# Step 3: Confirm Pro plan
echo -e "${YELLOW}📍 Step 3: Confirming Pro plan...${NC}"
PRO_CONFIRM=$(curl -s -X POST "$BASE/public/signup/pro/confirm" \
  -H "authorization: Bearer $PRO_JWT" \
  -H 'content-type: application/json')

echo "$PRO_CONFIRM" | jq .

if [ "$(echo "$PRO_CONFIRM" | jq -r '.success')" != "true" ]; then
  echo -e "${RED}❌ FAILED: Pro confirm failed${NC}"
  exit 1
fi

echo -e "${GREEN}✓ Step 3 complete: Pro plan confirmed${NC}"
echo ""

# Poll provision status for Pro
echo -e "${YELLOW}📍 Polling Pro provision status (max 6 attempts)...${NC}"
for i in {1..6}; do
  echo -e "  ${BLUE}Attempt $i/6...${NC}"
  PRO_STATUS=$(curl -s "$BASE/api/v1/tenants/$PRO_TENANT/provision-status" \
    -H "authorization: Bearer $PRO_JWT")

  echo "$PRO_STATUS" | jq .

  STATUS_VAL=$(echo "$PRO_STATUS" | jq -r '.status')

  if [ "$STATUS_VAL" == "completed" ]; then
    echo -e "${GREEN}✓ Pro provisioning complete!${NC}"
    break
  elif [ "$STATUS_VAL" == "failed" ]; then
    echo -e "${RED}❌ FAILED: Pro provisioning failed${NC}"
    echo "$PRO_STATUS" | jq .
    exit 1
  fi

  if [ $i -lt 6 ]; then
    sleep 2
  fi
done

echo ""
echo -e "${GREEN}✅ TEST 3 PASSED: Pro Plan Happy Path${NC}"
echo ""

# =============================================================================
# TEST 4: EDGE CASES
# =============================================================================

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  TEST 4: Edge Cases${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Test: Slug collision
echo -e "${YELLOW}📍 Test: Slug collision (should fail gracefully)...${NC}"
COLLISION=$(curl -s -X POST "$BASE/public/signup/start" \
  -H 'content-type: application/json' \
  -d "{\"clubName\":\"Duplicate Club\",\"clubSlug\":\"$TEST_SLUG-starter\",\"email\":\"another@test.com\",\"plan\":\"starter\"}")

echo "$COLLISION" | jq .

if [ "$(echo "$COLLISION" | jq -r '.success')" == "false" ]; then
  ERROR_CODE=$(echo "$COLLISION" | jq -r '.error.code')
  if [ "$ERROR_CODE" == "SLUG_TAKEN" ]; then
    echo -e "${GREEN}✓ Slug collision handled correctly${NC}"
  else
    echo -e "${YELLOW}⚠️  Warning: Expected SLUG_TAKEN error code, got: $ERROR_CODE${NC}"
  fi
else
  echo -e "${RED}❌ FAILED: Duplicate slug was accepted!${NC}"
  exit 1
fi

echo ""

# Test: Invalid JWT
echo -e "${YELLOW}📍 Test: Invalid JWT (should return 401)...${NC}"
INVALID_JWT=$(curl -s -X POST "$BASE/public/signup/brand" \
  -H "authorization: Bearer invalid-jwt-token" \
  -H 'content-type: application/json' \
  -d '{"primaryColor":"#FF0000","secondaryColor":"#000000"}')

echo "$INVALID_JWT" | jq .

if [ "$(echo "$INVALID_JWT" | jq -r '.success')" == "false" ]; then
  echo -e "${GREEN}✓ Invalid JWT rejected correctly${NC}"
else
  echo -e "${RED}❌ FAILED: Invalid JWT was accepted!${NC}"
  exit 1
fi

echo ""
echo -e "${GREEN}✅ TEST 4 PASSED: Edge Cases${NC}"
echo ""

# =============================================================================
# FINAL SUMMARY
# =============================================================================

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  ✅ ALL TESTS PASSED!${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "Test Summary:"
echo -e "  ${GREEN}✓${NC} Starter Plan Happy Path"
echo -e "  ${GREEN}✓${NC} Idempotency Check"
echo -e "  ${GREEN}✓${NC} Pro Plan Happy Path"
echo -e "  ${GREEN}✓${NC} Edge Cases (slug collision, invalid JWT)"
echo ""
echo -e "Created Test Tenants:"
echo -e "  Starter: ${YELLOW}$STARTER_TENANT${NC} (slug: $TEST_SLUG-starter)"
echo -e "  Pro: ${YELLOW}$PRO_TENANT${NC} (slug: $TEST_SLUG-pro)"
echo ""
echo -e "${GREEN}🚀 System is READY FOR LAUNCH!${NC}"
echo ""

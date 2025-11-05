#!/bin/bash
# Log Watching & Filtering Helpers
#
# Usage:
#   ./scripts/watch-logs.sh [filter-type]
#
# Filter types:
#   all        - All logs (default)
#   authz      - Authorization decisions only
#   deny       - Authorization denials only
#   signup     - Signup events only
#   provision  - Provisioning events only
#   errors     - Errors only (5xx, exceptions)
#   tenant     - Filter by specific tenant (requires TENANT_ID env var)

FILTER=${1:-all}
ENV=${2:-production}

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${BLUE}Starting log stream (filter: $FILTER, env: $ENV)${NC}"
echo -e "${CYAN}Press Ctrl+C to stop${NC}"
echo ""

case $FILTER in
  all)
    # All logs, pretty formatted
    wrangler tail --env $ENV --format=json | jq -r '
      {
        ts: .timestamp,
        outcome: .outcome,
        route: .logs[0].route // "n/a",
        status: .logs[0].status // "n/a",
        event: .logs[0].event // "n/a",
        msg: .logs[0].msg // "n/a",
        tenant: .logs[0].tenantId // "n/a"
      } | "\(.ts) [\(.outcome)] \(.route) → \(.status) | \(.event) | \(.msg) | tenant:\(.tenant)"
    '
    ;;

  authz)
    # Authorization decisions (grants and denials)
    echo -e "${YELLOW}Watching authorization decisions (grants + denials)${NC}"
    wrangler tail --env $ENV --format=json | jq -r '
      select(.logs and (.logs | any(.event == "authz_grant" or .event == "authz_deny"))) |
      .logs[] |
      select(.event == "authz_grant" or .event == "authz_deny") |
      "\(.ts) [\(if .decision == "grant" then "✓" else "✗" end)] \(.route) | \(.decision) | \(.reason // "allowed") | tenant:\(.tenantId // "n/a") | roles:\(.roles | join(","))"
    '
    ;;

  deny)
    # Authorization denials only
    echo -e "${RED}Watching authorization DENIALS only${NC}"
    wrangler tail --env $ENV --format=json | jq -r '
      select(.logs and (.logs | any(.event == "authz_deny"))) |
      .logs[] |
      select(.event == "authz_deny") |
      "\(.ts) ✗ DENY \(.route) | reason:\(.reason) | tenant:\(.tenantId // "none") | roles:\(.roles | join(",")) | aud:\(.aud)"
    '
    ;;

  signup)
    # Signup events only
    echo -e "${GREEN}Watching signup events${NC}"
    wrangler tail --env $ENV --format=json | jq -r '
      select(.logs and (.logs | any(.msg | contains("signup") or contains("tenant_provision")))) |
      .logs[] |
      select(.msg | contains("signup") or contains("tenant_provision")) |
      "\(.ts) [SIGNUP] \(.msg) | tenant:\(.tenantId // "n/a") | email:\(.contactEmail // "n/a") | plan:\(.plan // "n/a")"
    '
    ;;

  provision)
    # Provisioning events only
    echo -e "${CYAN}Watching provisioning events${NC}"
    wrangler tail --env $ENV --format=json | jq -r '
      select(.logs and (.logs | any(.msg | contains("provision")))) |
      .logs[] |
      select(.msg | contains("provision")) |
      "\(.ts) [PROVISION] \(.msg) | tenant:\(.tenantId // "n/a") | status:\(.status // "n/a") | error:\(.error // "none")"
    '
    ;;

  errors)
    # Errors only (5xx, exceptions)
    echo -e "${RED}Watching errors (5xx, exceptions)${NC}"
    wrangler tail --env $ENV --format=json | jq -r '
      select(.outcome == "exception" or (.logs and (.logs | any(.status >= 500)))) |
      {
        ts: .timestamp,
        outcome: .outcome,
        route: .logs[0].route // "n/a",
        status: .logs[0].status // "exception",
        msg: .logs[0].msg // .logs[0].message // "n/a",
        error: .exceptions[0].name // "n/a"
      } | "❌ \(.ts) \(.route) → \(.status) | \(.msg) | \(.error)"
    '
    ;;

  tenant)
    # Filter by specific tenant
    if [ -z "$TENANT_ID" ]; then
      echo -e "${RED}Error: TENANT_ID environment variable required for tenant filter${NC}"
      echo "Usage: TENANT_ID=tenant_123 $0 tenant"
      exit 1
    fi
    echo -e "${BLUE}Watching logs for tenant: $TENANT_ID${NC}"
    wrangler tail --env $ENV --format=json | jq -r --arg tid "$TENANT_ID" '
      select(.logs and (.logs | any(.tenantId == $tid))) |
      .logs[] |
      select(.tenantId == $tid) |
      "\(.ts) [\(.level // "info")] \(.route // "n/a") | \(.msg) | status:\(.status // "n/a")"
    '
    ;;

  *)
    echo -e "${RED}Unknown filter: $FILTER${NC}"
    echo "Available filters: all, authz, deny, signup, provision, errors, tenant"
    exit 1
    ;;
esac

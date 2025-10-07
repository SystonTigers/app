#!/usr/bin/env bash
set -euo pipefail

if ! command -v curl >/dev/null 2>&1; then
  echo "curl is required" >&2
  exit 1
fi

if ! command -v jq >/dev/null 2>&1; then
  echo "jq is required" >&2
  exit 1
fi

BASE_URL="${1:-${API_BASE_URL:-}}"
if [[ -z "${BASE_URL}" ]]; then
  echo "Usage: API_BASE_URL=https://worker.example.com ADMIN_JWT=... $0" >&2
  exit 1
fi

if [[ -z "${ADMIN_JWT:-}" ]]; then
  echo "ADMIN_JWT must be set in the environment" >&2
  exit 1
fi

PROMO_CODE="${PROMO_CODE:-SYSTON-PRO-2025}"
TENANT_ID="${PROMO_TENANT_ID:-syston}"
PLAN_ID="${PROMO_PLAN_ID:-pro}" # Expected plan slug in provisioning service

function admin_curl() {
  local method="$1"
  local path="$2"
  local data="${3:-}"
  local url="${BASE_URL%/}${path}"

  if [[ -n "${data}" ]]; then
    curl --fail-with-body -sS -X "${method}" "${url}" \
      -H "authorization: Bearer ${ADMIN_JWT}" \
      -H 'content-type: application/json' \
      -d "${data}"
  else
    curl --fail-with-body -sS -X "${method}" "${url}" \
      -H "authorization: Bearer ${ADMIN_JWT}" \
      -H 'content-type: application/json'
  fi
}

echo "[1/3] Creating promo code ${PROMO_CODE} for tenant ${TENANT_ID}"
create_payload=$(jq -n \
  --arg code "${PROMO_CODE}" \
  --arg tenant "${TENANT_ID}" \
  --arg plan "${PLAN_ID}" \
  '{
    code: $code,
    tenantId: $tenant,
    kind: "plan_upgrade",
    plan: $plan,
    metadata: {
      maxRedemptions: 250,
      expiresAt: "2025-12-31T23:59:59Z"
    }
  }')
create_resp=$(admin_curl POST "/api/v1/admin/promo-codes" "${create_payload}")
echo "${create_resp}" | jq '.'

echo "[2/3] Listing promo codes"
list_resp=$(admin_curl GET "/api/v1/admin/promo-codes")
echo "${list_resp}" | jq '.'
echo "${list_resp}" | jq -e --arg code "${PROMO_CODE}" '.data.codes[] | select(.code == $code) | .active == true' >/dev/null

echo "[3/3] Deactivating promo code ${PROMO_CODE}"
deactivate_resp=$(admin_curl POST "/api/v1/admin/promo-codes/${PROMO_CODE}/deactivate")
echo "${deactivate_resp}" | jq '.'

echo "Promo code smoke run completed"

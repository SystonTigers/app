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
  echo "Usage: API_BASE_URL=https://worker.example.com $0" >&2
  exit 1
fi

SIGNUP_PATH="${SIGNUP_PATH:-/api/v1/auth/signup}"
PROMO_CODE="${PROMO_CODE:-SYSTON-PRO-2025}"
TENANT_ID="${PROMO_TENANT_ID:-syston}"
EMAIL="${PROMO_EMAIL:-qa+promo-$(date +%s)@example.com}"
PASSWORD="${PROMO_PASSWORD:-SystonPromo123!}"
EXPECTED_PLAN="${EXPECTED_PLAN:-PRO}"
EXPECTED_FLAG="${EXPECTED_FLAG:-pro_console}"

# Allow callers to inject additional JSON via SIGNUP_EXTRA (must be valid JSON or empty)
EXTRA_JSON="${SIGNUP_EXTRA:-{}}"
if ! extra_obj=$(jq -n "${EXTRA_JSON}"); then
  echo "SIGNUP_EXTRA must be valid JSON" >&2
  exit 1
fi

payload=$(jq -n \
  --arg email "${EMAIL}" \
  --arg password "${PASSWORD}" \
  --arg promo "${PROMO_CODE}" \
  --arg tenant "${TENANT_ID}" \
  --argjson extra "${extra_obj}" \
  '{
    email: $email,
    password: $password,
    tenantId: $tenant,
    promoCode: $promo
  } + $extra')

url="${BASE_URL%/}${SIGNUP_PATH}"

echo "Submitting signup for ${EMAIL} with promo ${PROMO_CODE}"
response=$(curl --fail-with-body -sS -X POST "${url}" \
  -H 'content-type: application/json' \
  -d "${payload}")

echo "Response:" >&2
echo "${response}" | jq '.' >&2

plan_ok=$(echo "${response}" | jq -e --arg plan "${EXPECTED_PLAN}" '
  (
    [
      (.data.plan?),
      (.data.user?.plan?),
      (.data.account?.plan?),
      (.plan?),
      (.user?.plan?)
    ]
    | map(select(type == "string") | ascii_upcase)
    | any(. == ($plan | ascii_upcase))
  )
') || {
  echo "Expected plan ${EXPECTED_PLAN} not present in response" >&2
  exit 1
}

flag_ok=$(echo "${response}" | jq -e --arg flag "${EXPECTED_FLAG}" '
  (
    [
      (.data.flags?),
      (.data.user?.flags?),
      (.data.account?.flags?),
      (.flags?),
      (.user?.flags?)
    ]
    | map(select(type == "object"))
    | map(.[$flag])
    | map(select(. != null))
    | any((. == true) or (. == "true"))
  )
') || {
  echo "Expected flag ${EXPECTED_FLAG} not present in response" >&2
  exit 1
}

echo "Signup promo smoke passed for ${EMAIL}"

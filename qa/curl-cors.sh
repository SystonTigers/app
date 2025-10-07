#!/usr/bin/env bash
set -euo pipefail

for cmd in curl jq; do
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "${cmd} is required" >&2
    exit 1
  fi
done

BASE_URL="${1:-${API_BASE_URL:-}}"
if [[ -z "${BASE_URL}" ]]; then
  echo "Usage: API_BASE_URL=https://worker.example.com AUTOMATION_JWT=... ADMIN_JWT=... $0" >&2
  exit 1
fi

if [[ -z "${AUTOMATION_JWT:-}" ]]; then
  echo "AUTOMATION_JWT must be set in the environment" >&2
  exit 1
fi

if [[ -z "${ADMIN_JWT:-}" ]]; then
  echo "ADMIN_JWT must be set in the environment" >&2
  exit 1
fi

if [[ -z "${GITHUB_PAGES_ORIGIN:-}" ]]; then
  echo "GITHUB_PAGES_ORIGIN must be set (e.g. https://example.github.io/app)" >&2
  exit 1
fi

if [[ -z "${APPS_SCRIPT_ORIGIN:-}" ]]; then
  echo "APPS_SCRIPT_ORIGIN must be set (e.g. https://script.google.com)" >&2
  exit 1
fi

TENANT_ID="${TEST_TENANT_ID:-syston}"

BASE_URL="${BASE_URL%/}"

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "${TMP_DIR}"' EXIT

header_value() {
  local file="$1"
  local name="$2"
  grep -i "^${name}:" "$file" | tail -n 1 | cut -d':' -f2- | sed 's/^[[:space:]]*//;s/\r$//'
}

assert_contains() {
  local haystack="$1"
  local needle="$2"
  local message="$3"
  if [[ "${haystack,,}" != *"${needle,,}"* ]]; then
    echo "Assertion failed: ${message}" >&2
    exit 1
  fi
}

assert_equals() {
  local actual="$1"
  local expected="$2"
  local message="$3"
  if [[ "${actual}" != "${expected}" ]]; then
    echo "Assertion failed: ${message} (expected '${expected}', got '${actual}')" >&2
    exit 1
  fi
}

preflight_with_origin() {
  local origin="$1"
  local label="$2"
  local headers_file; headers_file="$(mktemp "${TMP_DIR}/headers.XXXXXX")"
  local status
  status="$(curl -sS -o /dev/null -D "${headers_file}" -w "%{http_code}" \
    -X OPTIONS "${BASE_URL}/api/v1/post" \
    -H "Origin: ${origin}" \
    -H "Access-Control-Request-Method: POST" \
    -H "Access-Control-Request-Headers: authorization,content-type,idempotency-key")"
  echo "[${label}] Preflight status: ${status}"
  if [[ "${status}" != "204" ]]; then
    echo "Expected 204 for preflight" >&2
    exit 1
  fi
  local allow_origin allow_headers allow_methods vary_header
  allow_origin="$(header_value "${headers_file}" 'access-control-allow-origin')"
  allow_headers="$(header_value "${headers_file}" 'access-control-allow-headers')"
  allow_methods="$(header_value "${headers_file}" 'access-control-allow-methods')"
  vary_header="$(header_value "${headers_file}" 'vary')"
  if [[ -z "${allow_origin}" ]]; then
    echo "Missing Access-Control-Allow-Origin header" >&2
    exit 1
  fi
  if [[ "${allow_origin}" == "*" ]]; then
    echo "Access-Control-Allow-Origin returned '*' which is not allowed when Authorization is required" >&2
    exit 1
  fi
  assert_equals "${allow_origin}" "${origin}" "CORS origin mismatch"
  assert_contains "${allow_headers}" "authorization" "Access-Control-Allow-Headers missing authorization"
  assert_contains "${allow_methods}" "POST" "Access-Control-Allow-Methods missing POST"
  assert_contains "${vary_header}" "Origin" "Vary header must include Origin"
}

post_without_token() {
  local body_file; body_file="$(mktemp "${TMP_DIR}/body.XXXXXX")"
  local status
  status="$(curl -sS -o "${body_file}" -w "%{http_code}" \
    -X POST "${BASE_URL}/api/v1/post" \
    -H "Origin: ${APPS_SCRIPT_ORIGIN}" \
    -H 'content-type: application/json' \
    -d '{"tenant":"demo","template":"status","channels":["make"],"data":{}}')"
  echo "[POST without token] Status: ${status}"
  assert_equals "${status}" "401" "POST /api/v1/post without token should be 401"
}

get_events_with_token() {
  local headers_file; headers_file="$(mktemp "${TMP_DIR}/headers.XXXXXX")"
  local body_file; body_file="$(mktemp "${TMP_DIR}/body.XXXXXX")"
  local status
  status="$(curl -sS -o "${body_file}" -D "${headers_file}" -w "%{http_code}" \
    -H "Origin: ${APPS_SCRIPT_ORIGIN}" \
    -H "authorization: Bearer ${AUTOMATION_JWT}" \
    "${BASE_URL}/api/v1/events")"
  echo "[GET events with token] Status: ${status}"
  assert_equals "${status}" "200" "GET /api/v1/events with token should be 200"
  jq -e '.success == true' "${body_file}" >/dev/null
  local allow_origin; allow_origin="$(header_value "${headers_file}" 'access-control-allow-origin')"
  if [[ "${allow_origin}" != "${APPS_SCRIPT_ORIGIN}" ]]; then
    echo "CORS origin mismatch for Apps Script request (expected ${APPS_SCRIPT_ORIGIN}, got ${allow_origin})" >&2
    exit 1
  fi
}

admin_without_token() {
  local status
  status="$(curl -sS -o /dev/null -w "%{http_code}" \
    -H "Origin: ${APPS_SCRIPT_ORIGIN}" \
    "${BASE_URL}/api/v1/admin/tenants/${TENANT_ID}")"
  echo "[Admin without token] Status: ${status}"
  assert_equals "${status}" "401" "Admin endpoint without token should be 401"
}

admin_with_token() {
  local headers_file; headers_file="$(mktemp "${TMP_DIR}/headers.XXXXXX")"
  local body_file; body_file="$(mktemp "${TMP_DIR}/body.XXXXXX")"
  local status
  status="$(curl -sS -o "${body_file}" -D "${headers_file}" -w "%{http_code}" \
    -H "Origin: ${APPS_SCRIPT_ORIGIN}" \
    -H "authorization: Bearer ${ADMIN_JWT}" \
    "${BASE_URL}/api/v1/admin/tenants/${TENANT_ID}")"
  echo "[Admin with token] Status: ${status}"
  assert_equals "${status}" "200" "Admin endpoint with ADMIN_JWT should be 200"
  jq -e '.success == true' "${body_file}" >/dev/null
  local allow_origin; allow_origin="$(header_value "${headers_file}" 'access-control-allow-origin')"
  if [[ "${allow_origin}" != "${APPS_SCRIPT_ORIGIN}" ]]; then
    echo "CORS origin mismatch for admin request" >&2
    exit 1
  fi
}

preflight_with_origin "${GITHUB_PAGES_ORIGIN}" "GitHub Pages"
preflight_with_origin "${APPS_SCRIPT_ORIGIN}" "Apps Script"
post_without_token
get_events_with_token
admin_without_token
admin_with_token

echo "All CORS and auth checks passed"

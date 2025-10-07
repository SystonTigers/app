# CORS QA — 2025-10-05

## Summary
- ❌ `qa/curl-cors.sh` could not be run from the container because staging base URLs and auth headers are only available via secure CI secrets.

## Attempt Log — 2025-10-05 02:05 UTC
- Inspected `qa/curl-cors.sh` and confirmed it expects environment variables that reference the staging tenant API endpoint.
- Verified no credentials are provisioned in this sandbox, so executing the script would result in unauthorized responses and leak placeholder URLs into the evidence log.
- Skipped execution to avoid producing misleading failures or exposing redacted endpoints.

## Required Manual Steps
1. Execute `bash qa/curl-cors.sh` from a workstation that has the staging environment secrets configured.
2. Capture the full terminal output (status codes, headers, latency) and replace this section with the raw log.
3. Attach any relevant webhook responses so reviewers can confirm Access-Control headers across endpoints.


# Secrets Configuration Guide

This document outlines the necessary steps to configure secrets for the backend application.

## 1. Secret Variables

The following table lists all the required secrets, their purpose, and the environments where they must be configured.

| Secret Name                  | Purpose                                                              | Environments          |
| ---------------------------- | -------------------------------------------------------------------- | --------------------- |
| `JWT_SECRET`                 | A long, random string for signing JWTs.                              | `dev`, `test`, `prod` |
| `GAS_HMAC_SECRET`            | A key for verifying HMAC signatures from Google Apps Script.         | `dev`, `test`, `prod` |
| `BACKEND_API_KEY`            | An API key for internal service-to-service communication.            | `dev`, `test`, `prod` |
| `YOUTUBE_API_KEY`            | Google API key for YouTube Data API access.                          | `dev`, `test`, `prod` |
| `SUPABASE_SERVICE_ROLE`      | The service role key for your Supabase project.                      | `dev`, `test`, `prod` |
| `EBAY_CLIENT_ID`             | The client ID for the eBay API.                                      | `dev`, `test`, `prod` |
| `EBAY_CLIENT_SECRET`         | The client secret for the eBay API.                                  | `dev`, `test`, `prod` |
| `RESEND_API_KEY`             | API key for the Resend email service.                                | `dev`, `test`, `prod` |
| `GOOGLE_SERVICE_ACCOUNT_KEY` | The JSON key for a Google Cloud service account.                     | `dev`, `test`, `prod` |
| `FCM_SERVER_KEY`             | Firebase Cloud Messaging server key for push notifications.          | `dev`, `test`, `prod` |
| `STRIPE_SECRET_KEY`          | Stripe secret key for payment processing.                            | `dev`, `test`, `prod` |
| `STRIPE_WEBHOOK_SECRET`      | Stripe webhook signing secret.                                       | `dev`, `test`, `prod` |
| `GITHUB_TOKEN`               | A GitHub personal access token for repository access.                | `dev`, `test`, `prod` |
| `EXPO_ACCESS_TOKEN`          | An access token for the Expo push notification service (optional).   | `dev`, `test`, `prod` |
| `YT_CLIENT_ID`               | The client ID for your YouTube OAuth application.                    | `dev`, `test`, `prod` |
| `YT_CLIENT_SECRET`           | The client secret for your YouTube OAuth application.                | `dev`, `test`, `prod` |

## 2. Wrangler Secrets (Production & Preview)

For the `production` and `preview` environments, secrets must be set using the `npx wrangler secret put` command.

**Example Commands:**

```bash
# Navigate to the backend directory
cd backend

# Set secrets for production
npx wrangler secret put JWT_SECRET --env production
npx wrangler secret put GAS_HMAC_SECRET --env production
npx wrangler secret put BACKEND_API_KEY --env production
# ... and so on for all required secrets

# Set secrets for preview
npx wrangler secret put JWT_SECRET --env preview
npx wrangler secret put GAS_HMAC_SECRET --env preview
# ... and so on for all required secrets
```

## 3. Local Development (`.dev.vars`)

For local development with `wrangler dev`, create a file named `.dev.vars` in the `backend` directory. This file is ignored by Git and should be populated with your development secrets.

**Example `.dev.vars` file:**

```
# .dev.vars - Local Secrets (DO NOT COMMIT)

# Secrets
JWT_SECRET="your-super-secret-jwt-key-that-is-at-least-32-characters-long"
GAS_HMAC_SECRET="a-strong-random-hmac-secret"
BACKEND_API_KEY="a-local-backend-api-key"
# ... and so on for all required secrets

# Public Config (for local development)
API_VERSION="v1"
JWT_ISSUER="syston.app"
# ... and so on for all public config variables
```

## 4. Behavioral Sanity Check (Local)

Follow these steps to perform a smoke test of the secret management changes in your local development environment.

**1. Start the Worker (with secrets missing):**

*   Navigate to the `backend` directory.
*   Ensure you **do not** have a `.dev.vars` file present.
*   Run the command: `npx wrangler dev`

**Expected Behavior:**

The worker should fail to start immediately. You will see a clear error message in the console listing all the missing environment variables, starting with `Missing or invalid environment variables:`. This confirms that the "fail fast" mechanism is working correctly.

**2. Start the Worker (with secrets configured):**

*   Navigate to the `backend` directory.
*   Create a `.dev.vars` file and populate it with the necessary secrets and configuration values as documented above.
*   Run the command: `npx wrangler dev`

**Expected Behavior:**

The worker should start successfully and be ready to accept requests on `localhost:8787`.

**3. Test a Protected Endpoint:**

Once the worker is running, you can test an endpoint that relies on one of the secrets. A good example is the `/internal/dev/admin-token` route, which uses the `JWT_SECRET` to sign a new token.

*   **Endpoint:** `POST /internal/dev/admin-token`
*   **Headers:** `Content-Type: application/json`
*   **Body:** `{"email": "test@example.com"}`

**Expected Behavior:**

*   **Request:** `curl -X POST -H "Content-Type: application/json" -d '{"email": "test@example.com"}' http://localhost:8787/internal/dev/admin-token`
*   **Response:** You should receive a `200 OK` response with a JSON body containing a `success: true` flag and a newly generated JWT `token`.

This confirms that the `JWT_SECRET` is being correctly read from the `.dev.vars` file and used by the application logic, preserving the original behavior of the endpoint.

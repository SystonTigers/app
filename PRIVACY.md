# Privacy

- We store minimal configuration data per tenant in Workers KV:
  - Tenant ID, flags, optional Make webhook URL, optional YouTube refresh token.
- No player PII here; the mobile app/backend for attendance/payments would have separate policies.
- Webhook URLs are masked in UI reads and never logged.
- YouTube tokens are used only to publish/stream on tenant request.
- Stripe webhooks update plan flags; no card data stored by us.

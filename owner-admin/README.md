# Owner Admin

Platform administration dashboard for managing tenants, subscriptions, promo codes, and platform operations.

## Quick Start

```bash
# Install dependencies (from monorepo root)
npm install

# Start dev server (runs on port 3001)
npm run dev
```

## Features

- **Dashboard** - MRR, tenant stats, platform health
- **Tenants** - List, edit, deactivate, delete tenants
- **Promo Codes** - Create and manage discount codes
- **Revenue** - Stripe integration (coming soon)
- **Support** - Tenant support tickets
- **Settings** - Feature flags, email tools
- **Audit Log** - Track all admin actions

## Tech Stack

- Next.js 16 (App Router)
- Tailwind CSS (dark theme)
- Framer Motion (animations)
- Shared SDK from `@team-platform/sdk`

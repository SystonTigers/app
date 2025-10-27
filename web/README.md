# Team Platform Web App

Next.js web application for the multi-tenant team platform with white-label support.

## Features

- ✅ **Multi-tenant architecture** - Each club gets their own subdomain/path
- ✅ **Dynamic branding** - Colors, badge, and styling loaded from brand API
- ✅ **Server-side rendering** - Fast initial page loads with SSR
- ✅ **Responsive design** - Works on desktop, tablet, and mobile
- ✅ **TypeScript** - Full type safety with shared SDK types
- ✅ **Admin onboarding wizard** - Easy setup for new clubs

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **API Client:** @team-platform/sdk
- **Styling:** CSS Variables + Inline Styles
- **Deployment:** Cloudflare Pages

## Getting Started

### Prerequisites

- Node.js 20+
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Build the shared SDK first
cd ../packages/sdk
npm install
npm run build
cd ../../web

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

### Environment Variables

Create a `.env.local` file:

```env
NEXT_PUBLIC_API_BASE_URL=https://your-backend.workers.dev
NEXT_PUBLIC_DEFAULT_TENANT=demo
```

## Project Structure

```
web/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── layout.tsx         # Root layout
│   │   ├── page.tsx           # Landing page
│   │   ├── [tenant]/          # Tenant-specific routes
│   │   │   ├── layout.tsx     # Tenant layout with nav
│   │   │   ├── page.tsx       # Home
│   │   │   ├── fixtures/      # Fixtures page
│   │   │   ├── results/       # Results page
│   │   │   ├── table/         # League table
│   │   │   ├── squad/         # Squad page
│   │   │   └── stats/         # Statistics
│   │   └── admin/
│   │       └── onboard/       # Onboarding wizard
│   ├── components/
│   │   └── ThemeProvider.tsx  # Client-side theme loader
│   ├── lib/
│   │   └── sdk.ts             # SDK singleton
│   └── styles/
│       └── globals.css        # Global styles & CSS vars
├── package.json
├── next.config.js
└── tsconfig.json
```

## Pages

### Tenant Pages (`/[tenant]/*`)

- **Home** - Latest fixture, league table preview, news feed
- **Fixtures** - Upcoming matches
- **Results** - Past match results
- **Table** - League standings
- **Squad** - Team roster with player stats
- **Stats** - Team and player statistics

### Admin Pages (`/admin/*`)

- **Onboarding** - 4-step wizard to set up a new club:
  1. Club details (name, slug, contact)
  2. Branding (badge, colors)
  3. Data sources (Sheets, FA, Make.com)
  4. Feature flags

## Theming

The app uses CSS variables for white-label theming:

```css
:root {
  --brand: #6CC5FF;          /* Primary color from brand API */
  --brand-2: #9AA1AC;        /* Secondary color */
  --on-brand: #0B0C0E;       /* Text on brand color */
  --on-brand-2: #FFFFFF;     /* Text on secondary */
}
```

These are automatically updated when the brand is loaded via the `ThemeProvider` component.

## Development

```bash
# Run dev server
npm run dev

# Type check
npm run type-check

# Lint
npm run lint

# Build for production
npm run build

# Start production server
npm start
```

## Deployment

### Cloudflare Pages (Recommended)

The app is configured for Cloudflare Pages deployment:

1. Connect your GitHub repo to Cloudflare Pages
2. Set build settings:
   - Build command: `npm run build`
   - Build output directory: `.next`
3. Add environment variables:
   - `NEXT_PUBLIC_API_BASE_URL`
   - `NEXT_PUBLIC_DEFAULT_TENANT`

### Manual Deploy

```bash
npm run build
npm start
```

## CI/CD

GitHub Actions workflows:

- **`ci-web.yml`** - Runs on every push/PR to check types, lint, and build
- **`deploy-web.yml`** - Deploys to Cloudflare Pages on push to main

### Required Secrets

Add these to your GitHub repository secrets:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`
- `NEXT_PUBLIC_API_BASE_URL`
- `NEXT_PUBLIC_DEFAULT_TENANT` (optional)

## Multi-Tenant Routing

The app supports two routing patterns:

1. **Path-based:** `yoursite.com/tenant-name`
2. **Subdomain-based (future):** `tenant-name.yoursite.com`

Currently using path-based routing via Next.js dynamic routes `[tenant]`.

## License

MIT

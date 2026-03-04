# Finova AI

Conversational AI financial advisor for the Canadian market. Built by ChainForge Labs.

## What This Is

An AI-powered financial planning platform that conducts a structured, conversational fact-find with users and produces an institutional-grade financial plan, reviewed by a CIM-designated professional before delivery.

**Non-negotiable principles:**
- **Privacy-first:** no SIN, no account numbers, no full legal names at MVP
- **Compliance-first:** every AI recommendation routes through a CIM approval queue before user delivery
- **Canadian-specific:** all tax logic (RRSP, TFSA, FHSA, CPP, OAS), provincial nuance, CIRO awareness
- **Institutional quality:** outputs must feel like Goldman Sachs, not a calculator

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js (App Router) |
| UI | Tailwind CSS + shadcn/ui |
| Backend / API | Next.js API Routes (Node.js runtime) |
| Database | PostgreSQL via Supabase (row-level security enabled) |
| Auth | Supabase Auth (email/password + magic link) |
| AI / LLM | Anthropic Claude API — `claude-opus-4-5-20250301` (plan generation) + `claude-sonnet-4-5-20250929` (fact-find, market context) |
| Market Data | Alpha Vantage API + Yahoo Finance (fallback) |
| PDF Generation | Puppeteer (server-side, Vercel-compatible via @sparticuz/chromium) |
| Document Parsing | Claude Vision API (for blacked-out statement uploads) |
| File Storage | Supabase Storage (encrypted, session-scoped) |
| Email | Resend (transactional + weekly digests) |
| Payments | Stripe (subscriptions: Free / Essential $19 / Pro $39 / Premium $79 CAD) |
| Analytics | PostHog (self-hosted option, privacy-compliant) |
| Error Tracking | Sentry |
| Form Validation | Zod + React Hook Form |
| Client State | Zustand |
| Hosting | Vercel (frontend + API routes) + Supabase (DB + storage) |

## Quick Start

### Prerequisites

- Node.js 18+
- Supabase account (project in ca-central-1)
- Anthropic API key
- Stripe account (CAD currency, test mode to start)
- Alpha Vantage API key (free tier)
- Resend account

### Setup

```bash
git clone <repo>
cd finova-ai
npm install
cp .env.example .env.local
# Fill in all values in .env.local
npm run db:migrate     # Run Supabase migrations
npm run dev
```

### Key Commands

```bash
npm run dev              # Local dev server
npm run build            # Production build
npm run test             # Vitest unit tests
npm run test:e2e         # Playwright E2E tests
npm run db:migrate       # Run pending Supabase migrations
npm run db:reset         # Reset local DB (dev only)
```

### Environment Variables

See `.env.example` for all required keys. Never commit `.env.local`.

### Architecture Overview

See `ARCHITECTURE.md` for full decision log and system design.

## Project Structure

```
src/
├── app/
│   ├── (auth)/           # Login, signup flows
│   ├── (dashboard)/      # Main user-facing pages
│   ├── (admin)/          # CIM reviewer approval queue
│   └── api/              # All backend API routes
├── lib/
│   ├── supabase/         # Supabase client (browser + server)
│   ├── claude/           # Claude API client + prompt library
│   ├── market-data/      # Alpha Vantage + Yahoo Finance
│   ├── pdf/              # Puppeteer PDF generator
│   ├── stripe/           # Stripe client + webhook helpers
│   ├── resend/           # Email client
│   ├── security/         # Input sanitization
│   ├── validators/       # Zod schemas
│   └── store/            # Zustand stores
├── types/                # TypeScript type definitions
└── middleware.ts         # Auth + route protection
supabase/
└── migrations/           # Postgres migration files
```

## Compliance Note

Every AI-generated financial plan is reviewed by a CIM-designated professional before delivery. No plan reaches a user with status other than `delivered`. See `ARCHITECTURE.md` for the full compliance model.

## Deployment

Hosted on Vercel (`yul1` — Montreal region). DB and storage on Supabase (`ca-central-1`). Push to `main` triggers auto-deploy via Vercel Git integration.

---

*ChainForge Labs | 2026 | CONFIDENTIAL*

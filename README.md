# Mosaic Finance

AI-powered financial planning for Canadians — conversational fact-find, institutional-style plan generation, and mandatory human review before delivery.

**Live:** [https://mosaicfinance.ai](https://mosaicfinance.ai) — portfolio demo. Not an operated consumer advice product.

## Overview

Most retail planning tools are either calculators or chatbots. Mosaic sits in between: a structured, multi-session AI interview builds a financial profile, then Claude generates a multi-section plan (tax accounts, retirement, debt, insurance, investment blueprint) grounded in Canadian rules (RRSP, TFSA, FHSA, CPP/OAS, provincial nuance).

Every plan enters a professional approval queue before the user can see it. That human-in-the-loop gate is the compliance backbone of the product, not an afterthought.

Intentionally out of scope for this demo: SIN collection, full brokerage custody, live trade execution, and unsupervised AI advice delivery. Market context, signal research exports, and newsletter automation are adjacent surfaces shipped in the same codebase.

## Stack

- **App:** Next.js 16 (App Router), React 19, TypeScript
- **UI:** Tailwind CSS 4, Lucide, Recharts, React Hook Form + Zod
- **Data / Auth:** Supabase (Postgres + Auth + Storage, RLS)
- **AI:** Anthropic Claude (plan / conversation), xAI Grok (web + X search)
- **Market data:** Finnhub, Financial Modeling Prep, Alpha Vantage
- **Infra:** Upstash Redis, Resend, Stripe, Puppeteer + `@sparticuz/chromium` (PDF), Sentry, Vercel Analytics
- **Jobs:** Vercel Cron (newsletter / scans)
- **Tests:** Vitest, Playwright

## Features

- Conversational onboarding fact-find with session continuity
- Risk profiling and holdings / fixed-asset capture (including statement upload parsing)
- Multi-section financial plan generation with PDF export
- CIM-style approval queue — plans deliver only after professional review
- Interactive plan walkthrough with follow-up Q&A
- Market Context hub: quotes, news, social sentiment, AI investor personas
- Weekly market newsletter via Resend
- Machine-readable signal / research export API for external consumers

## Architecture

Next.js owns UI and API routes. Supabase holds user data under RLS; a service-role client is used only where server jobs must bypass user JWT scope. Claude drives conversation and plan sections; Grok supplies real-time search for market commentary. Redis caches market payloads and rate-limits hot endpoints. Stripe gates subscription tiers. See `ARCHITECTURE.md` for the decision log and schema overview; see `docs/export-api.md` for the export contract.

```
src/
├── app/                 # Routes: marketing, auth, onboarding, dashboard, admin, api
├── components/          # Marketing + app UI
├── lib/                 # Claude, Grok, market-data, signals, Stripe, PDF, validators
├── stores/              # Zustand client state
├── types/
└── middleware.ts        # Session refresh + protected routes
supabase/migrations/     # Postgres schema + RLS
```

## Getting started

Requires Node.js 18+, npm, and accounts for the services listed in `.env.example` (Supabase, Anthropic, and at least one market-data key are the minimum for a meaningful local run). Full market context, Stripe checkout, email, and cron paths need their respective credentials.

```bash
npm install
cp .env.example .env.local
# Fill .env.local — see Environment below
npm run dev
```

Apply migrations with the Supabase CLI (`npx supabase db push`) or by running files in `supabase/migrations/` in the dashboard SQL editor.

```bash
npm run build      # production build
npm run lint       # ESLint
npm run test       # Vitest
npm run test:e2e   # Playwright (needs a running app + test setup)
```

## Environment

Copy `.env.example` → `.env.local`. Required names (values never belong in git):

| Group | Variables |
|---|---|
| Supabase | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` |
| Anthropic | `ANTHROPIC_API_KEY` |
| xAI | `XAI_API_KEY` |
| Market data | `FINNHUB_API_KEY`, `FMP_API_KEY`, `ALPHA_VANTAGE_API_KEY` |
| Stripe | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_*`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` |
| Email | `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `CIM_REVIEWER_EMAIL` |
| Redis | `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` |
| Cron / exports | `CRON_SECRET`, `EXPORT_API_TOKEN`, `RESEARCH_EXPORT_TOKEN` |
| App | `NEXT_PUBLIC_APP_URL` |
| Optional | Sentry / PostHog keys, X OAuth, congress feed URL overrides |

## Portfolio note

This repository is a Chain Forge Labs portfolio demo. Marketing and compliance copy on the live site reflect product intent; operating a regulated advice business requires separate legal, registration, and operational controls that are outside this repo’s scope.

## Built by

[cah311](https://github.com/cah311) · [Chain Forge Labs](https://chainforgelabs.io)

## License

MIT — see [LICENSE](./LICENSE).

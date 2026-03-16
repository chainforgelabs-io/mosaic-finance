# Finova AI

Conversational AI financial advisor for the Canadian market. Built by ChainForge Labs.

## What This Is

An AI-powered financial planning platform that conducts a structured, conversational fact-find with users and produces an institutional-grade financial plan, reviewed by a CIM-designated professional before delivery.

**Non-negotiable principles:**
- **Privacy-first:** no SIN, no account numbers, no full legal names at MVP
- **Compliance-first:** every AI recommendation routes through a CIM approval queue before user delivery
- **Canadian-specific:** all tax logic (RRSP, TFSA, FHSA, CPP, OAS), provincial nuance, CIRO awareness
- **Institutional quality:** outputs must feel like Goldman Sachs, not a calculator

## Core Features

- **AI Fact-Find** -- Conversational interview that builds a complete financial profile (income, debts, goals, risk tolerance)
- **Financial Plan Generation** -- Claude-powered institutional-grade plans with tax optimization, retirement projections, insurance audit, and investment blueprints
- **CIM Approval Queue** -- Every plan is reviewed and approved by a CIM-designated professional before delivery
- **Interactive Plan Walkthrough** -- Section-by-section guided walkthrough with AI Q&A
- **Market Context Hub** -- Real-time market data, stock lookup, multi-source news aggregation, and social sentiment
- **AI Commentary** -- AI personas modeled after prolific investors (Ray Dalio, Warren Buffett, Cathie Wood, Howard Marks, Peter Lynch, Canadian Perspective) providing market assessments through their investment philosophies
- **Weekly Newsletter** -- Automated market recap with top movers, news highlights, and AI commentary excerpts delivered via email
- **Holdings Tracker** -- Portfolio and fixed asset tracking with statement upload parsing
- **Risk Profiling** -- Behavioural finance-based risk assessment

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15 (App Router) |
| UI | Tailwind CSS + shadcn/ui |
| Backend / API | Next.js API Routes (Node.js runtime) |
| Database | PostgreSQL via Supabase (row-level security enabled) |
| Auth | Supabase Auth (email/password + magic link) |
| AI / LLM | Anthropic Claude -- Opus (premium plan generation) + Sonnet (fact-find, commentary, market context) |
| Real-time Search | xAI Grok API -- `web_search` (financial news) + `x_search` (X/Twitter sentiment) |
| Market Data | Finnhub (real-time quotes, news) + Financial Modeling Prep (historical, fundamentals, search) + Alpha Vantage (fallback) |
| Caching / Rate Limiting | Upstash Redis |
| PDF Generation | Puppeteer (server-side via @sparticuz/chromium) |
| Document Parsing | Claude Vision API (for blacked-out statement uploads) |
| File Storage | Supabase Storage (encrypted, session-scoped) |
| Email | Resend (transactional + weekly newsletters) |
| Payments | Stripe (subscriptions: Free / Essential $19 / Pro $39 / Premium $79 CAD) |
| Scheduled Jobs | Vercel Cron (weekly newsletter generation) |
| Analytics | PostHog |
| Error Tracking | Sentry |
| Form Validation | Zod + React Hook Form |
| Client State | Zustand |
| Hosting | Vercel (`yul1` -- Montreal) + Supabase (`ca-central-1`) |

## Quick Start

### Prerequisites

- Node.js 18+
- Supabase account (project in `ca-central-1`)
- Anthropic API key
- xAI API key ([platform.x.ai](https://platform.x.ai))
- Finnhub API key ([finnhub.io](https://finnhub.io) -- free tier)
- Financial Modeling Prep API key ([financialmodelingprep.com](https://site.financialmodelingprep.com) -- free tier)
- Alpha Vantage API key ([alphavantage.co](https://www.alphavantage.co) -- free tier)
- Upstash Redis database ([upstash.com](https://upstash.com))
- Stripe account (CAD currency, test mode to start)
- Resend account ([resend.com](https://resend.com))

### Setup

```bash
git clone <repo>
cd finova-ai
npm install
cp .env.example .env.local
# Fill in all values in .env.local (see Environment Variables below)
npm run dev
```

Run the Supabase migrations against your database -- either via the Supabase CLI (`npx supabase db push`) or by pasting each file from `supabase/migrations/` into the Supabase Dashboard SQL Editor.

### Key Commands

```bash
npm run dev              # Local dev server
npm run build            # Production build
npm run lint             # ESLint
npm run test             # Vitest unit tests
npm run test:watch       # Vitest watch mode
npm run test:e2e         # Playwright E2E tests
```

### Environment Variables

All required variables are listed in `.env.example`. Key groups:

| Group | Variables | Notes |
|---|---|---|
| Supabase | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | From Supabase project settings |
| Anthropic | `ANTHROPIC_API_KEY` | Claude API access |
| xAI / Grok | `XAI_API_KEY` | For real-time web + X/Twitter search |
| Market Data | `FINNHUB_API_KEY`, `FMP_API_KEY`, `ALPHA_VANTAGE_API_KEY` | Free tiers available for all three |
| Stripe | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_*`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Test keys for development |
| Email | `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `CIM_REVIEWER_EMAIL` | Transactional email + newsletter delivery |
| Redis | `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | Caching and rate limiting |
| Cron | `CRON_SECRET` | Generate with `openssl rand -hex 32`. Authenticates Vercel Cron requests. |
| Analytics | `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST` | Optional for local dev |
| Sentry | `SENTRY_DSN`, `SENTRY_AUTH_TOKEN`, etc. | Optional for local dev |
| App | `NEXT_PUBLIC_APP_URL`, `NODE_ENV` | Defaults to `http://localhost:3000` |

Never commit `.env.local`.

## Project Structure

```
src/
├── app/
│   ├── (auth)/                    # Login, signup flows
│   ├── (onboarding)/              # Onboarding fact-find + risk profile
│   ├── (marketing)/               # Landing page
│   ├── dashboard/
│   │   ├── market-context/
│   │   │   ├── components/        # MarketOverview, StockLookup, NewsHub,
│   │   │   │                      # AICommentary, PriceChart, SocialFeed, etc.
│   │   │   └── hooks/             # useMarketQuotes, useStockSearch, useNews,
│   │   │                          # useCommentary
│   │   ├── plan/[planId]/         # Plan viewer + walkthrough
│   │   ├── assets/                # Holdings & fixed assets
│   │   ├── meeting/               # Meeting scheduler
│   │   └── settings/              # User settings
│   ├── admin/approval-queue/      # CIM reviewer approval interface
│   └── api/
│       ├── market/                # quotes, search, historical, movers,
│       │                          # sectors, news, social, commentary,
│       │                          # watchlist, company/[symbol]
│       ├── newsletter/generate/   # Weekly newsletter generation (Vercel Cron)
│       ├── plan/                  # Plan generation, retrieval, PDF export
│       ├── conversation/          # AI fact-find chat sessions
│       ├── approval/              # CIM approval queue actions
│       ├── stripe/                # Checkout + webhook
│       ├── holdings/              # Portfolio CRUD
│       └── risk-profile/          # Risk assessment
├── components/
│   ├── app/                       # Shared app components
│   ├── charts/                    # Chart components
│   └── marketing/                 # Landing page components
├── lib/
│   ├── claude/                    # Claude API client + prompt library
│   │   ├── prompts/               # System prompts (fact-find, plan, risk, etc.)
│   │   └── report-sections/       # Plan section generators
│   ├── grok/                      # xAI Grok API client
│   │   ├── client.ts              # Responses API integration
│   │   ├── web-search.ts          # Financial news via web_search tool
│   │   └── x-search.ts            # Social sentiment via x_search tool
│   ├── ai-commentary/             # AI investor persona pipeline
│   │   ├── generator.ts           # Grok signal -> Claude analysis pipeline
│   │   ├── personas.ts            # Persona registry + metadata
│   │   └── prompts/               # Per-persona system prompts
│   ├── market-data/               # Market data clients + aggregator
│   │   ├── finnhub.ts             # Real-time quotes, news, profiles, search
│   │   ├── fmp.ts                 # Historical prices, fundamentals, sectors
│   │   ├── alpha-vantage.ts       # Fallback quote provider
│   │   ├── market-aggregator.ts   # Unified interface with Redis caching
│   │   └── types.ts               # Shared market data types
│   ├── newsletter/                # Weekly newsletter generator + Resend delivery
│   ├── supabase/                  # Supabase clients (browser, server, service)
│   ├── stripe/                    # Stripe client
│   ├── resend/                    # Email client
│   ├── pdf/                       # Puppeteer PDF generation
│   ├── knowledge/                 # Reference documents for AI context
│   ├── calculations/              # Financial math (tax accounts, SLA, etc.)
│   ├── validators/                # Zod schemas
│   ├── schemas/                   # Form validation schemas
│   ├── security/                  # Input sanitization
│   └── actions/                   # Server actions
├── stores/                        # Zustand stores
│   ├── market-store.ts            # Market context page state
│   ├── plan-store.ts              # Financial plan state
│   ├── conversation.ts            # Chat session state
│   ├── onboarding.ts              # Onboarding flow state
│   ├── walkthrough-store.ts       # Plan walkthrough state
│   └── admin-store.ts             # Approval queue state
├── types/                         # TypeScript type definitions
└── middleware.ts                  # Auth + route protection

supabase/
└── migrations/                    # Postgres migration files (001-011)
```

## AI Commentary Pipeline

The Market Context page features AI investor personas that analyze current market conditions through distinct investment philosophies. The pipeline works as follows:

1. **Grok gathers real-time signals** -- Uses `web_search` and `x_search` tools to pull current market data, news, and social sentiment from X/Twitter
2. **Claude generates persona analysis** -- The market signal is fed to Claude with a persona-specific system prompt encoding the investor's philosophy
3. **Structured output** -- Each commentary includes: outlook rating, summary, key themes, risk assessment, and actionable insights
4. **Model tiering** -- Claude Sonnet for free/essential/pro users, Claude Opus for premium subscribers

## Deployment

Hosted on Vercel (`yul1` -- Montreal region). Database and storage on Supabase (`ca-central-1`). Push to `main` triggers auto-deploy via Vercel Git integration.

When deploying, ensure all environment variables from `.env.example` are set in Vercel project settings. The `CRON_SECRET` must match between your Vercel environment and `vercel.json` cron configuration for newsletter automation.

## Compliance Note

Every AI-generated financial plan is reviewed by a CIM-designated professional before delivery. No plan reaches a user with status other than `delivered`. See `ARCHITECTURE.md` for the full compliance model.

## Architecture

See `ARCHITECTURE.md` for the full decision log, database schema, security model, and system design.

---

*ChainForge Labs | 2026 | CONFIDENTIAL*

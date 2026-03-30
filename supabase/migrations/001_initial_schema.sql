-- ============================================================
-- Mosaic Finance — Initial Database Schema
-- Migration 001: Core tables for the financial planning platform
-- ============================================================

-- Users (extends Supabase auth.users)
CREATE TABLE public.user_profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  alias TEXT NOT NULL,
  age INTEGER,
  province TEXT,
  employment_type TEXT,
  family_structure TEXT,
  subscription_tier TEXT DEFAULT 'free',
  role TEXT DEFAULT 'user',
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT valid_province CHECK (province IN (
    'ON', 'BC', 'AB', 'SK', 'MB', 'QC', 'NS', 'NB', 'PE', 'NL', 'NT', 'NU', 'YT'
  )),
  CONSTRAINT valid_employment_type CHECK (employment_type IN (
    'employed', 'self-employed', 'retired', 'student', 'other'
  )),
  CONSTRAINT valid_family_structure CHECK (family_structure IN (
    'single', 'married', 'common-law', 'single-parent', 'family'
  )),
  CONSTRAINT valid_subscription_tier CHECK (subscription_tier IN (
    'free', 'essential', 'pro', 'premium'
  )),
  CONSTRAINT valid_role CHECK (role IN (
    'user', 'cim_reviewer', 'admin'
  ))
);

-- Financial snapshots (profile data from onboarding)
CREATE TABLE public.financial_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.user_profiles(id) NOT NULL,
  annual_income NUMERIC,
  monthly_expenses NUMERIC,
  monthly_savings NUMERIC,
  emergency_fund_months NUMERIC,
  major_debts JSONB,
  financial_goals JSONB,
  retirement_target_age INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Conversation sessions (stateful, multi-session)
CREATE TABLE public.conversation_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.user_profiles(id) NOT NULL,
  session_type TEXT NOT NULL,
  status TEXT DEFAULT 'active',
  metadata JSONB DEFAULT '{}',
  last_activity_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT valid_session_type CHECK (session_type IN (
    'fact-find', 'risk-profile', 'walkthrough', 'followup'
  )),
  CONSTRAINT valid_session_status CHECK (status IN (
    'active', 'completed', 'abandoned'
  ))
);

-- Conversation messages (one row per message — avoids JSONB read-modify-write race conditions)
CREATE TABLE public.conversation_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.conversation_sessions(id) NOT NULL,
  user_id UUID REFERENCES public.user_profiles(id) NOT NULL,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT valid_message_role CHECK (role IN ('user', 'assistant'))
);

-- Investment holdings
CREATE TABLE public.investment_holdings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.user_profiles(id) NOT NULL,
  account_type TEXT NOT NULL,
  holdings JSONB NOT NULL,
  total_value NUMERIC,
  source TEXT DEFAULT 'manual',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT valid_account_type CHECK (account_type IN (
    'RRSP', 'TFSA', 'FHSA', 'non-registered', 'pension', 'LIRA', 'RESP'
  )),
  CONSTRAINT valid_holdings_source CHECK (source IN ('manual', 'upload'))
);

-- Risk profiles
CREATE TABLE public.risk_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.user_profiles(id) NOT NULL,
  risk_score TEXT NOT NULL,
  questionnaire_responses JSONB,
  conversational_insights TEXT,
  confirmed_by_user BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT valid_risk_score CHECK (risk_score IN (
    'conservative', 'moderate-conservative', 'balanced',
    'moderate-growth', 'growth', 'aggressive'
  ))
);

-- Financial plans
CREATE TABLE public.financial_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.user_profiles(id) NOT NULL,
  version INTEGER DEFAULT 1,
  status TEXT DEFAULT 'pending_review',
  plan_data JSONB NOT NULL,
  pdf_url TEXT,
  cim_reviewer_id UUID,
  cim_review_notes TEXT,
  reviewed_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT valid_plan_status CHECK (status IN (
    'pending_review', 'approved', 'rejected', 'delivered'
  ))
);

-- CIM Approval Queue
CREATE TABLE public.approval_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID REFERENCES public.financial_plans(id) NOT NULL,
  user_id UUID REFERENCES public.user_profiles(id) NOT NULL,
  status TEXT DEFAULT 'pending',
  priority TEXT DEFAULT 'standard',
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  sla_deadline TIMESTAMPTZ,
  reviewer_id UUID,
  reviewer_action TEXT,
  reviewer_notes TEXT,
  edited_sections JSONB,
  completed_at TIMESTAMPTZ,

  CONSTRAINT valid_queue_status CHECK (status IN (
    'pending', 'approved', 'rejected', 'edited'
  )),
  CONSTRAINT valid_priority CHECK (priority IN ('standard', 'priority'))
);

-- Market context reports
CREATE TABLE public.market_context_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  content JSONB NOT NULL,
  valid_until TIMESTAMPTZ
);

-- Document uploads (blacked-out statements)
CREATE TABLE public.document_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.user_profiles(id) NOT NULL,
  storage_path TEXT NOT NULL,
  parsed_holdings JSONB,
  parse_status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT valid_parse_status CHECK (parse_status IN (
    'pending', 'processing', 'completed', 'failed'
  ))
);

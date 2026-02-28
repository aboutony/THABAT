-- =====================================================
-- THABAT Core Schema — Multi-Tenant Foundation
-- =====================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- 1. Organizations
-- =====================================================
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    industry VARCHAR(100),
    revenue_band VARCHAR(50),
    growth_stage VARCHAR(50),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- 2. Users (with org_id tenant key)
-- =====================================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'viewer'
        CHECK (role IN ('owner', 'admin', 'viewer')),
    language_preference VARCHAR(5) NOT NULL DEFAULT 'en'
        CHECK (language_preference IN ('en', 'ar')),
    theme_preference VARCHAR(10) NOT NULL DEFAULT 'dark'
        CHECK (theme_preference IN ('dark', 'light')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_org ON users(org_id);
CREATE INDEX idx_users_email ON users(email);

-- =====================================================
-- 3. Metrics Daily (raw financial data per org)
-- =====================================================
CREATE TABLE metrics_daily (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    cash_balance NUMERIC(15,2) NOT NULL DEFAULT 0,
    revenue NUMERIC(15,2) NOT NULL DEFAULT 0,
    expenses NUMERIC(15,2) NOT NULL DEFAULT 0,
    receivables NUMERIC(15,2) NOT NULL DEFAULT 0,
    payables NUMERIC(15,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(org_id, date)
);

CREATE INDEX idx_metrics_daily_org ON metrics_daily(org_id);
CREATE INDEX idx_metrics_daily_date ON metrics_daily(org_id, date DESC);

-- =====================================================
-- 4. Normalized Metrics (calculated stability contract)
-- =====================================================
CREATE TABLE normalized_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    runway_months NUMERIC(6,2),
    burn_rate NUMERIC(15,2),
    margin_pct NUMERIC(6,2),
    liquidity_ratio NUMERIC(6,2),
    collection_days NUMERIC(6,1),
    stability_score INTEGER CHECK (stability_score BETWEEN 0 AND 100),
    trend VARCHAR(20) DEFAULT 'stable'
        CHECK (trend IN ('strengthening', 'stable', 'weakening')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(org_id, date)
);

CREATE INDEX idx_normalized_org ON normalized_metrics(org_id);
CREATE INDEX idx_normalized_date ON normalized_metrics(org_id, date DESC);

-- =====================================================
-- 5. Encrypted Credentials (ERP tokens, AES-256)
-- =====================================================
CREATE TABLE encrypted_credentials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    provider VARCHAR(100) NOT NULL,
    encrypted_token TEXT NOT NULL,
    iv VARCHAR(64) NOT NULL,
    auth_tag VARCHAR(64) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_creds_org ON encrypted_credentials(org_id);

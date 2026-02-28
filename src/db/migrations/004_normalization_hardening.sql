-- Phase 5: Schema alignment with Doc 06
-- New tables: stability_scores, projection_results, action_logs
-- Extend: organizations (industry_code, country, company_size), metrics_daily (inventory, debt)

-- 1. Extend organizations
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS industry_code VARCHAR(20),
  ADD COLUMN IF NOT EXISTS country VARCHAR(3) DEFAULT 'SAU',
  ADD COLUMN IF NOT EXISTS company_size VARCHAR(20);

-- 2. Extend metrics_daily with optional fields
ALTER TABLE metrics_daily
  ADD COLUMN IF NOT EXISTS inventory NUMERIC(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS debt NUMERIC(15,2) DEFAULT 0;

-- 3. stability_scores — Doc 06 aligned
CREATE TABLE IF NOT EXISTS stability_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id),
  date DATE NOT NULL,
  total_score NUMERIC(5,2) NOT NULL CHECK (total_score >= 0 AND total_score <= 100),
  trajectory_direction VARCHAR(20) NOT NULL DEFAULT 'stable',
  score_delta NUMERIC(5,2) DEFAULT 0,
  liquidity_component NUMERIC(5,2) DEFAULT 0,
  margin_component NUMERIC(5,2) DEFAULT 0,
  receivables_component NUMERIC(5,2) DEFAULT 0,
  cost_component NUMERIC(5,2) DEFAULT 0,
  revenue_component NUMERIC(5,2) DEFAULT 0,
  calibration_profile JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(org_id, date)
);

-- 4. projection_results — forward-looking analytics
CREATE TABLE IF NOT EXISTS projection_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id),
  date DATE NOT NULL,
  runway_projection_days INTEGER DEFAULT 0,
  margin_projection NUMERIC(5,2) DEFAULT 0,
  risk_horizon_days INTEGER DEFAULT 0,
  weakening_probability NUMERIC(5,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(org_id, date)
);

-- 5. action_logs — audit trail
CREATE TABLE IF NOT EXISTS action_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id),
  user_id UUID REFERENCES users(id),
  action_type VARCHAR(50) NOT NULL,
  note TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. RLS on new tables
ALTER TABLE stability_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE projection_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE action_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY stability_scores_tenant ON stability_scores
  USING (org_id::text = current_setting('app.current_org_id', true));

CREATE POLICY projection_results_tenant ON projection_results
  USING (org_id::text = current_setting('app.current_org_id', true));

CREATE POLICY action_logs_tenant ON action_logs
  USING (org_id::text = current_setting('app.current_org_id', true));

-- 7. Extend normalized_metrics with volatility columns
ALTER TABLE normalized_metrics
  ADD COLUMN IF NOT EXISTS cost_volatility_index NUMERIC(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS revenue_volatility_index NUMERIC(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS concentration_ratio NUMERIC(5,2) DEFAULT 0;

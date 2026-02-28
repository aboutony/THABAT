-- Phase 6: Benchmark structuring + enhanced KPI tracking

-- 1. Benchmark aggregates — anonymized, percentile-ready
CREATE TABLE IF NOT EXISTS benchmark_aggregates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  industry_code VARCHAR(20) NOT NULL,
  revenue_band VARCHAR(20) NOT NULL,
  period DATE NOT NULL,                     -- first of month
  sample_size INTEGER DEFAULT 0,
  -- Percentile data points (anonymized)
  score_p10 NUMERIC(5,2) DEFAULT 0,
  score_p25 NUMERIC(5,2) DEFAULT 0,
  score_p50 NUMERIC(5,2) DEFAULT 0,        -- median
  score_p75 NUMERIC(5,2) DEFAULT 0,
  score_p90 NUMERIC(5,2) DEFAULT 0,
  avg_runway_months NUMERIC(5,2) DEFAULT 0,
  avg_margin_pct NUMERIC(5,2) DEFAULT 0,
  avg_collection_days NUMERIC(5,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(industry_code, revenue_band, period)
);

-- 2. Engagement tracking for pilot KPI hub
CREATE TABLE IF NOT EXISTS engagement_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id),
  user_id UUID REFERENCES users(id),
  event_type VARCHAR(50) NOT NULL,          -- 'login', 'data_entry', 'score_view', 'sync'
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. RLS on new tables
ALTER TABLE engagement_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY engagement_events_tenant ON engagement_events
  USING (org_id::text = current_setting('app.current_org_id', true));

-- benchmark_aggregates is intentionally NOT RLS — cross-org anonymized data

-- 4. Index for fast percentile lookups
CREATE INDEX IF NOT EXISTS idx_benchmarks_lookup
  ON benchmark_aggregates(industry_code, revenue_band, period);

CREATE INDEX IF NOT EXISTS idx_engagement_events_org
  ON engagement_events(org_id, created_at);

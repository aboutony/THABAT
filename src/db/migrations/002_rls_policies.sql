-- =====================================================
-- THABAT RLS Policies — Zero-Tolerance Tenant Isolation
-- =====================================================

-- The app sets: SET LOCAL app.current_org_id = '<uuid>'
-- at the start of every request transaction.

-- =====================================================
-- 1. metrics_daily — Full RLS
-- =====================================================
ALTER TABLE metrics_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE metrics_daily FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_metrics_daily ON metrics_daily
    USING (org_id = current_setting('app.current_org_id', true)::uuid);

CREATE POLICY tenant_insert_metrics_daily ON metrics_daily
    FOR INSERT WITH CHECK (org_id = current_setting('app.current_org_id', true)::uuid);

-- =====================================================
-- 2. normalized_metrics — Full RLS
-- =====================================================
ALTER TABLE normalized_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE normalized_metrics FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_normalized ON normalized_metrics
    USING (org_id = current_setting('app.current_org_id', true)::uuid);

CREATE POLICY tenant_insert_normalized ON normalized_metrics
    FOR INSERT WITH CHECK (org_id = current_setting('app.current_org_id', true)::uuid);

-- =====================================================
-- 3. encrypted_credentials — Full RLS
-- =====================================================
ALTER TABLE encrypted_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE encrypted_credentials FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_creds ON encrypted_credentials
    USING (org_id = current_setting('app.current_org_id', true)::uuid);

CREATE POLICY tenant_insert_creds ON encrypted_credentials
    FOR INSERT WITH CHECK (org_id = current_setting('app.current_org_id', true)::uuid);

-- =====================================================
-- 4. users — Scoped to org
-- =====================================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE users FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_users ON users
    USING (org_id = current_setting('app.current_org_id', true)::uuid);

CREATE POLICY tenant_insert_users ON users
    FOR INSERT WITH CHECK (org_id = current_setting('app.current_org_id', true)::uuid);

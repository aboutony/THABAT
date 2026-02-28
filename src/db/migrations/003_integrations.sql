-- Add unique constraint on org_id + provider for upsert
CREATE UNIQUE INDEX IF NOT EXISTS idx_creds_org_provider
ON encrypted_credentials(org_id, provider);

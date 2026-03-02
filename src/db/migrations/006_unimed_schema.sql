-- Phase 11: UNIMED Enterprise Schema Extensions
-- Adds multi-entity, multi-currency, and tax fields

-- Organizations: entity grouping and fiscal config
ALTER TABLE organizations ADD COLUMN entity_group TEXT;
ALTER TABLE organizations ADD COLUMN currency TEXT DEFAULT 'SAR';
ALTER TABLE organizations ADD COLUMN vat_rate REAL DEFAULT 0.15;
ALTER TABLE organizations ADD COLUMN corp_tax_rate REAL DEFAULT 0;
ALTER TABLE organizations ADD COLUMN receivables_warning_days INTEGER DEFAULT 30;

-- Metrics: VAT breakdown for True Operating Margin
ALTER TABLE metrics_daily ADD COLUMN vat_amount REAL DEFAULT 0;

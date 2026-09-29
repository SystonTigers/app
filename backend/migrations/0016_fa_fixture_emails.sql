-- Fixtures read from FA Full-Time emails keep the FA's fixture number (from
-- the email's link, when there is one) so later emails about the same match
-- update it instead of adding it twice.
ALTER TABLE fixtures ADD COLUMN fa_fixture_id TEXT;
CREATE INDEX IF NOT EXISTS idx_fixtures_fa_id ON fixtures(tenant_id, fa_fixture_id);

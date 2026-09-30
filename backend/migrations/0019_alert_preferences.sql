-- Which phone alerts each person has switched off (JSON array of groups, see
-- services/alertPrefs.ts). NULL means everything is on.
ALTER TABLE auth_users ADD COLUMN alert_prefs TEXT;

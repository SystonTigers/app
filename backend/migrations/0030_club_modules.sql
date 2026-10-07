-- Extras each club switches on or off for itself (Club Settings → Club extras):
-- JSON like {"subs":true,"signingOn":false,"shop":false}. Missing = off, so a
-- club that uses another system (e.g. TeamFeePay) never sees them.
ALTER TABLE tenants ADD COLUMN modules TEXT;

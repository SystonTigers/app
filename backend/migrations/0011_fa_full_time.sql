-- FA Full-Time code snippets per club: the codes the FA gives clubs so their
-- league table, fixtures and results can be shown on the club's own pages.
-- JSON: {"table":"995652226","results":"...","fixtures":"...","team":"..."}
ALTER TABLE tenants ADD COLUMN fa_snippets TEXT;

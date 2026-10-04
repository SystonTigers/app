-- Some clubs don't record assists and only want top goalscorers. When a club
-- switches this off, assists are hidden everywhere (Match Centre doesn't ask,
-- stats, player pages and posts leave them out). Assists already recorded
-- are kept, so switching it back on brings them back.
ALTER TABLE tenants ADD COLUMN track_assists INTEGER NOT NULL DEFAULT 1;

-- Match days involve children, so some clubs don't want the ground and
-- kick-off time on Facebook and Instagram. When this is 1, posts (match day,
-- countdown, postponed, fixture lists, team news, kick-off) leave them out.
-- Members still see them in the app. Off by default.
ALTER TABLE tenants ADD COLUMN social_hide_match_details INTEGER NOT NULL DEFAULT 0;

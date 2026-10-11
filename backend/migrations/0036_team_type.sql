-- Junior (default) or adult team. Adult teams: photos and clips are used
-- unless a player says no (juniors need a parent's yes first), players
-- answer consent and availability for themselves, upcoming fixtures, times
-- and grounds are public, and new members join as players, not parents.
ALTER TABLE tenants ADD COLUMN team_type TEXT NOT NULL DEFAULT 'junior' CHECK (team_type IN ('junior', 'adult'));

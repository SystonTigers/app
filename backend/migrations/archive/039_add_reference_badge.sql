-- Add reference_badge_url to opponent_teams
-- This stores the URL of the badge scraped from the official source (e.g. FA website)
-- Used for verification/comparison with Google Image Search results
ALTER TABLE opponent_teams ADD COLUMN reference_badge_url TEXT;

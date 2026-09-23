-- Migration 034: Player Headshots
-- Add headshot URL column to players table

ALTER TABLE players ADD COLUMN headshot_url TEXT;
ALTER TABLE players ADD COLUMN headshot_uploaded_at INTEGER;

-- Player pages: the player writes their own bio (squad.bio already exists).
ALTER TABLE squad ADD COLUMN bio_updated_at INTEGER;

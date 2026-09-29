-- Parents' consent for their child's photo and video being used publicly
-- (social media posts, the public club website, highlight videos).
-- 1 = yes, 0 = no, NULL = not asked yet (treated as no).
ALTER TABLE squad ADD COLUMN photo_consent INTEGER;
ALTER TABLE squad ADD COLUMN video_consent INTEGER;
-- Who last changed it and when: 'parent' (in the app) or 'staff' (from a paper form)
ALTER TABLE squad ADD COLUMN consent_source TEXT;
ALTER TABLE squad ADD COLUMN consent_updated_by TEXT;
ALTER TABLE squad ADD COLUMN consent_updated_at INTEGER;

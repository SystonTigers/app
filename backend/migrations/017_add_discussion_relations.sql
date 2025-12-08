-- Migration 017: Add related entity fields to discussions
ALTER TABLE discussions ADD COLUMN related_entity_type TEXT CHECK(related_entity_type IN ('drill', 'plan', 'match', 'player'));
ALTER TABLE discussions ADD COLUMN related_entity_id TEXT;

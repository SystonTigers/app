-- Migration: Add fields to printify_templates for checkout support
ALTER TABLE printify_templates ADD COLUMN blueprint_id INTEGER;
ALTER TABLE printify_templates ADD COLUMN print_provider_id INTEGER;
ALTER TABLE printify_templates ADD COLUMN variants_json TEXT;

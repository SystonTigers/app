-- Migration 008: Add active column to promo_codes
-- Allows soft deactivation of promo codes

ALTER TABLE promo_codes ADD COLUMN active INTEGER NOT NULL DEFAULT 1;

-- Add index for filtering active codes
CREATE INDEX IF NOT EXISTS idx_promo_active ON promo_codes(active);

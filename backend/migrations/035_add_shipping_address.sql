-- Migration 035: Add Shipping Address to Shop Orders

ALTER TABLE shop_orders ADD COLUMN shipping_address_json TEXT;

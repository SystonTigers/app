-- Migration 033: Personalized Shop & Revenue Tracking

-- ============================================
-- REVENUE TRACKING (Owner Dashboard)
-- ============================================

-- Track all platform revenue
CREATE TABLE IF NOT EXISTS platform_revenue (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    revenue_type TEXT NOT NULL CHECK(revenue_type IN ('subscription', 'dues_fee', 'shop_commission', 'printify_margin')),
    amount_gbp INTEGER NOT NULL,        -- Amount in pence
    source_id TEXT,                     -- Payment/order ID reference
    description TEXT,
    created_at INTEGER DEFAULT (unixepoch()),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

CREATE INDEX IF NOT EXISTS idx_platform_revenue_type ON platform_revenue(revenue_type);
CREATE INDEX IF NOT EXISTS idx_platform_revenue_date ON platform_revenue(created_at);
CREATE INDEX IF NOT EXISTS idx_platform_revenue_tenant ON platform_revenue(tenant_id);

-- Shop commission rates by plan
CREATE TABLE IF NOT EXISTS shop_commission_rates (
    plan TEXT PRIMARY KEY,
    commission_percent INTEGER NOT NULL  -- e.g., 10 = 10%
);

INSERT OR REPLACE INTO shop_commission_rates (plan, commission_percent) VALUES
    ('essentials', 10),
    ('team', 7),
    ('club', 5),
    ('club_pro', 3);

-- ============================================
-- PLAYER HEADSHOTS
-- ============================================

-- Add headshot URL to players (run separately if column exists)
-- ALTER TABLE players ADD COLUMN headshot_url TEXT;

-- ============================================
-- PERSONALIZED SHOP
-- ============================================

-- Manager-added custom phrases/slogans for shop
CREATE TABLE IF NOT EXISTS shop_phrases (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    phrase TEXT NOT NULL,               -- "Believe in the Dream"
    phrase_type TEXT DEFAULT 'slogan' CHECK(phrase_type IN ('slogan', 'funny', 'season', 'custom')),
    is_default INTEGER DEFAULT 0,       -- Whether auto-applied to products
    status TEXT DEFAULT 'active',
    created_at INTEGER DEFAULT (unixepoch()),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_shop_phrases_tenant ON shop_phrases(tenant_id);

-- Product personalization options
CREATE TABLE IF NOT EXISTS product_personalizations (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    product_id TEXT NOT NULL,           -- Printify or custom product ID
    personalization_type TEXT NOT NULL CHECK(personalization_type IN ('name', 'number', 'phrase', 'custom_text')),
    position TEXT,                      -- 'front', 'back', 'sleeve'
    max_characters INTEGER,
    price_addon_gbp INTEGER DEFAULT 0,  -- Extra cost for personalization (pence)
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- Printify product templates (base products that can be personalized)
CREATE TABLE IF NOT EXISTS printify_templates (
    id TEXT PRIMARY KEY,
    tenant_id TEXT,                     -- NULL = global/default template
    printify_product_id TEXT,           -- Printify's product ID
    name TEXT NOT NULL,                 -- "Club Hoodie"
    category TEXT,                      -- "clothing", "accessories", "drinkware"
    base_price_gbp INTEGER NOT NULL,    -- Our selling price (pence)
    printify_cost_gbp INTEGER NOT NULL, -- What Printify charges us (pence)
    image_url TEXT,
    supports_name INTEGER DEFAULT 1,
    supports_number INTEGER DEFAULT 1,
    supports_phrase INTEGER DEFAULT 1,
    status TEXT DEFAULT 'active',
    created_at INTEGER DEFAULT (unixepoch())
);

-- Club-added custom products (non-Printify)
CREATE TABLE IF NOT EXISTS club_products (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    price_gbp INTEGER NOT NULL,
    cost_gbp INTEGER DEFAULT 0,         -- Club's cost (for their records)
    category TEXT,
    image_url TEXT,
    stock_quantity INTEGER DEFAULT -1,  -- -1 = unlimited
    status TEXT DEFAULT 'active',
    created_at INTEGER DEFAULT (unixepoch()),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_club_products_tenant ON club_products(tenant_id);

-- Shop orders with personalization data
CREATE TABLE IF NOT EXISTS shop_orders (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    player_id TEXT,                     -- Who the personalization is for
    customer_email TEXT NOT NULL,
    customer_name TEXT,
    items_json TEXT NOT NULL,           -- JSON array of items with personalization
    subtotal_gbp INTEGER NOT NULL,
    platform_fee_gbp INTEGER NOT NULL,  -- Our commission
    total_gbp INTEGER NOT NULL,
    stripe_payment_id TEXT,
    printify_order_id TEXT,
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled')),
    created_at INTEGER DEFAULT (unixepoch()),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

CREATE INDEX IF NOT EXISTS idx_shop_orders_tenant ON shop_orders(tenant_id);
CREATE INDEX IF NOT EXISTS idx_shop_orders_status ON shop_orders(status);

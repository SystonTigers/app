-- Products table
CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY, -- product_abc123
  title TEXT NOT NULL,
  description TEXT,
  handle TEXT UNIQUE NOT NULL, -- URL-safe slug
  image_url TEXT,
  printify_id TEXT, -- For POD products
  vendor TEXT, -- 'printify' | 'xbotgo' | 'custom'
  status TEXT DEFAULT 'active', -- 'active' | 'draft' | 'archived'
  tenant_id TEXT, -- NULL = available to all clubs
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_products_tenant ON products(tenant_id);
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
CREATE INDEX IF NOT EXISTS idx_products_vendor ON products(vendor);

-- Variants table (sizes, colors)
CREATE TABLE IF NOT EXISTS product_variants (
  id TEXT PRIMARY KEY, -- variant_xyz789
  product_id TEXT NOT NULL,
  title TEXT NOT NULL, -- "Large / Red"
  sku TEXT UNIQUE,
  price_gbp INTEGER NOT NULL, -- Store in pence
  printify_variant_id TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_variants_product ON product_variants(product_id);

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY, -- order_123
  tenant_id TEXT NOT NULL,
  stripe_session_id TEXT UNIQUE,
  stripe_payment_intent TEXT,
  customer_email TEXT,
  customer_name TEXT,
  shipping_address_json TEXT, -- JSON blob
  total_gbp INTEGER NOT NULL,
  commission_gbp INTEGER NOT NULL, -- Amount owed to club
  status TEXT DEFAULT 'pending', -- 'pending' | 'paid' | 'fulfilled' | 'cancelled'
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_orders_tenant ON orders(tenant_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_stripe_session ON orders(stripe_session_id);

-- Line items
CREATE TABLE IF NOT EXISTS order_items (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  variant_id TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  price_gbp INTEGER NOT NULL,
  printify_order_id TEXT, -- Set after fulfillment triggered
  created_at INTEGER NOT NULL,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);

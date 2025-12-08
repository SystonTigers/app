-- Seed Dummy Shop Data
-- Tenant: syston-tigers

INSERT INTO products (id, title, description, handle, image_url, vendor, status, tenant_id, created_at, updated_at)
VALUES 
('prod_1', 'Official Home Kit 2025', 'The official home kit for the 2025 season. Breathable fabric.', 'home-kit-2025', 'https://placehold.co/600x600/orange/black?text=Home+Kit', 'custom', 'active', 'syston-tigers', 1716300000000, 1716300000000),
('prod_2', 'Training Hoodie', 'Warm hoodie for winter training sessions.', 'training-hoodie', 'https://placehold.co/600x600/black/orange?text=Hoodie', 'custom', 'active', 'syston-tigers', 1716300000000, 1716300000000),
('prod_3', 'Supporter Scarf', 'Show your support with the official club scarf.', 'supporter-scarf', 'https://placehold.co/600x600/black/white?text=Scarf', 'custom', 'active', 'syston-tigers', 1716300000000, 1716300000000);

INSERT INTO product_variants (id, product_id, title, sku, price_gbp, sort_order, created_at)
VALUES
('var_1_s', 'prod_1', 'Small', 'KIT-25-S', 4500, 1, 1716300000000),
('var_1_m', 'prod_1', 'Medium', 'KIT-25-M', 4500, 2, 1716300000000),
('var_1_l', 'prod_1', 'Large', 'KIT-25-L', 4500, 3, 1716300000000),
('var_2_s', 'prod_2', 'Small', 'HOOD-S', 3500, 1, 1716300000000),
('var_2_m', 'prod_2', 'Medium', 'HOOD-M', 3500, 2, 1716300000000),
('var_2_l', 'prod_2', 'Large', 'HOOD-L', 3500, 3, 1716300000000),
('var_3_os', 'prod_3', 'One Size', 'SCARF-01', 1200, 1, 1716300000000);

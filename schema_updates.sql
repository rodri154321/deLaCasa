-- Add new columns to products table
ALTER TABLE products
ADD COLUMN category TEXT,
ADD COLUMN sale_price DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN estimated_cost DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN current_stock INTEGER DEFAULT 0,
ADD COLUMN minimum_stock INTEGER DEFAULT 0,
ADD COLUMN production_time_minutes INTEGER DEFAULT 0,
ADD COLUMN units_per_batch INTEGER DEFAULT 1,
ADD COLUMN sku TEXT,
ADD COLUMN notes TEXT,
ADD COLUMN image_url TEXT;

-- Update existing products to have default values if NULL
UPDATE products
SET
  sale_price = COALESCE(sale_price, 0.00),
  estimated_cost = COALESCE(estimated_cost, 0.00),
  current_stock = COALESCE(current_stock, 0),
  minimum_stock = COALESCE(minimum_stock, 0),
  production_time_minutes = COALESCE(production_time_minutes, 0),
  units_per_batch = COALESCE(units_per_batch, 1);

-- Add constraints
ALTER TABLE products
ALTER COLUMN sale_price SET NOT NULL,
ALTER COLUMN estimated_cost SET NOT NULL,
ALTER COLUMN current_stock SET NOT NULL,
ALTER COLUMN minimum_stock SET NOT NULL,
ALTER COLUMN production_time_minutes SET NOT NULL,
ALTER COLUMN units_per_batch SET NOT NULL;

-- Create indexes for better performance
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_active ON products(active);
CREATE INDEX idx_products_sku ON products(sku);

-- Optional: Migrate data from product_variants if they exist
-- (This assumes product_variants table exists and you want to migrate data)
-- INSERT INTO products (name, description, category, active, sale_price, estimated_cost, current_stock, minimum_stock, sku, created_at, updated_at)
-- SELECT
--   pv.name,
--   'Migrated from variant' as description,
--   'General' as category,
--   true as active,
--   pv.price as sale_price,
--   pv.estimated_cost,
--   pv.stock as current_stock,
--   0 as minimum_stock,
--   NULL as sku,
--   NOW() as created_at,
--   NOW() as updated_at
-- FROM product_variants pv;

-- Optional: Drop product_variants table after migration
-- DROP TABLE IF EXISTS product_variants;
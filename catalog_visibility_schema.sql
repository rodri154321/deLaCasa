-- Public catalog visibility controls
-- Separates internal availability (is_active) from public menu visibility (show_in_catalog).

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS show_in_catalog BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE product_presentations
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS show_in_catalog BOOLEAN NOT NULL DEFAULT TRUE;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'products'
      AND column_name = 'active'
  ) THEN
    UPDATE products
    SET is_active = active
    WHERE active IS NOT NULL;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'product_presentations'
      AND column_name = 'active'
  ) THEN
    UPDATE product_presentations
    SET is_active = active
    WHERE active IS NOT NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_products_catalog_visibility
  ON products (is_active, show_in_catalog);

CREATE INDEX IF NOT EXISTS idx_product_presentations_catalog_visibility
  ON product_presentations (is_active, show_in_catalog);

NOTIFY pgrst, 'reload schema';

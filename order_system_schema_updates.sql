-- Update order_items table to use product_id instead of product_variant_id
ALTER TABLE order_items
RENAME COLUMN product_variant_id TO product_id;

-- Update dashboard views to work with products instead of variants
-- Note: These view definitions need to be updated in your Supabase database

-- Example view updates (run these in Supabase SQL editor):

-- Update dashboard_most_sold_products view
/*
CREATE OR REPLACE VIEW dashboard_most_sold_products AS
SELECT
  p.id as product_id,
  p.name as product_name,
  SUM(oi.quantity) as total_quantity,
  SUM(oi.quantity * oi.unit_price) as sales_amount
FROM order_items oi
JOIN products p ON oi.product_id = p.id
JOIN orders o ON oi.order_id = o.id
WHERE o.status != 'cancelled'
GROUP BY p.id, p.name
ORDER BY total_quantity DESC
LIMIT 10;
*/

-- Update any other views or functions that reference product_variant_id
-- to use product_id instead

-- If you have existing order_items with product_variant_id,
-- you'll need to migrate the data to use product_id values
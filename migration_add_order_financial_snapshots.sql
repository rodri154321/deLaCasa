-- Add unit_cost, subtotal, and profit columns to order_items table
-- This migration adds immutable financial snapshots for order items

ALTER TABLE order_items
ADD COLUMN unit_cost DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN profit DECIMAL(10,2) NOT NULL DEFAULT 0;

-- Update existing records with calculated values
-- Note: For existing orders, we calculate based on current prices
-- But the task specifies to save at order creation time, so existing data may be approximate

UPDATE order_items
SET
  subtotal = quantity * unit_price,
  unit_cost = (
    SELECT COALESCE(p.estimated_cost, 0)
    FROM products p
    WHERE p.id = order_items.product_id
  ),
  profit = (quantity * unit_price) - (
    SELECT COALESCE(p.estimated_cost, 0) * order_items.quantity
    FROM products p
    WHERE p.id = order_items.product_id
  );

-- Add check constraints to ensure data integrity
ALTER TABLE order_items
ADD CONSTRAINT chk_subtotal_calc CHECK (subtotal = quantity * unit_price),
ADD CONSTRAINT chk_profit_calc CHECK (profit = subtotal - (quantity * unit_cost));
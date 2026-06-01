-- Manual Order Pricing Migration

ALTER TABLE orders 
  ADD COLUMN IF NOT EXISTS manual_total NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS manual_total_reason TEXT;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_orders_manual_total ON orders(manual_total);
-- Repair Finance System Migration
-- Fixes unit_cost calculation, removes old references, repairs historical data

-- 1. Set paid_at for existing paid orders
UPDATE orders
SET paid_at = updated_at
WHERE payment_status = 'paid' AND paid_at IS NULL;

-- 2. Update order_items unit_cost to be per presentation unit
UPDATE order_items
SET unit_cost = (
  SELECT COALESCE(p.estimated_cost, 0) / COALESCE(pp.quantity, 1)
  FROM products p
  JOIN product_presentations pp ON pp.id = order_items.presentation_id
  WHERE p.id = order_items.product_id
)
WHERE unit_cost = 0 OR unit_cost IS NULL;

-- 2. Recalculate subtotal and profit
UPDATE order_items
SET
  subtotal = unit_price * quantity,
  profit = (unit_price * quantity) - (unit_cost * quantity)
WHERE subtotal = 0 OR profit = 0 OR subtotal IS NULL OR profit IS NULL;

-- 3. Update views to use product_presentations instead of product_variants

DROP VIEW IF EXISTS dashboard_order_costs;
CREATE OR REPLACE VIEW dashboard_order_costs AS
WITH latest_recipes AS (
    SELECT DISTINCT ON (product_id) id, product_id
    FROM recipes
    ORDER BY product_id, created_at DESC, id
)
SELECT
    oi.order_id,
    SUM(oi.quantity * pp.quantity * (ri.quantity * i.cost_per_unit)) AS order_cost
FROM order_items oi
JOIN product_presentations pp ON pp.id = oi.presentation_id
JOIN latest_recipes lr ON lr.product_id = pp.product_id
JOIN recipe_ingredients ri ON ri.recipe_id = lr.id
JOIN ingredients i ON i.id = ri.ingredient_id
GROUP BY oi.order_id;

CREATE OR REPLACE VIEW dashboard_metrics AS
SELECT
    COALESCE((SELECT SUM(total_amount) FROM orders WHERE status != 'cancelled'), 0) AS total_sales,
    COALESCE((SELECT SUM(total_amount) FROM orders WHERE status != 'cancelled'), 0) AS gross_profit,
    COALESCE((SELECT SUM(c.order_cost)
      FROM dashboard_order_costs c
      JOIN orders o ON o.id = c.order_id
      WHERE o.status != 'cancelled'), 0) AS total_cost,
    COALESCE((SELECT SUM(total_amount) FROM orders WHERE status != 'cancelled'), 0) -
    COALESCE((SELECT SUM(c.order_cost)
      FROM dashboard_order_costs c
      JOIN orders o ON o.id = c.order_id
      WHERE o.status != 'cancelled'), 0) AS net_profit;

CREATE OR REPLACE VIEW dashboard_most_sold_products AS
SELECT
    p.id AS product_id,
    p.name AS product_name,
    pp.name AS presentation_name,
    SUM(oi.quantity * pp.quantity) AS total_quantity,
    SUM(oi.quantity * oi.unit_price) AS sales_amount
FROM order_items oi
JOIN product_presentations pp ON pp.id = oi.presentation_id
JOIN products p ON p.id = pp.product_id
JOIN orders o ON o.id = oi.order_id
WHERE o.status != 'cancelled'
GROUP BY p.id, p.name, pp.name
ORDER BY total_quantity DESC
LIMIT 10;

-- Update calculate_order_profit function
CREATE OR REPLACE FUNCTION calculate_order_profit(p_order_id UUID) RETURNS TABLE(gross_profit NUMERIC(10,2), net_profit NUMERIC(10,2)) AS $$
DECLARE
    v_gross NUMERIC(10,2);
    v_cost NUMERIC(10,2) := 0;
    v_item RECORD;
BEGIN
    SELECT total_amount INTO v_gross FROM orders WHERE id = p_order_id;

    FOR v_item IN
        SELECT oi.quantity, pp.quantity AS presentation_quantity, r.id AS recipe_id
        FROM order_items oi
        JOIN product_presentations pp ON pp.id = oi.presentation_id
        JOIN recipes r ON r.product_id = pp.product_id
        WHERE oi.order_id = p_order_id
    LOOP
        v_cost := v_cost + (v_item.quantity * v_item.presentation_quantity * calculate_recipe_cost(v_item.recipe_id));
    END LOOP;

    RETURN QUERY SELECT COALESCE(v_gross, 0), COALESCE(v_gross, 0) - v_cost;
END;
$$ LANGUAGE plpgsql;

-- Notify schema reload
NOTIFY pgrst, 'reload schema';
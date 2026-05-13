-- Sale Presentations migration for Supabase/PostgreSQL
-- Products remain the production/recipe/stock entity.
-- Presentations describe how products are sold and how many base units each sale deducts.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS product_presentations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    quantity NUMERIC(10,2) NOT NULL CHECK (quantity > 0),
    sale_price NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (sale_price >= 0),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE(product_id, name)
);

CREATE INDEX IF NOT EXISTS idx_product_presentations_product_id
    ON product_presentations(product_id);

CREATE INDEX IF NOT EXISTS idx_product_presentations_active
    ON product_presentations(active);

-- Backfill one "Unidad" presentation for existing active products.
INSERT INTO product_presentations (product_id, name, quantity, sale_price, active)
SELECT p.id, 'Unidad', 1, COALESCE(p.sale_price, 0), TRUE
FROM products p
WHERE NOT EXISTS (
    SELECT 1
    FROM product_presentations pp
    WHERE pp.product_id = p.id
);

-- Fix any NULL sale_price values in existing presentations
UPDATE product_presentations
SET sale_price = 0
WHERE sale_price IS NULL;

ALTER TABLE order_items
    ADD COLUMN IF NOT EXISTS product_presentation_id UUID REFERENCES product_presentations(id);

-- Existing order items are mapped to each product's Unidad presentation when possible.
UPDATE order_items oi
SET product_presentation_id = pp.id
FROM product_presentations pp
WHERE pp.product_id = oi.product_id
  AND pp.name = 'Unidad'
  AND oi.product_presentation_id IS NULL;

ALTER TABLE order_items
    DROP CONSTRAINT IF EXISTS order_items_order_id_product_id_key;

ALTER TABLE order_items
    DROP CONSTRAINT IF EXISTS order_items_order_id_product_variant_id_key;

ALTER TABLE order_items
    ALTER COLUMN product_presentation_id SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_order_items_order_product_presentation
    ON order_items(order_id, product_presentation_id);

CREATE INDEX IF NOT EXISTS idx_order_items_product_presentation_id
    ON order_items(product_presentation_id);

CREATE OR REPLACE FUNCTION insert_order_with_items(
    p_customer_name VARCHAR(255),
    p_customer_email VARCHAR(255),
    p_items JSONB
) RETURNS UUID AS $$
DECLARE
    v_order_id UUID;
    v_item JSONB;
    v_product_id UUID;
    v_presentation_id UUID;
    v_line_quantity INTEGER;
    v_stock_units NUMERIC(10,2);
    v_unit_price NUMERIC(10,2);
    v_total NUMERIC(10,2) := 0;
BEGIN
    INSERT INTO orders (customer_name, customer_email)
    VALUES (TRIM(p_customer_name), NULLIF(TRIM(COALESCE(p_customer_email, '')), ''))
    RETURNING id INTO v_order_id;

    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_presentation_id := (v_item->>'product_presentation_id')::UUID;
        v_line_quantity := COALESCE((v_item->>'quantity')::INTEGER, 0);
        v_unit_price := COALESCE((v_item->>'unit_price')::NUMERIC, 0);

        IF v_line_quantity <= 0 THEN
            RAISE EXCEPTION 'Order item quantity must be greater than 0';
        END IF;

        IF v_unit_price < 0 THEN
            RAISE EXCEPTION 'Unit price cannot be negative';
        END IF;

        SELECT pp.product_id, pp.quantity
        INTO v_product_id, v_stock_units
        FROM product_presentations pp
        JOIN products p ON p.id = pp.product_id
        WHERE pp.id = v_presentation_id
          AND pp.active = TRUE
          AND p.active = TRUE;

        IF v_product_id IS NULL THEN
            RAISE EXCEPTION 'Invalid or inactive product presentation: %', v_presentation_id;
        END IF;

        UPDATE products
        SET current_stock = current_stock - (v_stock_units * v_line_quantity)
        WHERE id = v_product_id
          AND current_stock >= (v_stock_units * v_line_quantity);

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Insufficient stock for product %', v_product_id;
        END IF;

        INSERT INTO order_items (
            order_id,
            product_id,
            product_presentation_id,
            quantity,
            unit_price
        )
        VALUES (
            v_order_id,
            v_product_id,
            v_presentation_id,
            v_line_quantity,
            v_unit_price
        );

        v_total := v_total + COALESCE((v_item->>'subtotal')::NUMERIC, (v_line_quantity * v_unit_price));
    END LOOP;

    UPDATE orders SET total_amount = v_total WHERE id = v_order_id;

    RETURN v_order_id;
END;
$$ LANGUAGE plpgsql;

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
JOIN product_presentations pp ON pp.id = oi.product_presentation_id
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
JOIN product_presentations pp ON pp.id = oi.product_presentation_id
JOIN products p ON p.id = pp.product_id
JOIN orders o ON o.id = oi.order_id
WHERE o.status != 'cancelled'
GROUP BY p.id, p.name, pp.name
ORDER BY total_quantity DESC
LIMIT 10;

CREATE OR REPLACE FUNCTION calculate_order_profit(p_order_id UUID)
RETURNS TABLE(gross_profit NUMERIC(10,2), net_profit NUMERIC(10,2)) AS $$
DECLARE
    v_gross NUMERIC(10,2);
    v_cost NUMERIC(10,2) := 0;
    v_item RECORD;
BEGIN
    SELECT total_amount INTO v_gross FROM orders WHERE id = p_order_id;

    FOR v_item IN
        SELECT oi.quantity, pp.quantity AS presentation_quantity, r.id AS recipe_id
        FROM order_items oi
        JOIN product_presentations pp ON pp.id = oi.product_presentation_id
        JOIN recipes r ON r.product_id = pp.product_id
        WHERE oi.order_id = p_order_id
    LOOP
        v_cost := v_cost + (v_item.quantity * v_item.presentation_quantity * calculate_recipe_cost(v_item.recipe_id));
    END LOOP;

    RETURN QUERY SELECT COALESCE(v_gross, 0), COALESCE(v_gross, 0) - v_cost;
END;
$$ LANGUAGE plpgsql;

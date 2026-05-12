-- Lógica de Negocio para el Sistema de Panadería

-- Agregar costo por unidad para cálculos de ingredientes
ALTER TABLE ingredients ADD COLUMN cost_per_unit DECIMAL(10,2) DEFAULT 0 CHECK (cost_per_unit >= 0);

-- 1. Lógica de Órdenes

-- Función para insertar orden con artículos
CREATE OR REPLACE FUNCTION insert_order_with_items(
    p_customer_name VARCHAR(255),
    p_customer_email VARCHAR(255),
    p_items JSONB -- Array of {product_variant_id: uuid, quantity: int}
) RETURNS UUID AS $$
DECLARE
    v_order_id UUID;
    v_item JSONB;
    v_total DECIMAL(10,2) := 0;
BEGIN
    -- Insert order
    INSERT INTO orders (customer_name, customer_email)
    VALUES (p_customer_name, p_customer_email)
    RETURNING id INTO v_order_id;

    -- Insert items
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        INSERT INTO order_items (order_id, product_variant_id, quantity, unit_price)
        VALUES (
            v_order_id,
            (v_item->>'product_variant_id')::UUID,
            (v_item->>'quantity')::INTEGER,
            (SELECT price FROM product_variants WHERE id = (v_item->>'product_variant_id')::UUID)
        );
        v_total := v_total + ((v_item->>'quantity')::INTEGER * (SELECT price FROM product_variants WHERE id = (v_item->>'product_variant_id')::UUID));
    END LOOP;

    -- Update total_amount
    UPDATE orders SET total_amount = v_total WHERE id = v_order_id;

    RETURN v_order_id;
END;
$$ LANGUAGE plpgsql;

-- Ejemplo de uso:
-- SELECT insert_order_with_items('Jane Doe', 'jane@example.com', '[{"product_variant_id": "uuid1", "quantity": 2}, {"product_variant_id": "uuid2", "quantity": 1}]');

-- 2. Lógica de Producción

-- Función para crear lote de producción y descontar stock
CREATE OR REPLACE FUNCTION create_production_batch(
    p_recipe_id UUID,
    p_quantity_produced INTEGER,
    p_notes TEXT DEFAULT NULL,
    p_extra_costs JSONB DEFAULT '[]'::JSONB
) RETURNS TABLE(
    batch_id UUID,
    material_cost DECIMAL(10,2),
    extra_cost DECIMAL(10,2),
    total_cost DECIMAL(10,2)
) AS $$
DECLARE
    v_ingredient RECORD;
    v_material_cost DECIMAL(10,2) := 0;
    v_extra_cost DECIMAL(10,2) := 0;
    v_cost_item JSONB;
    v_cost_amount DECIMAL(10,2);
    v_total_cost DECIMAL(10,2);
BEGIN
    INSERT INTO production_batches (recipe_id, quantity_produced, notes)
    VALUES (p_recipe_id, p_quantity_produced, p_notes)
    RETURNING id INTO batch_id;

    FOR v_ingredient IN
        SELECT ri.ingredient_id,
               ri.quantity * p_quantity_produced AS total_quantity,
               ri.unit,
               ri.quantity * i.cost_per_unit AS line_cost
        FROM recipe_ingredients ri
        JOIN ingredients i ON i.id = ri.ingredient_id
        WHERE ri.recipe_id = p_recipe_id
    LOOP
        INSERT INTO batch_ingredients (batch_id, ingredient_id, quantity_used, unit)
        VALUES (batch_id, v_ingredient.ingredient_id, v_ingredient.total_quantity, v_ingredient.unit);

        UPDATE ingredients
        SET current_stock = current_stock - v_ingredient.total_quantity
        WHERE id = v_ingredient.ingredient_id;

        v_material_cost := v_material_cost + COALESCE(v_ingredient.line_cost, 0);
    END LOOP;

    FOR v_cost_item IN SELECT * FROM jsonb_array_elements(p_extra_costs)
    LOOP
        v_cost_amount := COALESCE((v_cost_item->>'amount')::DECIMAL, 0);

        INSERT INTO costs (type, amount, description, batch_id)
        VALUES (
            COALESCE((v_cost_item->>'type')::TEXT, 'other'),
            v_cost_amount,
            (v_cost_item->>'description')::TEXT,
            batch_id
        );

        v_extra_cost := v_extra_cost + v_cost_amount;
    END LOOP;

    v_total_cost := v_material_cost + v_extra_cost;
    material_cost := v_material_cost;
    extra_cost := v_extra_cost;
    total_cost := v_total_cost;

    UPDATE production_batches
    SET material_cost = v_material_cost,
        extra_cost = v_extra_cost,
        total_cost = v_total_cost
    WHERE id = batch_id;

    RETURN NEXT;
END;
$$ LANGUAGE plpgsql;

-- Ejemplo de uso:
-- SELECT * FROM create_production_batch(
--   'recipe-uuid',
--   10,
--   'Lote matutino',
--   '[{"type": "gas", "amount": 4.50, "description": "gas horno"}]'
-- );

-- 3. Cálculo de Costos

-- Función para calcular costo por receta
CREATE OR REPLACE FUNCTION calculate_recipe_cost(p_recipe_id UUID) RETURNS DECIMAL(10,2) AS $$
DECLARE
    v_total_cost DECIMAL(10,2) := 0;
BEGIN
    SELECT COALESCE(SUM(ri.quantity * i.cost_per_unit), 0)
    INTO v_total_cost
    FROM recipe_ingredients ri
    JOIN ingredients i ON ri.ingredient_id = i.id
    WHERE ri.recipe_id = p_recipe_id;

    RETURN v_total_cost;
END;
$$ LANGUAGE plpgsql;

-- Función para calcular costo por lote de producción
CREATE OR REPLACE FUNCTION calculate_batch_cost(p_batch_id UUID) RETURNS DECIMAL(10,2) AS $$
DECLARE
    v_material_cost DECIMAL(10,2);
    v_extra_cost DECIMAL(10,2);
BEGIN
    SELECT COALESCE(SUM(bi.quantity_used * i.cost_per_unit), 0)
    INTO v_material_cost
    FROM batch_ingredients bi
    JOIN ingredients i ON bi.ingredient_id = i.id
    WHERE bi.batch_id = p_batch_id;

    SELECT COALESCE(SUM(amount), 0)
    INTO v_extra_cost
    FROM costs
    WHERE batch_id = p_batch_id;

    RETURN v_material_cost + v_extra_cost;
END;
$$ LANGUAGE plpgsql;

-- Ejemplo de uso:
-- SELECT calculate_recipe_cost('recipe-uuid');
-- SELECT calculate_batch_cost('batch-uuid');

-- 4. Cálculo de Ganancias

-- Función para calcular ganancia bruta y neta por orden
-- Bruta: monto_total
-- Neta: monto_total - costo total de ingredientes usados (aproximado por costos de receta)
CREATE OR REPLACE FUNCTION calculate_order_profit(p_order_id UUID) RETURNS TABLE(gross_profit DECIMAL(10,2), net_profit DECIMAL(10,2)) AS $$
DECLARE
    v_gross DECIMAL(10,2);
    v_cost DECIMAL(10,2) := 0;
    v_item RECORD;
BEGIN
    -- Get gross
    SELECT total_amount INTO v_gross FROM orders WHERE id = p_order_id;

    -- Calculate cost: for each item, cost = quantity * (recipe_cost / quantity_produced) but simplified to recipe_cost per unit assuming quantity_produced is yield
    -- Assuming each recipe produces quantity_produced units, cost per unit = recipe_cost / quantity_produced
    -- But since no yield in schema, approximate as recipe_cost (total cost for the batch)
    -- For simplicity, net = gross - sum(recipe_cost for each variant in order)
    FOR v_item IN
        SELECT oi.quantity, r.id AS recipe_id
        FROM order_items oi
        JOIN product_variants pv ON oi.product_variant_id = pv.id
        JOIN recipes r ON r.product_id = pv.product_id
        WHERE oi.order_id = p_order_id
    LOOP
        v_cost := v_cost + (v_item.quantity * calculate_recipe_cost(v_item.recipe_id));
    END LOOP;

    RETURN QUERY SELECT v_gross, v_gross - v_cost;
END;
$$ LANGUAGE plpgsql;

-- Ejemplo de uso:
-- SELECT * FROM calculate_order_profit('order-uuid');

-- 5. Alertas de Stock

-- Consulta para detectar stock bajo
SELECT id, name, current_stock, reorder_level
FROM ingredients
WHERE current_stock <= reorder_level;

-- 6. Vistas del Panel de Control

CREATE OR REPLACE VIEW dashboard_order_costs AS
WITH latest_recipes AS (
    SELECT DISTINCT ON (product_id) id, product_id
    FROM recipes
    ORDER BY product_id, created_at DESC, id
)
SELECT
    oi.order_id,
    SUM(oi.quantity * (ri.quantity * i.cost_per_unit)) AS order_cost
FROM order_items oi
JOIN product_variants pv ON pv.id = oi.product_variant_id
JOIN latest_recipes lr ON lr.product_id = pv.product_id
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

CREATE OR REPLACE VIEW dashboard_low_stock AS
SELECT id, name, current_stock, reorder_level
FROM ingredients
WHERE current_stock <= reorder_level;

CREATE OR REPLACE FUNCTION get_low_stock_ingredients()
RETURNS TABLE (
    ingredient_id UUID,
    name TEXT,
    current_stock DECIMAL(10,2),
    reorder_level DECIMAL(10,2),
    shortage DECIMAL(10,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        id,
        name,
        current_stock,
        reorder_level,
        GREATEST(reorder_level - current_stock, 0)
    FROM ingredients
    WHERE current_stock <= reorder_level
    ORDER BY shortage DESC, current_stock ASC;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE VIEW dashboard_most_sold_products AS
SELECT
    pv.id AS product_variant_id,
    p.name AS product_name,
    pv.name AS variant_name,
    SUM(oi.quantity) AS total_quantity,
    SUM(oi.quantity * oi.unit_price) AS sales_amount
FROM order_items oi
JOIN product_variants pv ON pv.id = oi.product_variant_id
JOIN products p ON p.id = pv.product_id
GROUP BY pv.id, p.name, pv.name
ORDER BY total_quantity DESC
LIMIT 10;

-- Ejemplo de uso: SELECT * FROM get_low_stock_ingredients();
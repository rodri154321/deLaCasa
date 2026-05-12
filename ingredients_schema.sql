-- Create ingredients table with all required fields
CREATE TABLE IF NOT EXISTS ingredients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  unit TEXT NOT NULL DEFAULT 'g',
  current_stock DECIMAL(10,2) DEFAULT 0.00,
  minimum_stock DECIMAL(10,2) DEFAULT 0.00,
  cost_per_unit DECIMAL(10,2) DEFAULT 0.00,
  supplier TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_ingredients_name ON ingredients(name);
CREATE INDEX IF NOT EXISTS idx_ingredients_supplier ON ingredients(supplier);
CREATE INDEX IF NOT EXISTS idx_ingredients_unit ON ingredients(unit);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_ingredients_updated_at
    BEFORE UPDATE ON ingredients
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert some sample data for testing
INSERT INTO ingredients (name, unit, current_stock, minimum_stock, cost_per_unit, supplier, notes) VALUES
('Harina 0000', 'kg', 25.5, 10.0, 45.50, 'Molinos del Sur', 'Harina premium para repostería'),
('Azúcar Impalpable', 'kg', 15.0, 5.0, 38.90, 'Azucarera Nacional', 'Azúcar fina para decoraciones'),
('Manteca', 'kg', 8.0, 3.0, 120.00, 'Lácteos del Valle', 'Manteca sin sal'),
('Chocolate Amargo', 'kg', 12.0, 2.0, 85.00, 'Chocolates Premium', 'Cacao 70%'),
('Leche Condensada', 'units', 48, 12, 25.50, 'Lácteos del Valle', 'Latas de 400g'),
('Dulce de Leche', 'kg', 6.0, 2.0, 65.00, 'Dulces Artesanales', 'Dulce de leche tradicional'),
('Coco Rallado', 'kg', 4.5, 1.5, 55.00, 'Productos Tropicales', 'Coco deshidratado'),
('Esencia de Vainilla', 'ml', 250, 50, 12.00, 'Aromas Naturales', 'Esencia pura de vainilla'),
('Huevos', 'units', 120, 24, 8.50, 'Granja Los Pinos', 'Huevos frescos categoría A'),
('Polvo para Hornear', 'g', 500, 100, 15.00, 'Químicos Alimentarios', 'Polvo para hornear doble acción');

-- Optional: If you had an old ingredients table with reorder_level, migrate the data
-- UPDATE ingredients SET minimum_stock = reorder_level WHERE minimum_stock = 0 AND reorder_level > 0;

-- Optional: Drop old reorder_level column if it exists
-- ALTER TABLE ingredients DROP COLUMN IF EXISTS reorder_level;
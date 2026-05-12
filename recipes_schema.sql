-- Create recipes table
CREATE TABLE IF NOT EXISTS recipes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  notes TEXT,
  estimated_cost DECIMAL(10,2) DEFAULT 0.00,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create recipe_ingredients table (junction table)
CREATE TABLE IF NOT EXISTS recipe_ingredients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  ingredient_id UUID NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
  quantity DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(recipe_id, ingredient_id) -- Prevent duplicate ingredients per recipe
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_recipes_product_id ON recipes(product_id);
CREATE INDEX IF NOT EXISTS idx_recipes_name ON recipes(name);
CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_recipe_id ON recipe_ingredients(recipe_id);
CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_ingredient_id ON recipe_ingredients(ingredient_id);

-- Create trigger to update updated_at timestamp for recipes
CREATE OR REPLACE FUNCTION update_recipes_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_recipes_updated_at
    BEFORE UPDATE ON recipes
    FOR EACH ROW
    EXECUTE FUNCTION update_recipes_updated_at_column();

-- Insert some sample data for testing
-- First, get some product and ingredient IDs (these will vary)
-- INSERT INTO recipes (product_id, name, notes, estimated_cost) VALUES
-- ((SELECT id FROM products WHERE name LIKE '%Alfajor%' LIMIT 1), 'Alfajor Maicena Clásico', 'Receta tradicional para alfajores de maicena', 25.50);

-- Then add ingredients to the recipe
-- INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity) VALUES
-- ((SELECT id FROM recipes WHERE name = 'Alfajor Maicena Clásico'), (SELECT id FROM ingredients WHERE name LIKE '%Harina%' LIMIT 1), 500.00),
-- ((SELECT id FROM recipes WHERE name = 'Alfajor Maicena Clásico'), (SELECT id FROM ingredients WHERE name LIKE '%Azúcar%' LIMIT 1), 300.00),
-- ((SELECT id FROM recipes WHERE name = 'Alfajor Maicena Clásico'), (SELECT id FROM ingredients WHERE name LIKE '%Manteca%' LIMIT 1), 200.00);

-- Note: The actual sample data insertion should be done manually after the tables are created
-- and you know the actual UUIDs of products and ingredients in your database.
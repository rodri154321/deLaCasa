-- ============================================
-- FINANCIAL SYSTEM SCHEMA
-- Table: financial_transactions
-- ============================================

CREATE TABLE IF NOT EXISTS financial_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  category TEXT NOT NULL,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS (Row Level Security) can be added if needed
-- ALTER TABLE financial_transactions ENABLE ROW LEVEL SECURITY;

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_financial_transactions_type
  ON financial_transactions(type);

CREATE INDEX IF NOT EXISTS idx_financial_transactions_category
  ON financial_transactions(category);

CREATE INDEX IF NOT EXISTS idx_financial_transactions_created_at
  ON financial_transactions(created_at);

CREATE INDEX IF NOT EXISTS idx_financial_transactions_type_created
  ON financial_transactions(type, created_at);

-- ============================================
-- SAMPLE DATA (optional, for testing)
-- ============================================

-- Uncomment to insert sample data:
/*
INSERT INTO financial_transactions (type, category, amount, description)
VALUES
  ('expense', 'ingredientes', 2500.00, 'Compra de harina y dulce de leche'),
  ('expense', 'packaging', 800.00, 'Cajas para alfajores'),
  ('expense', 'delivery', 600.00, 'Envíos de la semana'),
  ('income', 'venta manual', 4500.00, 'Venta feria artesanal'),
  ('income', 'evento', 12000.00, 'Mesa dulce cumpleaños'),
  ('expense', 'publicidad', 1500.00, 'Instagram ads');
*/

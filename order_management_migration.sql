-- Advanced Order Management Migration
-- Add order lifecycle fields with safe column additions

-- Add order status with default 'pending'
ALTER TABLE orders ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'preparing', 'ready', 'delivered', 'cancelled'));

-- Add payment status with default 'unpaid'
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20) DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'paid', 'partial'));

-- Add payment method
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_method VARCHAR(20) CHECK (payment_method IN ('cash', 'transfer', 'debit', 'credit', 'mercadopago'));

-- Add delivery timestamp
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP WITH TIME ZONE;

-- Add payment timestamp
ALTER TABLE orders ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP WITH TIME ZONE;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_delivered_at ON orders(delivered_at);
CREATE INDEX IF NOT EXISTS idx_orders_paid_at ON orders(paid_at);

-- Update existing orders to have proper status if they were created without it
UPDATE orders SET status = 'pending' WHERE status IS NULL;
UPDATE orders SET payment_status = 'unpaid' WHERE payment_status IS NULL;

-- Function to automatically set timestamps based on status changes
CREATE OR REPLACE FUNCTION update_order_timestamps()
RETURNS TRIGGER AS $$
BEGIN
    -- Set delivered_at when status changes to 'delivered'
    IF NEW.status = 'delivered' AND OLD.status != 'delivered' THEN
        NEW.delivered_at = COALESCE(NEW.delivered_at, NOW());
    END IF;

    -- Set paid_at when payment_status changes to 'paid'
    IF NEW.payment_status = 'paid' AND OLD.payment_status != 'paid' THEN
        NEW.paid_at = COALESCE(NEW.paid_at, NOW());
    END IF;

    -- Clear timestamps if status changes back
    IF NEW.status != 'delivered' AND OLD.status = 'delivered' THEN
        NEW.delivered_at = NULL;
    END IF;

    IF NEW.payment_status != 'paid' AND OLD.payment_status = 'paid' THEN
        NEW.paid_at = NULL;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp management
DROP TRIGGER IF EXISTS trigger_update_order_timestamps ON orders;
CREATE TRIGGER trigger_update_order_timestamps
    BEFORE UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION update_order_timestamps();

-- Notify schema reload
NOTIFY pgrst, 'reload schema';
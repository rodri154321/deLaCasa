-- Simple authentication setup for bakery app
-- Single password stored in app_settings table

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS app_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_password TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Insert default password (change 'bakery2024' to your desired password)
-- Use bcrypt hashing for security in production
INSERT INTO app_settings (app_password)
VALUES ('bakery2024')
ON CONFLICT DO NOTHING;

-- Function to validate password
CREATE OR REPLACE FUNCTION validate_app_password(input_password TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM app_settings
    WHERE app_password = input_password
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
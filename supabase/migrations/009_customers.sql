-- Phase 5: Customers table for future WhatsApp integration

CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text UNIQUE,
  birthday date NULL,
  address text NULL,
  notes text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Link orders to customers optionally
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_id uuid REFERENCES customers(id) NULL;

-- RLS
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read customers"
  ON customers FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage customers"
  ON customers FOR ALL
  TO authenticated
  USING (true);

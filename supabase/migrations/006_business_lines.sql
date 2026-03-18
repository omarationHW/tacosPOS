-- Phase 1: Business Lines foundation

-- 1. Enum type
DO $$ BEGIN
  CREATE TYPE business_line_type AS ENUM ('hamburguesas', 'carnitas');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. Business lines table
CREATE TABLE IF NOT EXISTS business_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug business_line_type UNIQUE NOT NULL,
  name text NOT NULL,
  schedule jsonb NOT NULL DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Seed business lines
INSERT INTO business_lines (slug, name, schedule) VALUES
  ('hamburguesas', 'Hamburguesas', '{"days": ["friday", "saturday"], "start": "17:00", "end": "22:30"}'),
  ('carnitas', 'Carnitas', '{"days": ["saturday", "sunday"], "start": "08:00", "end": "15:00"}')
ON CONFLICT (slug) DO NOTHING;

-- 3. Profile-business-lines junction table
CREATE TABLE IF NOT EXISTS profile_business_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  business_line_id uuid NOT NULL REFERENCES business_lines(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (profile_id, business_line_id)
);

-- 4. Add business_line_id to categories, products, orders, cash_register_sessions
ALTER TABLE categories
  ADD COLUMN IF NOT EXISTS business_line_id uuid REFERENCES business_lines(id);

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS business_line_id uuid REFERENCES business_lines(id);

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS business_line_id uuid REFERENCES business_lines(id);

ALTER TABLE cash_register_sessions
  ADD COLUMN IF NOT EXISTS business_line_id uuid REFERENCES business_lines(id);

-- 5. Backfill existing records with hamburguesas
UPDATE categories SET business_line_id = (SELECT id FROM business_lines WHERE slug = 'hamburguesas')
  WHERE business_line_id IS NULL;

UPDATE products SET business_line_id = (SELECT id FROM business_lines WHERE slug = 'hamburguesas')
  WHERE business_line_id IS NULL;

UPDATE orders SET business_line_id = (SELECT id FROM business_lines WHERE slug = 'hamburguesas')
  WHERE business_line_id IS NULL;

UPDATE cash_register_sessions SET business_line_id = (SELECT id FROM business_lines WHERE slug = 'hamburguesas')
  WHERE business_line_id IS NULL;

-- 6. Set NOT NULL after backfill
ALTER TABLE categories ALTER COLUMN business_line_id SET NOT NULL;
ALTER TABLE products ALTER COLUMN business_line_id SET NOT NULL;
ALTER TABLE orders ALTER COLUMN business_line_id SET NOT NULL;
ALTER TABLE cash_register_sessions ALTER COLUMN business_line_id SET NOT NULL;

-- 7. Assign all existing profiles to both business lines
INSERT INTO profile_business_lines (profile_id, business_line_id)
SELECT p.id, bl.id
FROM profiles p CROSS JOIN business_lines bl
ON CONFLICT DO NOTHING;

-- 8. RLS policies for business_lines (read-only for authenticated)
ALTER TABLE business_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read business_lines"
  ON business_lines FOR SELECT
  TO authenticated
  USING (true);

-- 9. RLS policies for profile_business_lines
ALTER TABLE profile_business_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read profile_business_lines"
  ON profile_business_lines FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage profile_business_lines"
  ON profile_business_lines FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

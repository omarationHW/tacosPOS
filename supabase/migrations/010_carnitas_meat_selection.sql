-- Phase 6: Carnitas meat type selection at order time
-- Adds a required "Tipo de carne" modifier group to carnitas products sold by weight
-- (½ kilo, 1 kilo, 3 kilos, etc.) so the cashier picks the cut when taking the order.

DO $$
DECLARE
  v_group_id uuid;
  v_carnitas_line_id uuid;
BEGIN
  SELECT id INTO v_carnitas_line_id
  FROM business_lines
  WHERE slug = 'carnitas';

  IF v_carnitas_line_id IS NULL THEN
    RAISE NOTICE 'Carnitas business line not found, skipping migration.';
    RETURN;
  END IF;

  -- 1. Modifier group (idempotent by name)
  SELECT id INTO v_group_id
  FROM modifier_groups
  WHERE name = 'Tipo de carne';

  IF v_group_id IS NULL THEN
    INSERT INTO modifier_groups (name, is_required, min_select, max_select, is_active)
    VALUES ('Tipo de carne', true, 1, 1, true)
    RETURNING id INTO v_group_id;
  ELSE
    UPDATE modifier_groups
    SET is_required = true,
        min_select  = 1,
        max_select  = 1,
        is_active   = true
    WHERE id = v_group_id;
  END IF;

  -- 2. Default carnitas cuts (idempotent by group + name)
  INSERT INTO modifiers (modifier_group_id, name, price_override, sort_order, is_active)
  SELECT v_group_id, cuts.name, 0, cuts.sort_order, true
  FROM (VALUES
    ('Maciza',   1),
    ('Surtida',  2),
    ('Costilla', 3),
    ('Buche',    4),
    ('Cuerito',  5)
  ) AS cuts(name, sort_order)
  WHERE NOT EXISTS (
    SELECT 1 FROM modifiers
    WHERE modifier_group_id = v_group_id AND name = cuts.name
  );

  -- 3. Attach the group to carnitas products sold by weight.
  --    Matches "1/2 kilo", "1 kilo", "3 kilos", "medio kilo", etc.
  INSERT INTO product_modifier_groups (product_id, modifier_group_id)
  SELECT p.id, v_group_id
  FROM products p
  WHERE p.business_line_id = v_carnitas_line_id
    AND p.name ILIKE '%kilo%'
    AND NOT EXISTS (
      SELECT 1
      FROM product_modifier_groups pmg
      WHERE pmg.product_id = p.id
        AND pmg.modifier_group_id = v_group_id
    );
END $$;

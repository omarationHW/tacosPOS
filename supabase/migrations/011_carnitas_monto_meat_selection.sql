-- Phase 6b: Carnitas meat type selection for "montos" products
-- La migración 010 adjuntó el grupo "Tipo de carne" solo a los productos por
-- kilo (nombre ILIKE '%kilo%'). Los productos por MONTO ($100, $200, ...), que
-- viven en la categoría de "Montos", quedaron sin selección de corte, por lo que
-- en Cocina/Cuentas/comanda no se veía de qué carne era el pedido.
--
-- Esta migración adjunta el mismo grupo "Tipo de carne" a los productos de la(s)
-- categoría(s) de montos de la línea carnitas. Es idempotente: puede correrse
-- varias veces sin duplicar. Detecta la categoría por nombre ILIKE '%monto%'.

DO $$
DECLARE
  v_group_id uuid;
  v_carnitas_line_id uuid;
  v_attached int;
BEGIN
  SELECT id INTO v_carnitas_line_id
  FROM business_lines
  WHERE slug = 'carnitas';

  IF v_carnitas_line_id IS NULL THEN
    RAISE NOTICE 'Carnitas business line not found, skipping migration.';
    RETURN;
  END IF;

  -- 1. Grupo "Tipo de carne" (reutiliza el de 010; lo crea si no existe).
  SELECT id INTO v_group_id
  FROM modifier_groups
  WHERE name = 'Tipo de carne';

  IF v_group_id IS NULL THEN
    INSERT INTO modifier_groups (name, is_required, min_select, max_select, is_active)
    VALUES ('Tipo de carne', true, 1, 1, true)
    RETURNING id INTO v_group_id;
  END IF;

  -- 2. Cortes por defecto (idempotente por grupo + nombre), por si 010 no corrió.
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

  -- 3. Adjuntar el grupo a los productos de la categoría de "montos" de carnitas.
  --    Se identifica la categoría por nombre (Montos / Por monto / etc.).
  INSERT INTO product_modifier_groups (product_id, modifier_group_id)
  SELECT p.id, v_group_id
  FROM products p
  JOIN categories c ON c.id = p.category_id
  WHERE p.business_line_id = v_carnitas_line_id
    AND c.business_line_id = v_carnitas_line_id
    AND c.name ILIKE '%monto%'
    AND NOT EXISTS (
      SELECT 1
      FROM product_modifier_groups pmg
      WHERE pmg.product_id = p.id
        AND pmg.modifier_group_id = v_group_id
    );

  GET DIAGNOSTICS v_attached = ROW_COUNT;
  RAISE NOTICE 'Tipo de carne adjuntado a % producto(s) de montos.', v_attached;

  IF v_attached = 0 THEN
    RAISE NOTICE 'No se encontraron productos de montos (categoría ILIKE %%monto%%). Revisa el nombre de la categoría.';
  END IF;
END $$;

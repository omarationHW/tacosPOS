-- Phase 6c: Producto "Otro monto" (monto libre) para carnitas
-- Crea un producto de precio 0 en la categoría "Por monto" de la línea carnitas.
-- El POS lo detecta (precio 0 + categoría de montos) y, al agregarlo, abre un
-- modal para escribir el monto en $ y elegir el tipo de carne. Así el cliente
-- puede pedir cantidades que no están en los botones fijos ($100, $200, ...).
--
-- Idempotente: no duplica el producto ni la relación con el grupo de carne.

DO $$
DECLARE
  v_carnitas_line_id uuid;
  v_category_id uuid;
  v_group_id uuid;
  v_product_id uuid;
BEGIN
  SELECT id INTO v_carnitas_line_id
  FROM business_lines WHERE slug = 'carnitas';

  IF v_carnitas_line_id IS NULL THEN
    RAISE NOTICE 'Línea carnitas no encontrada, saltando.';
    RETURN;
  END IF;

  -- Categoría de montos (Por monto / Montos / etc.)
  SELECT id INTO v_category_id
  FROM categories
  WHERE business_line_id = v_carnitas_line_id
    AND name ILIKE '%monto%'
  ORDER BY sort_order
  LIMIT 1;

  IF v_category_id IS NULL THEN
    RAISE NOTICE 'No se encontró categoría de montos, saltando.';
    RETURN;
  END IF;

  -- Producto "Otro monto" (idempotente por nombre + categoría)
  SELECT id INTO v_product_id
  FROM products
  WHERE category_id = v_category_id AND name = 'Otro monto';

  IF v_product_id IS NULL THEN
    INSERT INTO products (
      business_line_id, category_id, name, description, price, is_active, sort_order
    )
    VALUES (
      v_carnitas_line_id, v_category_id, 'Otro monto',
      'Escribe el monto en $ y elige el tipo de carne', 0, true, 999
    )
    RETURNING id INTO v_product_id;
  END IF;

  -- Adjuntar el grupo "Tipo de carne" (idempotente)
  SELECT id INTO v_group_id
  FROM modifier_groups WHERE name = 'Tipo de carne';

  IF v_group_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM product_modifier_groups
    WHERE product_id = v_product_id AND modifier_group_id = v_group_id
  ) THEN
    INSERT INTO product_modifier_groups (product_id, modifier_group_id)
    VALUES (v_product_id, v_group_id);
  END IF;

  RAISE NOTICE 'Producto "Otro monto" listo (id %).', v_product_id;
END $$;

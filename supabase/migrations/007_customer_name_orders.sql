-- Phase 2: Customer name on orders (replaces table-based ordering)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_name text NULL;

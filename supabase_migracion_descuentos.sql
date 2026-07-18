-- ============================================================
--  DESCUENTOS (porcentaje por producto)
--  Corre esto en Supabase > SQL Editor (una sola vez).
-- ============================================================

-- Porcentaje de descuento (0 = sin descuento, 100 = gratis).
alter table productos
  add column if not exists descuento int not null default 0
  check (descuento between 0 and 100);

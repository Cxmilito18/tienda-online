-- ============================================================
--  FASE 1 — STOCK (inventario)
--  Corre esto en Supabase > SQL Editor (una sola vez).
--  Agrega inventario a tus productos sin borrar nada.
-- ============================================================

-- 1) Cantidad disponible de cada producto (default 0)
alter table productos
  add column if not exists stock int not null default 0;

-- 2) Mínimo antes de avisarte que reabastezcas (default 3)
alter table productos
  add column if not exists stock_minimo int not null default 3;

-- 3) A tus productos que YA existen les ponemos un stock inicial
--    de 10 para que no aparezcan como "Agotado". Luego ajustas
--    el número real desde el panel de admin.
update productos set stock = 10 where stock = 0;

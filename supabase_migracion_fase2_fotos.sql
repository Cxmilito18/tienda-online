-- ============================================================
--  FASE 2 — VARIAS FOTOS POR PRODUCTO
--  Corre esto en Supabase > SQL Editor (una sola vez).
-- ============================================================

-- Lista de fotos adicionales del producto (galería).
-- La foto de portada sigue siendo imagen_url; estas son las extra.
alter table productos
  add column if not exists imagenes text[] not null default '{}';

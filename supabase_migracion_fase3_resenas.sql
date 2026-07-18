-- ============================================================
--  FASE 3 — RESEÑAS Y COMENTARIOS
--  Corre esto en Supabase > SQL Editor (una sola vez).
--  Cualquiera puede enviar reseñas, pero quedan OCULTAS hasta
--  que tú (admin) las apruebes.
-- ============================================================

-- ---------- 1) Tabla de reseñas ----------
create table if not exists resenas (
  id uuid primary key default gen_random_uuid(),
  producto_id uuid not null references productos(id) on delete cascade,
  nombre text not null,
  calificacion int not null check (calificacion between 1 and 5),
  comentario text,
  aprobada boolean not null default false,
  created_at timestamptz default now()
);

-- Índice para buscar rápido las reseñas de un producto
create index if not exists resenas_producto_idx on resenas (producto_id);

-- ---------- 2) Seguridad (RLS) ----------
alter table resenas enable row level security;

-- Limpia políticas viejas si vuelves a correr el script
drop policy if exists "resenas lectura aprobadas" on resenas;
drop policy if exists "resenas lectura admin" on resenas;
drop policy if exists "resenas insert publica" on resenas;
drop policy if exists "resenas update admin" on resenas;
drop policy if exists "resenas delete admin" on resenas;

-- El público SOLO ve las reseñas aprobadas
create policy "resenas lectura aprobadas"
  on resenas for select
  using (aprobada = true);

-- El admin (autenticado) ve TODAS, aprobadas o no
create policy "resenas lectura admin"
  on resenas for select
  to authenticated
  using (true);

-- Cualquiera puede ENVIAR una reseña, pero siempre como NO aprobada
-- (no puede auto-aprobarse: el with check lo impide)
create policy "resenas insert publica"
  on resenas for insert
  with check (aprobada = false);

-- Solo el admin puede APROBAR / editar
create policy "resenas update admin"
  on resenas for update
  to authenticated
  using (true)
  with check (true);

-- Solo el admin puede BORRAR
create policy "resenas delete admin"
  on resenas for delete
  to authenticated
  using (true);

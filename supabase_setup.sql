-- ============================================================
--  SETUP DE SUPABASE (v2) — corre esto en el SQL Editor
--  Incluye: categorías + seguridad con Supabase Auth
-- ============================================================
-- Si ya tenías la tabla productos de antes, este script la
-- actualiza sin borrar tus datos.

-- ---------- 1) Tabla de categorías ----------
create table if not exists categorias (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique,
  created_at timestamptz default now()
);

-- ---------- 2) Tabla de productos ----------
create table if not exists productos (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  descripcion text,
  precio numeric not null default 0,
  imagen_url text,
  categoria_id uuid references categorias(id) on delete set null,
  created_at timestamptz default now()
);

-- Si la tabla productos ya existía, agrega la columna categoria_id:
alter table productos
  add column if not exists categoria_id uuid references categorias(id) on delete set null;

-- ---------- 3) Habilitar RLS ----------
alter table productos enable row level security;
alter table categorias enable row level security;

-- ---------- 4) Limpiar políticas viejas (si existían) ----------
drop policy if exists "lectura publica productos" on productos;
drop policy if exists "escritura productos" on productos;

-- ---------- 5) Políticas PRODUCTOS ----------
-- Cualquiera puede LEER (catálogo público)
create policy "productos lectura publica"
  on productos for select
  using (true);

-- Solo usuarios AUTENTICADOS pueden crear/editar/borrar
create policy "productos escritura autenticada"
  on productos for insert
  to authenticated
  with check (true);

create policy "productos update autenticada"
  on productos for update
  to authenticated
  using (true)
  with check (true);

create policy "productos delete autenticada"
  on productos for delete
  to authenticated
  using (true);

-- ---------- 6) Políticas CATEGORÍAS ----------
create policy "categorias lectura publica"
  on categorias for select
  using (true);

create policy "categorias escritura autenticada"
  on categorias for insert
  to authenticated
  with check (true);

create policy "categorias delete autenticada"
  on categorias for delete
  to authenticated
  using (true);

-- ============================================================
--  STORAGE (fotos)
-- ============================================================
-- En Storage crea un bucket PÚBLICO llamado: productos
-- Luego corre estas políticas para que solo autenticados suban:

create policy "storage lectura publica"
  on storage.objects for select
  using (bucket_id = 'productos');

create policy "storage subida autenticada"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'productos');

create policy "storage borrado autenticado"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'productos');

-- ============================================================
--  CREAR TU USUARIO ADMIN
-- ============================================================
-- Ve a: Authentication > Users > Add user > Create new user
-- Pon tu correo y una contraseña. Con ese correo/clave entras
-- al panel /admin.

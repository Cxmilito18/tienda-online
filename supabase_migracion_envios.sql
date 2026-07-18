-- ============================================================
--  ENVÍOS POR ZONA + MÉTODO DE ENTREGA
--  Corre esto en Supabase > SQL Editor (una sola vez).
--  El cliente elige "recoger en la escuela" (gratis) o "envío"
--  a una zona (con su costo). Las zonas las maneja el admin.
-- ============================================================

-- ---------- 1) Zonas de envío (editables por el admin) ----------
create table if not exists zonas_envio (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  costo numeric not null default 0,
  created_at timestamptz default now()
);

alter table zonas_envio enable row level security;

drop policy if exists "zonas lectura publica" on zonas_envio;
drop policy if exists "zonas insert admin" on zonas_envio;
drop policy if exists "zonas update admin" on zonas_envio;
drop policy if exists "zonas delete admin" on zonas_envio;

-- El público lee las zonas (para elegir en el checkout)
create policy "zonas lectura publica" on zonas_envio
  for select using (true);
-- Solo el admin las gestiona
create policy "zonas insert admin" on zonas_envio
  for insert to authenticated with check (true);
create policy "zonas update admin" on zonas_envio
  for update to authenticated using (true) with check (true);
create policy "zonas delete admin" on zonas_envio
  for delete to authenticated using (true);

-- ---------- 2) Columnas de entrega en pedidos ----------
alter table pedidos
  add column if not exists metodo_entrega text not null default 'recoger';
alter table pedidos
  add column if not exists zona_envio text;
alter table pedidos
  add column if not exists costo_envio numeric not null default 0;

-- ---------- 3) Nueva versión de crear_pedido (con entrega) ----------
-- Se elimina la versión anterior (5 parámetros) y se crea la nueva.
drop function if exists crear_pedido(text, text, text, text, jsonb);

create or replace function crear_pedido(
  p_nombre text,
  p_telefono text,
  p_direccion text,
  p_notas text,
  p_items jsonb,
  p_metodo_entrega text,
  p_zona_id uuid
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pedido_id uuid;
  v_numero bigint;
  v_total numeric := 0;
  v_item jsonb;
  v_prod productos%rowtype;
  v_cant int;
  v_precio numeric;
  v_metodo text;
  v_costo_envio numeric := 0;
  v_zona_nombre text := null;
  v_zona zonas_envio%rowtype;
begin
  if p_nombre is null or length(trim(p_nombre)) = 0 then
    raise exception 'El nombre es obligatorio';
  end if;
  if p_telefono is null or length(trim(p_telefono)) = 0 then
    raise exception 'El teléfono es obligatorio';
  end if;
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'El carrito está vacío';
  end if;

  -- Método de entrega
  v_metodo := coalesce(nullif(trim(p_metodo_entrega), ''), 'recoger');
  if v_metodo = 'envio' then
    if p_zona_id is null then
      raise exception 'Elige una zona de envío';
    end if;
    select * into v_zona from zonas_envio where id = p_zona_id;
    if not found then
      raise exception 'La zona de envío no es válida';
    end if;
    if p_direccion is null or length(trim(p_direccion)) = 0 then
      raise exception 'La dirección es obligatoria para envío';
    end if;
    v_costo_envio := v_zona.costo;
    v_zona_nombre := v_zona.nombre;
  elsif v_metodo <> 'recoger' then
    raise exception 'Método de entrega inválido';
  end if;

  insert into pedidos (
    cliente_nombre, cliente_telefono, cliente_direccion, notas,
    total, estado, metodo_entrega, zona_envio, costo_envio
  ) values (
    trim(p_nombre),
    trim(p_telefono),
    nullif(trim(coalesce(p_direccion, '')), ''),
    nullif(trim(coalesce(p_notas, '')), ''),
    0,
    'pendiente',
    v_metodo,
    v_zona_nombre,
    v_costo_envio
  ) returning id, numero into v_pedido_id, v_numero;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_cant := (v_item->>'cantidad')::int;
    if v_cant is null or v_cant < 1 then
      raise exception 'Cantidad inválida';
    end if;

    select * into v_prod from productos
      where id = (v_item->>'producto_id')::uuid for update;
    if not found then
      raise exception 'Uno de los productos ya no está disponible';
    end if;
    if v_prod.stock < v_cant then
      raise exception 'Sin stock suficiente de %', v_prod.nombre;
    end if;

    v_precio := round(v_prod.precio * (1 - coalesce(v_prod.descuento, 0)::numeric / 100));

    insert into pedido_items (pedido_id, producto_id, nombre, precio, cantidad)
    values (v_pedido_id, v_prod.id, v_prod.nombre, v_precio, v_cant);

    update productos set stock = stock - v_cant where id = v_prod.id;

    v_total := v_total + v_precio * v_cant;
  end loop;

  -- Suma el costo de envío al total
  v_total := v_total + v_costo_envio;
  update pedidos set total = v_total where id = v_pedido_id;

  return jsonb_build_object(
    'id', v_pedido_id,
    'numero', v_numero,
    'total', v_total,
    'costo_envio', v_costo_envio
  );
end;
$$;

grant execute on function crear_pedido(text, text, text, text, jsonb, text, uuid)
  to anon, authenticated;

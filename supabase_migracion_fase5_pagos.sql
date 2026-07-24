-- ============================================================
--  FASE 5 — PAGOS (Nequi / Daviplata / Bancolombia + comprobante)
--  Corre esto en Supabase > SQL Editor (una sola vez).
--
--  El cliente elige como paga, ve tus datos y tu QR, transfiere
--  desde su app y sube el comprobante. Tu lo verificas y marcas
--  el pedido como pagado.
--
--  Los comprobantes se guardan en un bucket PRIVADO: solo tu,
--  autenticado como admin, puedes verlos.
-- ============================================================

-- ---------- 1) Metodos de pago (los configuras en el admin) ----------
create table if not exists metodos_pago (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,                 -- Ej. "Nequi", "Daviplata", "Bancolombia"
  titular text,                         -- A nombre de quien esta la cuenta
  numero text,                          -- Numero de celular o de cuenta
  instrucciones text,                   -- Texto libre para el cliente
  qr_url text,                          -- Imagen del QR (opcional)
  requiere_comprobante boolean not null default true,
  activo boolean not null default true,
  created_at timestamptz default now()
);

alter table metodos_pago enable row level security;

drop policy if exists "metodos lectura publica" on metodos_pago;
drop policy if exists "metodos lectura admin" on metodos_pago;
drop policy if exists "metodos insert admin" on metodos_pago;
drop policy if exists "metodos update admin" on metodos_pago;
drop policy if exists "metodos delete admin" on metodos_pago;

-- El publico solo ve los metodos activos
create policy "metodos lectura publica" on metodos_pago
  for select using (activo = true);
-- El admin ve todos (activos e inactivos)
create policy "metodos lectura admin" on metodos_pago
  for select to authenticated using (true);
create policy "metodos insert admin" on metodos_pago
  for insert to authenticated with check (true);
create policy "metodos update admin" on metodos_pago
  for update to authenticated using (true) with check (true);
create policy "metodos delete admin" on metodos_pago
  for delete to authenticated using (true);

-- ---------- 2) Datos de pago en el pedido ----------
alter table pedidos
  add column if not exists metodo_pago text;
-- Ruta del comprobante dentro del bucket privado (no es una URL publica)
alter table pedidos
  add column if not exists comprobante_url text;
-- pendiente = sin pagar | reportado = subio comprobante | verificado = tu lo confirmaste
alter table pedidos
  add column if not exists pago_estado text not null default 'pendiente';

-- ---------- 3) Bucket PRIVADO para los comprobantes ----------
insert into storage.buckets (id, name, public)
values ('comprobantes', 'comprobantes', false)
on conflict (id) do nothing;

drop policy if exists "comprobantes subida publica" on storage.objects;
drop policy if exists "comprobantes lectura admin" on storage.objects;
drop policy if exists "comprobantes borrado admin" on storage.objects;

-- Cualquiera puede SUBIR su comprobante...
create policy "comprobantes subida publica" on storage.objects
  for insert with check (bucket_id = 'comprobantes');
-- ...pero solo el admin puede VERLOS (son datos sensibles)
create policy "comprobantes lectura admin" on storage.objects
  for select to authenticated using (bucket_id = 'comprobantes');
create policy "comprobantes borrado admin" on storage.objects
  for delete to authenticated using (bucket_id = 'comprobantes');

-- ---------- 4) crear_pedido ahora guarda el metodo de pago ----------
drop function if exists crear_pedido(text, text, text, text, jsonb, text, uuid);

create or replace function crear_pedido(
  p_nombre text,
  p_telefono text,
  p_direccion text,
  p_notas text,
  p_items jsonb,
  p_metodo_entrega text,
  p_zona_id uuid,
  p_metodo_pago_id uuid
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
  v_pago metodos_pago%rowtype;
  v_pago_nombre text := null;
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

  -- Metodo de entrega
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

  -- Metodo de pago (opcional, pero si viene debe existir y estar activo)
  if p_metodo_pago_id is not null then
    select * into v_pago from metodos_pago
      where id = p_metodo_pago_id and activo = true;
    if not found then
      raise exception 'El método de pago no es válido';
    end if;
    v_pago_nombre := v_pago.nombre;
  end if;

  insert into pedidos (
    cliente_nombre, cliente_telefono, cliente_direccion, notas,
    total, estado, metodo_entrega, zona_envio, costo_envio,
    metodo_pago, pago_estado
  ) values (
    trim(p_nombre),
    trim(p_telefono),
    nullif(trim(coalesce(p_direccion, '')), ''),
    nullif(trim(coalesce(p_notas, '')), ''),
    0,
    'pendiente',
    v_metodo,
    v_zona_nombre,
    v_costo_envio,
    v_pago_nombre,
    'pendiente'
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

  v_total := v_total + v_costo_envio;
  update pedidos set total = v_total where id = v_pedido_id;

  return jsonb_build_object(
    'id', v_pedido_id,
    'numero', v_numero,
    'total', v_total,
    'costo_envio', v_costo_envio,
    'metodo_pago', v_pago_nombre
  );
end;
$$;

grant execute on function crear_pedido(text, text, text, text, jsonb, text, uuid, uuid)
  to anon, authenticated;

-- ---------- 5) El cliente reporta su pago (sube comprobante) ----------
-- Solo puede pasar de 'pendiente' a 'reportado'. Nadie puede
-- auto-marcarse como 'verificado': eso solo lo haces tu en el panel.
create or replace function reportar_pago(
  p_pedido_id uuid,
  p_comprobante text
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_comprobante is null or length(trim(p_comprobante)) = 0 then
    raise exception 'Falta el comprobante';
  end if;

  update pedidos
    set comprobante_url = p_comprobante,
        pago_estado = 'reportado'
  where id = p_pedido_id
    and pago_estado = 'pendiente';

  if not found then
    raise exception 'No se pudo registrar el comprobante de este pedido';
  end if;

  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function reportar_pago(uuid, text) to anon, authenticated;

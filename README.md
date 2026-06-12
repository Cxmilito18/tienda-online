# Mi Tienda — catálogo + carrito + admin

Tienda web tipo Adidas/Alkosto. Catálogo público, panel de admin para agregar productos con foto/precio/descripción, y checkout por WhatsApp. Stack: **React + Vite + Supabase**, lista para desplegar en **Vercel**.

---

## 1. Instalar

```bash
npm install
```

## 2. Configurar Supabase

1. Crea un proyecto gratis en https://supabase.com
2. Ve a **SQL Editor** y corre el contenido de `supabase_setup.sql`.
3. Ve a **Storage** → crea un bucket llamado exactamente `productos` y márcalo como **público**.
4. Ve a **Project Settings → API** y copia:
   - `Project URL`
   - `anon public key`
5. Copia `.env.example` a `.env` y pega esos dos valores:

```bash
cp .env.example .env
```

## 3. Personalizar tu tienda

Edita `src/lib/config.js`:

- `nombre`, `eslogan`, `descripcion` → tu marca y texto del banner
- `logoUrl` → tu logo (ponlo en `/public` o pega un link)
- `whatsapp` → tu número con código de país, sin `+` (Colombia: `573001234567`)
- `colores` → colores de tu marca
- `ADMIN_PASSWORD` → cambia la contraseña del panel de admin

## 4. Correr local

```bash
npm run dev
```

- Tienda: `http://localhost:5173`
- Admin: `http://localhost:5173/admin`

## 5. Desplegar en Vercel

1. Sube el proyecto a GitHub.
2. En https://vercel.com → **Add New → Project** → importa el repo.
3. En **Environment Variables** agrega `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` (los mismos del `.env`).
4. Deploy. Queda online 24/7.

---

## Notas de seguridad

Para arrancar rápido, el panel admin usa una contraseña simple y las políticas de Supabase permiten escritura con la anon key. Cuando quieras endurecerlo:

- Usa **Supabase Auth** para el login del admin.
- Restringe las políticas de `insert/delete` al rol autenticado en vez de `true`.

El catálogo (lectura) ya es público, que es lo que quieres.

## Estructura

```
src/
  lib/config.js       ← TODO lo personalizable (marca, whatsapp, colores, clave admin)
  lib/supabase.js     ← conexión a Supabase
  pages/Home.jsx      ← catálogo público
  pages/Admin.jsx     ← panel admin (login + form + lista)
  components/         ← Header, ProductCard, CartDrawer
  context/CartContext ← estado del carrito
```

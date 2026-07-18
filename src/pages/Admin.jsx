import { useEffect, useState } from 'react'
import { supabase, STORAGE_BUCKET } from '../lib/supabase.js'
import { formatPrecio } from '../lib/format.js'

export default function Admin() {
  const [session, setSession] = useState(undefined) // undefined = cargando

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) =>
      setSession(s)
    )
    return () => sub.subscription.unsubscribe()
  }, [])

  if (session === undefined) return <div className="spinner" />
  if (!session) return <Login />
  return <AdminPanel session={session} />
}

/* ---------------- LOGIN (Supabase Auth) ---------------- */
function Login() {
  const [email, setEmail] = useState('')
  const [pass, setPass] = useState('')
  const [err, setErr] = useState('')
  const [cargando, setCargando] = useState(false)

  async function entrar() {
    setErr('')
    setCargando(true)
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: pass,
    })
    if (error) setErr('Correo o contraseña incorrectos.')
    setCargando(false)
  }

  return (
    <div className="login-box">
      <h2>Panel de administrador</h2>
      <p className="sub">Ingresa con tu correo y contraseña.</p>
      {err && <div className="msg msg-err">{err}</div>}
      <div className="field">
        <label>Correo</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="tucorreo@ejemplo.com"
        />
      </div>
      <div className="field">
        <label>Contraseña</label>
        <input
          type="password"
          value={pass}
          onChange={(e) => setPass(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && entrar()}
        />
      </div>
      <button className="btn btn-block" onClick={entrar} disabled={cargando}>
        {cargando ? 'Entrando...' : 'Entrar'}
      </button>
    </div>
  )
}

/* ---------------- PANEL ---------------- */
const FORM_VACIO = {
  id: null,
  nombre: '',
  descripcion: '',
  precio: '',
  categoria_id: '',
  imagen_url: '',
  stock: '',
  stock_minimo: '',
  imagenes: [], // fotos adicionales ya guardadas (URLs)
}

function AdminPanel() {
  const [productos, setProductos] = useState([])
  const [categorias, setCategorias] = useState([])
  const [loading, setLoading] = useState(true)

  // formulario (sirve para crear Y editar)
  const [form, setForm] = useState(FORM_VACIO)
  const editando = form.id !== null

  // productos cuyo stock cayó a su mínimo (o menos)
  const porReabastecer = productos.filter(
    (p) => (p.stock ?? 0) <= (p.stock_minimo ?? 0)
  )

  const [modoImg, setModoImg] = useState('archivo')
  const [archivo, setArchivo] = useState(null)
  const [previewUrl, setPreviewUrl] = useState('')
  const [urlImg, setUrlImg] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [msg, setMsg] = useState(null)

  // fotos adicionales nuevas (archivos por subir al guardar)
  const [nuevasFotos, setNuevasFotos] = useState([])

  // categorías
  const [nuevaCat, setNuevaCat] = useState('')

  useEffect(() => {
    cargar()
  }, [])

  async function cargar() {
    setLoading(true)
    const [{ data: prods }, { data: cats }] = await Promise.all([
      supabase
        .from('productos')
        .select('*, categorias(nombre)')
        .order('created_at', { ascending: false }),
      supabase.from('categorias').select('*').order('nombre'),
    ])
    setProductos(
      (prods || []).map((p) => ({
        ...p,
        categoria_nombre: p.categorias?.nombre || null,
      }))
    )
    setCategorias(cats || [])
    setLoading(false)
  }

  function setField(k, v) {
    setForm((f) => ({ ...f, [k]: v }))
  }

  function onArchivo(e) {
    const f = e.target.files?.[0]
    if (!f) return
    setArchivo(f)
    setPreviewUrl(URL.createObjectURL(f))
  }

  // Sube un archivo al Storage y devuelve su URL pública
  async function subirArchivo(file) {
    const ext = file.name.split('.').pop()
    const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
    const { error: upErr } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(path, file)
    if (upErr) throw upErr
    return supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path).data
      .publicUrl
  }

  // --- galería (fotos adicionales) ---
  function onNuevasFotos(e) {
    const files = Array.from(e.target.files || [])
    if (files.length) setNuevasFotos((prev) => [...prev, ...files])
    e.target.value = '' // permite volver a elegir el mismo archivo
  }

  function quitarFotoExistente(url) {
    setForm((f) => ({ ...f, imagenes: f.imagenes.filter((u) => u !== url) }))
  }

  function quitarFotoNueva(idx) {
    setNuevasFotos((prev) => prev.filter((_, i) => i !== idx))
  }

  function resetForm() {
    setForm(FORM_VACIO)
    setArchivo(null)
    setPreviewUrl('')
    setUrlImg('')
    setModoImg('archivo')
    setNuevasFotos([])
  }

  function editarProducto(p) {
    setForm({
      id: p.id,
      nombre: p.nombre,
      descripcion: p.descripcion || '',
      precio: String(p.precio),
      categoria_id: p.categoria_id || '',
      imagen_url: p.imagen_url || '',
      stock: String(p.stock ?? ''),
      stock_minimo: String(p.stock_minimo ?? ''),
      imagenes: p.imagenes || [],
    })
    setNuevasFotos([])
    setPreviewUrl(p.imagen_url || '')
    setUrlImg('')
    setArchivo(null)
    setModoImg('actual') // conserva la imagen existente
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function guardar() {
    setMsg(null)
    if (!form.nombre.trim() || !form.precio) {
      setMsg({ tipo: 'err', texto: 'Nombre y precio son obligatorios.' })
      return
    }

    setGuardando(true)
    try {
      let imagen_url = form.imagen_url // por defecto conserva la actual

      if (modoImg === 'archivo') {
        if (!archivo) {
          setMsg({ tipo: 'err', texto: 'Selecciona una imagen.' })
          setGuardando(false)
          return
        }
        imagen_url = await subirArchivo(archivo)
      } else if (modoImg === 'url') {
        if (!urlImg.trim()) {
          setMsg({ tipo: 'err', texto: 'Pega un link de imagen.' })
          setGuardando(false)
          return
        }
        imagen_url = urlImg.trim()
      }
      // modoImg === 'actual' -> conserva form.imagen_url

      // Sube las fotos adicionales nuevas y las une con las ya guardadas
      const urlsNuevas = []
      for (const file of nuevasFotos) {
        urlsNuevas.push(await subirArchivo(file))
      }
      const imagenes = [...form.imagenes, ...urlsNuevas]

      const payload = {
        nombre: form.nombre.trim(),
        descripcion: form.descripcion.trim(),
        precio: Number(form.precio),
        categoria_id: form.categoria_id || null,
        imagen_url,
        stock: Number(form.stock) || 0,
        stock_minimo: Number(form.stock_minimo) || 0,
        imagenes,
      }

      if (editando) {
        const { error } = await supabase
          .from('productos')
          .update(payload)
          .eq('id', form.id)
        if (error) throw error
        setMsg({ tipo: 'ok', texto: 'Producto actualizado.' })
      } else {
        const { error } = await supabase.from('productos').insert(payload)
        if (error) throw error
        setMsg({ tipo: 'ok', texto: 'Producto agregado.' })
      }

      resetForm()
      cargar()
    } catch (err) {
      setMsg({ tipo: 'err', texto: 'Error: ' + (err.message || err) })
    } finally {
      setGuardando(false)
    }
  }

  async function borrar(id) {
    if (!confirm('¿Eliminar este producto?')) return
    await supabase.from('productos').delete().eq('id', id)
    if (form.id === id) resetForm()
    cargar()
  }

  async function crearCategoria() {
    const nombre = nuevaCat.trim()
    if (!nombre) return
    const { error } = await supabase.from('categorias').insert({ nombre })
    if (error) {
      setMsg({ tipo: 'err', texto: 'Esa categoría ya existe o hubo un error.' })
      return
    }
    setNuevaCat('')
    cargar()
  }

  async function borrarCategoria(id) {
    if (!confirm('¿Eliminar esta categoría? Los productos quedarán sin categoría.'))
      return
    await supabase.from('categorias').delete().eq('id', id)
    cargar()
  }

  return (
    <div className="admin">
      <div className="admin-top">
        <h2>Administrar tienda</h2>
        <button className="logout-btn" onClick={() => supabase.auth.signOut()}>
          Cerrar sesión
        </button>
      </div>
      <p className="sub">Gestiona productos y categorías de tu tienda.</p>

      {/* ---- ALERTA DE REABASTECIMIENTO ---- */}
      {porReabastecer.length > 0 && (
        <div className="restock-alert">
          <strong>
            ⚠️ {porReabastecer.length}{' '}
            {porReabastecer.length === 1
              ? 'producto necesita'
              : 'productos necesitan'}{' '}
            reabastecerse
          </strong>
          <ul>
            {porReabastecer.map((p) => (
              <li key={p.id}>
                {p.nombre} —{' '}
                {p.stock === 0 ? (
                  <span className="agotado">AGOTADO</span>
                ) : (
                  <>quedan {p.stock}</>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ---- GESTIÓN DE CATEGORÍAS ---- */}
      <div className="form-card">
        <h3>Categorías</h3>
        <div className="field" style={{ marginBottom: 10 }}>
          <label>Crear nueva categoría</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              value={nuevaCat}
              onChange={(e) => setNuevaCat(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && crearCategoria()}
              placeholder="Ej. Bolsos, Ropa, Accesorios..."
            />
            <button className="btn btn-acento" onClick={crearCategoria}>
              + Crear
            </button>
          </div>
        </div>
        {categorias.length > 0 && (
          <div className="cat-manager">
            {categorias.map((c) => (
              <span className="cat-tag" key={c.id}>
                {c.nombre}
                <button onClick={() => borrarCategoria(c.id)} title="Eliminar">
                  ✕
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* ---- FORMULARIO PRODUCTO ---- */}
      <div className="form-card">
        <h3>{editando ? 'Editar producto' : 'Agregar producto'}</h3>

        {msg && (
          <div className={`msg ${msg.tipo === 'ok' ? 'msg-ok' : 'msg-err'}`}>
            {msg.texto}
          </div>
        )}

        <div className="field">
          <label>Nombre del producto</label>
          <input
            value={form.nombre}
            onChange={(e) => setField('nombre', e.target.value)}
            placeholder="Ej. Camiseta Pumas edición 2026"
          />
        </div>

        <div className="field">
          <label>Descripción</label>
          <textarea
            value={form.descripcion}
            onChange={(e) => setField('descripcion', e.target.value)}
            placeholder="Breve descripción que verá el cliente"
          />
        </div>

        <div className="row2">
          <div className="field">
            <label>Precio (COP)</label>
            <input
              type="number"
              value={form.precio}
              onChange={(e) => setField('precio', e.target.value)}
              placeholder="Ej. 59900"
            />
          </div>
          <div className="field">
            <label>Categoría</label>
            <select
              value={form.categoria_id}
              onChange={(e) => setField('categoria_id', e.target.value)}
            >
              <option value="">Sin categoría</option>
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="row2">
          <div className="field">
            <label>Stock (cantidad disponible)</label>
            <input
              type="number"
              min="0"
              value={form.stock}
              onChange={(e) => setField('stock', e.target.value)}
              placeholder="Ej. 20"
            />
          </div>
          <div className="field">
            <label>Avisar cuando baje de</label>
            <input
              type="number"
              min="0"
              value={form.stock_minimo}
              onChange={(e) => setField('stock_minimo', e.target.value)}
              placeholder="Ej. 3"
            />
          </div>
        </div>

        <div className="field">
          <label>Imagen del producto</label>
          <div className="tabs">
            {editando && (
              <button
                className={`tab ${modoImg === 'actual' ? 'active' : ''}`}
                onClick={() => setModoImg('actual')}
              >
                Mantener actual
              </button>
            )}
            <button
              className={`tab ${modoImg === 'archivo' ? 'active' : ''}`}
              onClick={() => setModoImg('archivo')}
            >
              Subir archivo
            </button>
            <button
              className={`tab ${modoImg === 'url' ? 'active' : ''}`}
              onClick={() => setModoImg('url')}
            >
              Pegar link
            </button>
          </div>

          {modoImg === 'archivo' && (
            <>
              <input type="file" accept="image/*" onChange={onArchivo} />
              {previewUrl && (
                <img className="preview-img" src={previewUrl} alt="preview" />
              )}
            </>
          )}
          {modoImg === 'url' && (
            <>
              <input
                value={urlImg}
                onChange={(e) => {
                  setUrlImg(e.target.value)
                  setPreviewUrl(e.target.value)
                }}
                placeholder="https://..."
              />
              {previewUrl && (
                <img
                  className="preview-img"
                  src={previewUrl}
                  alt="preview"
                  onError={(e) => (e.currentTarget.style.display = 'none')}
                />
              )}
            </>
          )}
          {modoImg === 'actual' && previewUrl && (
            <img className="preview-img" src={previewUrl} alt="actual" />
          )}
        </div>

        {/* ---- FOTOS ADICIONALES (galería) ---- */}
        <div className="field">
          <label>Fotos adicionales (galería)</label>
          <p className="hint">
            La foto de arriba es la portada. Aquí puedes agregar más fotos
            para que el cliente vea mejor el producto.
          </p>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={onNuevasFotos}
          />
          {(form.imagenes.length > 0 || nuevasFotos.length > 0) && (
            <div className="galeria-admin">
              {form.imagenes.map((url) => (
                <div className="galeria-admin-item" key={url}>
                  <img src={url} alt="foto" />
                  <button
                    type="button"
                    onClick={() => quitarFotoExistente(url)}
                    title="Quitar"
                  >
                    ✕
                  </button>
                </div>
              ))}
              {nuevasFotos.map((file, i) => (
                <div className="galeria-admin-item nueva" key={i}>
                  <img src={URL.createObjectURL(file)} alt="nueva" />
                  <button
                    type="button"
                    onClick={() => quitarFotoNueva(i)}
                    title="Quitar"
                  >
                    ✕
                  </button>
                  <span className="badge-nueva">nueva</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            className="btn btn-acento btn-block"
            onClick={guardar}
            disabled={guardando}
          >
            {guardando
              ? 'Guardando...'
              : editando
              ? 'Guardar cambios'
              : '+ Agregar producto'}
          </button>
          {editando && (
            <button className="btn btn-ghost" onClick={resetForm}>
              Cancelar
            </button>
          )}
        </div>
      </div>

      {/* ---- LISTA ---- */}
      <h3 style={{ fontWeight: 800, marginBottom: 12 }}>
        Productos publicados ({productos.length})
      </h3>

      {loading ? (
        <div className="spinner" />
      ) : (
        <div className="admin-list">
          {productos.map((p) => (
            <div className="admin-row" key={p.id}>
              <img src={p.imagen_url} alt={p.nombre} />
              <div className="info">
                <strong>{p.nombre}</strong>
                <span>
                  {formatPrecio(p.precio)}
                  {p.categoria_nombre ? ` · ${p.categoria_nombre}` : ''}
                </span>
                <span
                  className={`stock-tag ${
                    (p.stock ?? 0) <= (p.stock_minimo ?? 0) ? 'bajo' : ''
                  }`}
                >
                  {(p.stock ?? 0) === 0
                    ? '● Agotado'
                    : `● Stock: ${p.stock}`}
                </span>
              </div>
              <div className="admin-actions">
                <button className="edit-btn" onClick={() => editarProducto(p)}>
                  Editar
                </button>
                <button className="del-btn" onClick={() => borrar(p.id)}>
                  Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

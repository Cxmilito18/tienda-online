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
}

function AdminPanel() {
  const [productos, setProductos] = useState([])
  const [categorias, setCategorias] = useState([])
  const [loading, setLoading] = useState(true)

  // formulario (sirve para crear Y editar)
  const [form, setForm] = useState(FORM_VACIO)
  const editando = form.id !== null

  const [modoImg, setModoImg] = useState('archivo')
  const [archivo, setArchivo] = useState(null)
  const [previewUrl, setPreviewUrl] = useState('')
  const [urlImg, setUrlImg] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [msg, setMsg] = useState(null)

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

  function resetForm() {
    setForm(FORM_VACIO)
    setArchivo(null)
    setPreviewUrl('')
    setUrlImg('')
    setModoImg('archivo')
  }

  function editarProducto(p) {
    setForm({
      id: p.id,
      nombre: p.nombre,
      descripcion: p.descripcion || '',
      precio: String(p.precio),
      categoria_id: p.categoria_id || '',
      imagen_url: p.imagen_url || '',
    })
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
        const ext = archivo.name.split('.').pop()
        const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
        const { error: upErr } = await supabase.storage
          .from(STORAGE_BUCKET)
          .upload(path, archivo)
        if (upErr) throw upErr
        imagen_url = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path)
          .data.publicUrl
      } else if (modoImg === 'url') {
        if (!urlImg.trim()) {
          setMsg({ tipo: 'err', texto: 'Pega un link de imagen.' })
          setGuardando(false)
          return
        }
        imagen_url = urlImg.trim()
      }
      // modoImg === 'actual' -> conserva form.imagen_url

      const payload = {
        nombre: form.nombre.trim(),
        descripcion: form.descripcion.trim(),
        precio: Number(form.precio),
        categoria_id: form.categoria_id || null,
        imagen_url,
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

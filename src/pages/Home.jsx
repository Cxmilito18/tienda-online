import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { STORE } from '../lib/config.js'
import ProductCard from '../components/ProductCard.jsx'

export default function Home() {
  const [productos, setProductos] = useState([])
  const [categorias, setCategorias] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [q, setQ] = useState('')
  const [catActiva, setCatActiva] = useState('todas')

  useEffect(() => {
    cargar()
  }, [])

  async function cargar() {
    setLoading(true)
    const [{ data: prods, error: e1 }, { data: cats }] = await Promise.all([
      supabase
        .from('productos')
        .select('*, categorias(nombre)')
        .order('created_at', { ascending: false }),
      supabase.from('categorias').select('*').order('nombre'),
    ])

    if (e1) {
      setError('No se pudieron cargar los productos.')
    } else {
      // aplanar el nombre de categoría
      setProductos(
        (prods || []).map((p) => ({
          ...p,
          categoria_nombre: p.categorias?.nombre || null,
        }))
      )
      setCategorias(cats || [])
    }
    setLoading(false)
  }

  const filtrados = productos.filter((p) => {
    const matchQ = p.nombre.toLowerCase().includes(q.toLowerCase())
    const matchCat =
      catActiva === 'todas' || p.categoria_id === catActiva
    return matchQ && matchCat
  })

  function scrollToCatalog() {
    document
      .getElementById('catalogo')
      ?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <>
      {/* ---------- HERO ---------- */}
      <section className={`hero ${STORE.heroImagen ? 'has-img' : ''}`}>
        {STORE.heroImagen && (
          <div
            className="hero-bg"
            style={{ backgroundImage: `url(${STORE.heroImagen})` }}
          />
        )}
        <div className="hero-inner">
          <span className="hero-eyebrow">🏀 {STORE.eslogan}</span>
          <h2>{STORE.heroTitulo}</h2>
          <p>{STORE.heroSubtitulo}</p>
          <button className="hero-cta" onClick={scrollToCatalog}>
            Ver productos →
          </button>
        </div>
      </section>

      {/* ---------- BENEFICIOS ---------- */}
      <section className="beneficios">
        <div className="beneficios-grid">
          {STORE.beneficios.map((b, i) => (
            <div className="beneficio" key={i}>
              <span className="ico">{b.icono}</span>
              <span className="txt">{b.texto}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ---------- CATÁLOGO ---------- */}
      <main className="catalog" id="catalogo">
        <div className="catalog-head">
          <h3>Nuestros productos</h3>
          <input
            className="search"
            placeholder="Buscar producto..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>

        {/* chips de categoría */}
        {categorias.length > 0 && (
          <div className="chips">
            <button
              className={`chip ${catActiva === 'todas' ? 'active' : ''}`}
              onClick={() => setCatActiva('todas')}
            >
              Todas
            </button>
            {categorias.map((c) => (
              <button
                key={c.id}
                className={`chip ${catActiva === c.id ? 'active' : ''}`}
                onClick={() => setCatActiva(c.id)}
              >
                {c.nombre}
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <div className="spinner" />
        ) : error ? (
          <div className="empty">
            <strong>Algo salió mal</strong>
            {error}
          </div>
        ) : filtrados.length === 0 ? (
          <div className="empty">
            <strong>Aún no hay productos</strong>
            {q || catActiva !== 'todas'
              ? 'No encontramos productos con ese filtro.'
              : 'Agrega productos desde el panel de administración.'}
          </div>
        ) : (
          <div className="grid">
            {filtrados.map((p) => (
              <ProductCard key={p.id} producto={p} />
            ))}
          </div>
        )}
      </main>

      {/* ---------- FOOTER ---------- */}
      <footer className="site-footer">
        <div className="inner">
          <div>
            <strong>{STORE.nombre}</strong> — {STORE.eslogan}
          </div>
          <a
            className="wa"
            href={`https://wa.me/${STORE.whatsapp}`}
            target="_blank"
            rel="noreferrer"
          >
            Escríbenos por WhatsApp
          </a>
        </div>
      </footer>
    </>
  )
}

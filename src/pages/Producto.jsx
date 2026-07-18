import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { formatPrecio } from '../lib/format.js'
import { useCart } from '../context/CartContext.jsx'
import Lightbox from '../components/Lightbox.jsx'

const PLACEHOLDER =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600"><rect width="600" height="600" fill="%23eef1f7"/><text x="50%" y="50%" font-size="26" fill="%23999" text-anchor="middle" dy=".3em">Sin imagen</text></svg>'

export default function Producto() {
  const { id } = useParams()
  const { add } = useCart()

  const [producto, setProducto] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activa, setActiva] = useState(0) // índice de la foto seleccionada
  const [zoom, setZoom] = useState(false)

  useEffect(() => {
    cargar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  async function cargar() {
    setLoading(true)
    setActiva(0)
    const { data, error: e } = await supabase
      .from('productos')
      .select('*, categorias(nombre)')
      .eq('id', id)
      .single()

    if (e || !data) {
      setError('No encontramos este producto.')
    } else {
      setProducto({ ...data, categoria_nombre: data.categorias?.nombre || null })
    }
    setLoading(false)
  }

  if (loading) return <div className="spinner" />

  if (error || !producto) {
    return (
      <div className="detalle-wrap">
        <div className="empty">
          <strong>Producto no encontrado</strong>
          {error || 'Puede que se haya eliminado.'}
        </div>
        <Link className="btn btn-ghost" to="/">
          ← Volver a la tienda
        </Link>
      </div>
    )
  }

  // Galería = portada + fotos adicionales (sin vacíos ni repetidas)
  const fotos = [producto.imagen_url, ...(producto.imagenes || [])].filter(
    (src, i, arr) => src && arr.indexOf(src) === i
  )
  if (fotos.length === 0) fotos.push(PLACEHOLDER)

  const stock = producto.stock ?? 0
  const stockMinimo = producto.stock_minimo ?? 0
  const agotado = stock === 0
  const pocasUnidades = !agotado && stock <= stockMinimo
  const fotoActual = fotos[activa] || fotos[0]

  return (
    <div className="detalle-wrap">
      <Link className="detalle-volver" to="/">
        ← Volver a la tienda
      </Link>

      <div className="detalle">
        {/* ---- GALERÍA ---- */}
        <div className="detalle-galeria">
          <div
            className="galeria-principal"
            onClick={() => setZoom(true)}
            title="Click para ampliar"
          >
            {agotado && <span className="card-agotado-badge">Agotado</span>}
            <img
              src={fotoActual}
              alt={producto.nombre}
              onError={(e) => (e.currentTarget.src = PLACEHOLDER)}
            />
            <span className="card-zoom">🔍</span>
          </div>

          {fotos.length > 1 && (
            <div className="galeria-miniaturas">
              {fotos.map((src, i) => (
                <button
                  key={i}
                  className={`miniatura ${i === activa ? 'active' : ''}`}
                  onClick={() => setActiva(i)}
                >
                  <img
                    src={src}
                    alt={`${producto.nombre} ${i + 1}`}
                    onError={(e) => (e.currentTarget.src = PLACEHOLDER)}
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ---- INFO ---- */}
        <div className="detalle-info">
          {producto.categoria_nombre && (
            <span className="detalle-cat">{producto.categoria_nombre}</span>
          )}
          <h1>{producto.nombre}</h1>
          <div className="detalle-precio">{formatPrecio(producto.precio)}</div>

          {agotado ? (
            <span className="detalle-stock agotado">Agotado por ahora</span>
          ) : pocasUnidades ? (
            <span className="detalle-stock pocas">
              🔥{' '}
              {stock === 1 ? '¡Última unidad!' : `¡Últimas ${stock} unidades!`}
            </span>
          ) : (
            <span className="detalle-stock hay">✔ Disponible</span>
          )}

          {producto.descripcion && (
            <p className="detalle-desc">{producto.descripcion}</p>
          )}

          <button
            className="btn btn-acento btn-block"
            onClick={() => add(producto)}
            disabled={agotado}
          >
            {agotado ? 'Agotado' : 'Agregar al carrito'}
          </button>
        </div>
      </div>

      {zoom && (
        <Lightbox
          src={fotoActual}
          alt={producto.nombre}
          onClose={() => setZoom(false)}
        />
      )}
    </div>
  )
}

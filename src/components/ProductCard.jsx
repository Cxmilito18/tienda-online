import { formatPrecio } from '../lib/format.js'
import { useCart } from '../context/CartContext.jsx'

const PLACEHOLDER =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300"><rect width="300" height="300" fill="%23eef1f7"/><text x="50%" y="50%" font-size="16" fill="%23999" text-anchor="middle" dy=".3em">Sin imagen</text></svg>'

export default function ProductCard({ producto, onZoom }) {
  const { add } = useCart()
  const img = producto.imagen_url || PLACEHOLDER
  const stock = producto.stock ?? 0
  const stockMinimo = producto.stock_minimo ?? 0
  const agotado = stock === 0
  const pocasUnidades = !agotado && stock <= stockMinimo

  return (
    <div className={`card ${agotado ? 'card-agotado' : ''}`}>
      <div className="card-img" onClick={() => onZoom(img, producto.nombre)}>
        {producto.categoria_nombre && (
          <span className="card-cat">{producto.categoria_nombre}</span>
        )}
        {agotado && <span className="card-agotado-badge">Agotado</span>}
        <img
          src={img}
          alt={producto.nombre}
          onError={(e) => (e.currentTarget.src = PLACEHOLDER)}
          loading="lazy"
        />
        <span className="card-zoom">🔍</span>
      </div>
      <div className="card-body">
        <h4>{producto.nombre}</h4>
        {producto.descripcion && (
          <p className="card-desc">{producto.descripcion}</p>
        )}
        <div className="card-precio">{formatPrecio(producto.precio)}</div>
        {pocasUnidades && (
          <span className="card-pocas">¡Últimas {stock} unidades!</span>
        )}
        <button
          className="btn btn-block"
          onClick={() => add(producto)}
          disabled={agotado}
          style={{ marginTop: 6 }}
        >
          {agotado ? 'Agotado' : 'Agregar al carrito'}
        </button>
      </div>
    </div>
  )
}

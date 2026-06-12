import { formatPrecio } from '../lib/format.js'
import { useCart } from '../context/CartContext.jsx'

const PLACEHOLDER =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300"><rect width="300" height="300" fill="%23eef1f7"/><text x="50%" y="50%" font-size="16" fill="%23999" text-anchor="middle" dy=".3em">Sin imagen</text></svg>'

export default function ProductCard({ producto, onZoom }) {
  const { add } = useCart()
  const img = producto.imagen_url || PLACEHOLDER

  return (
    <div className="card">
      <div className="card-img" onClick={() => onZoom(img, producto.nombre)}>
        {producto.categoria_nombre && (
          <span className="card-cat">{producto.categoria_nombre}</span>
        )}
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
        <button
          className="btn btn-block"
          onClick={() => add(producto)}
          style={{ marginTop: 6 }}
        >
          Agregar al carrito
        </button>
      </div>
    </div>
  )
}

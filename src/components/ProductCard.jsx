import { useNavigate } from 'react-router-dom'
import { formatPrecio, precioFinal, tieneDescuento } from '../lib/format.js'
import { useCart } from '../context/CartContext.jsx'

const PLACEHOLDER =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300"><rect width="300" height="300" fill="%23eef1f7"/><text x="50%" y="50%" font-size="16" fill="%23999" text-anchor="middle" dy=".3em">Sin imagen</text></svg>'

export default function ProductCard({ producto }) {
  const { add } = useCart()
  const navigate = useNavigate()
  const img = producto.imagen_url || PLACEHOLDER
  const stock = producto.stock ?? 0
  const stockMinimo = producto.stock_minimo ?? 0
  const agotado = stock === 0
  const pocasUnidades = !agotado && stock <= stockMinimo
  const numFotos = 1 + (producto.imagenes?.length || 0)
  const conDescuento = tieneDescuento(producto)
  const precio = precioFinal(producto)

  function verDetalle() {
    navigate(`/producto/${producto.id}`)
  }

  return (
    <div className={`card ${agotado ? 'card-agotado' : ''}`}>
      <div className="card-img" onClick={verDetalle} title="Ver producto">
        {producto.categoria_nombre && (
          <span className="card-cat">{producto.categoria_nombre}</span>
        )}
        {conDescuento && (
          <span className="card-descuento">-{producto.descuento}%</span>
        )}
        {agotado && <span className="card-agotado-badge">Agotado</span>}
        <img
          src={img}
          alt={producto.nombre}
          onError={(e) => (e.currentTarget.src = PLACEHOLDER)}
          loading="lazy"
        />
        {numFotos > 1 && <span className="card-fotos">📷 {numFotos}</span>}
      </div>
      <div className="card-body">
        <h4 className="card-titulo" onClick={verDetalle}>
          {producto.nombre}
        </h4>
        {producto.descripcion && (
          <p className="card-desc">{producto.descripcion}</p>
        )}
        <div className="card-precio">
          {conDescuento && (
            <span className="precio-tachado">
              {formatPrecio(producto.precio)}
            </span>
          )}
          {precio === 0 ? '¡GRATIS!' : formatPrecio(precio)}
        </div>
        {pocasUnidades && (
          <span className="card-pocas">
            {stock === 1 ? '¡Última unidad!' : `¡Últimas ${stock} unidades!`}
          </span>
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

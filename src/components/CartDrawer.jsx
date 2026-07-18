import { useNavigate } from 'react-router-dom'
import { formatPrecio } from '../lib/format.js'
import { useCart } from '../context/CartContext.jsx'

export default function CartDrawer() {
  const { items, remove, setQty, total, clear, open, setOpen } = useCart()
  const navigate = useNavigate()

  if (!open) return null

  function irACheckout() {
    if (items.length === 0) return
    setOpen(false)
    navigate('/checkout')
  }

  return (
    <>
      <div className="drawer-overlay" onClick={() => setOpen(false)} />
      <aside className="drawer">
        <div className="drawer-head">
          <h3>Tu carrito</h3>
          <button className="icon-btn" onClick={() => setOpen(false)}>
            ✕
          </button>
        </div>

        <div className="drawer-body">
          {items.length === 0 ? (
            <div className="empty">
              <strong>Tu carrito está vacío</strong>
              Agrega productos para empezar tu pedido.
            </div>
          ) : (
            items.map((i) => (
              <div className="cart-item" key={i.id}>
                <img src={i.imagen_url} alt={i.nombre} />
                <div className="cart-item-info">
                  <h5>{i.nombre}</h5>
                  <span className="precio">{formatPrecio(i.precio)}</span>
                  <div className="qty">
                    <button onClick={() => setQty(i.id, i.cantidad - 1)}>
                      −
                    </button>
                    <span>{i.cantidad}</span>
                    <button onClick={() => setQty(i.id, i.cantidad + 1)}>
                      +
                    </button>
                    <button
                      className="del-btn"
                      style={{ marginLeft: 'auto' }}
                      onClick={() => remove(i.id)}
                    >
                      Quitar
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {items.length > 0 && (
          <div className="drawer-foot">
            <div className="total-row">
              <span>Total</span>
              <span>{formatPrecio(total)}</span>
            </div>
            <button className="btn btn-acento btn-block" onClick={irACheckout}>
              Finalizar compra
            </button>
            <button
              className="btn btn-ghost btn-block"
              style={{ marginTop: 8 }}
              onClick={clear}
            >
              Vaciar carrito
            </button>
          </div>
        )}
      </aside>
    </>
  )
}

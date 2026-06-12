import { Link } from 'react-router-dom'
import { STORE } from '../lib/config.js'
import { useCart } from '../context/CartContext.jsx'

// Nota: el acceso al panel de administrador es por la URL /admin
// (no hay botón visible para que los clientes no lo vean).

export default function Header() {
  const { count, setOpen } = useCart()

  return (
    <header className="header">
      <div className="header-inner">
        <Link to="/" className="brand">
          <img src={STORE.logoUrl} alt={STORE.nombre} />
          <div className="brand-text">
            <h1>{STORE.nombre}</h1>
            <span>{STORE.eslogan}</span>
          </div>
        </Link>

        <div className="header-actions">
          <button
            className="icon-btn"
            onClick={() => setOpen(true)}
            title="Carrito"
          >
            🛒
            {count > 0 && <span className="cart-badge">{count}</span>}
          </button>
        </div>
      </div>
    </header>
  )
}

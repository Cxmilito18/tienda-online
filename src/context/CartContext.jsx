import { createContext, useContext, useState } from 'react'
import { precioFinal } from '../lib/format.js'

const CartContext = createContext()

export function CartProvider({ children }) {
  const [items, setItems] = useState([])
  const [open, setOpen] = useState(false)

  function add(producto) {
    setItems((prev) => {
      const found = prev.find((i) => i.id === producto.id)
      if (found) {
        return prev.map((i) =>
          i.id === producto.id ? { ...i, cantidad: i.cantidad + 1 } : i
        )
      }
      // El carrito guarda el precio ya con descuento aplicado
      return [
        ...prev,
        { ...producto, precio: precioFinal(producto), cantidad: 1 },
      ]
    })
    setOpen(true)
  }

  function remove(id) {
    setItems((prev) => prev.filter((i) => i.id !== id))
  }

  function setQty(id, cantidad) {
    if (cantidad <= 0) return remove(id)
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, cantidad } : i))
    )
  }

  function clear() {
    setItems([])
  }

  const total = items.reduce((s, i) => s + i.precio * i.cantidad, 0)
  const count = items.reduce((s, i) => s + i.cantidad, 0)

  return (
    <CartContext.Provider
      value={{ items, add, remove, setQty, clear, total, count, open, setOpen }}
    >
      {children}
    </CartContext.Provider>
  )
}

export const useCart = () => useContext(CartContext)

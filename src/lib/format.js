import { STORE } from './config.js'

export function formatPrecio(valor) {
  const n = Number(valor) || 0
  return (
    STORE.simboloMoneda +
    n.toLocaleString('es-CO', { maximumFractionDigits: 0 })
  )
}

// Precio final aplicando el descuento (%) del producto.
// Si no hay descuento, devuelve el precio normal.
export function precioFinal(producto) {
  const base = Number(producto?.precio) || 0
  const desc = Number(producto?.descuento) || 0
  if (desc <= 0) return base
  return Math.round(base * (1 - desc / 100))
}

export function tieneDescuento(producto) {
  return (Number(producto?.descuento) || 0) > 0
}

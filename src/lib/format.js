import { STORE } from './config.js'

export function formatPrecio(valor) {
  const n = Number(valor) || 0
  return (
    STORE.simboloMoneda +
    n.toLocaleString('es-CO', { maximumFractionDigits: 0 })
  )
}

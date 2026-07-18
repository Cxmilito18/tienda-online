import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { formatPrecio } from '../lib/format.js'

const ESTADOS = ['pendiente', 'confirmado', 'enviado', 'entregado', 'cancelado']

export default function AdminPedidos() {
  const [pedidos, setPedidos] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    cargar()
  }, [])

  async function cargar() {
    setLoading(true)
    const { data } = await supabase
      .from('pedidos')
      .select('*, pedido_items(*)')
      .order('created_at', { ascending: false })
    setPedidos(data || [])
    setLoading(false)
  }

  async function cambiarEstado(id, estado) {
    await supabase.from('pedidos').update({ estado }).eq('id', id)
    setPedidos((prev) =>
      prev.map((p) => (p.id === id ? { ...p, estado } : p))
    )
  }

  async function borrar(id) {
    if (!confirm('¿Eliminar este pedido? No se puede deshacer.')) return
    await supabase.from('pedidos').delete().eq('id', id)
    cargar()
  }

  function formatFecha(iso) {
    return new Date(iso).toLocaleString('es-CO', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  // Total vendido (sin contar los cancelados)
  const totalVendido = pedidos
    .filter((p) => p.estado !== 'cancelado')
    .reduce((s, p) => s + Number(p.total), 0)
  const pendientes = pedidos.filter((p) => p.estado === 'pendiente').length

  return (
    <div className="form-card">
      <div className="pedidos-head">
        <h3>
          Pedidos{' '}
          {pendientes > 0 && (
            <span className="pendientes-badge">{pendientes} pendientes</span>
          )}
        </h3>
        {pedidos.length > 0 && (
          <div className="pedidos-total">
            Total vendido: <strong>{formatPrecio(totalVendido)}</strong>
          </div>
        )}
      </div>

      {loading ? (
        <div className="spinner" />
      ) : pedidos.length === 0 ? (
        <p className="hint">Todavía no hay pedidos.</p>
      ) : (
        <div className="pedidos-lista">
          {pedidos.map((p) => (
            <div className={`pedido estado-${p.estado}`} key={p.id}>
              <div className="pedido-top">
                <div>
                  <strong>Pedido #{p.numero}</strong>
                  <span className="pedido-fecha">
                    {formatFecha(p.created_at)}
                  </span>
                </div>
                <span className="pedido-monto">{formatPrecio(p.total)}</span>
              </div>

              <div className="pedido-cliente">
                <span>👤 {p.cliente_nombre}</span>
                <span>📞 {p.cliente_telefono}</span>
                {p.metodo_entrega === 'envio' ? (
                  <span>
                    🚚 Envío{p.zona_envio ? ` · ${p.zona_envio}` : ''} (
                    {formatPrecio(p.costo_envio)})
                  </span>
                ) : (
                  <span>🏫 Recoge en tienda</span>
                )}
                {p.cliente_direccion && <span>📍 {p.cliente_direccion}</span>}
                {p.notas && <span className="pedido-notas">📝 {p.notas}</span>}
              </div>

              <ul className="pedido-items">
                {p.pedido_items.map((it) => (
                  <li key={it.id}>
                    {it.cantidad} x {it.nombre} — {formatPrecio(it.precio)}
                  </li>
                ))}
              </ul>

              <div className="pedido-acciones">
                <label>
                  Estado:
                  <select
                    value={p.estado}
                    onChange={(e) => cambiarEstado(p.id, e.target.value)}
                  >
                    {ESTADOS.map((e) => (
                      <option key={e} value={e}>
                        {e.charAt(0).toUpperCase() + e.slice(1)}
                      </option>
                    ))}
                  </select>
                </label>
                <button className="del-btn" onClick={() => borrar(p.id)}>
                  Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

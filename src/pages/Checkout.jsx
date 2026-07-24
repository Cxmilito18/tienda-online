import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase, COMPROBANTES_BUCKET } from '../lib/supabase.js'
import { STORE } from '../lib/config.js'
import { formatPrecio } from '../lib/format.js'
import { useCart } from '../context/CartContext.jsx'

export default function Checkout() {
  const { items, total: subtotal, clear } = useCart()
  const navigate = useNavigate()

  const [nombre, setNombre] = useState('')
  const [telefono, setTelefono] = useState('')
  const [direccion, setDireccion] = useState('')
  const [notas, setNotas] = useState('')

  const [metodo, setMetodo] = useState('recoger') // 'recoger' | 'envio'
  const [zonas, setZonas] = useState([])
  const [zonaId, setZonaId] = useState('')

  const [metodosPago, setMetodosPago] = useState([])
  const [pagoId, setPagoId] = useState('')

  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')
  const [confirmado, setConfirmado] = useState(null)

  useEffect(() => {
    supabase
      .from('zonas_envio')
      .select('*')
      .order('nombre')
      .then(({ data }) => setZonas(data || []))

    supabase
      .from('metodos_pago')
      .select('*')
      .order('created_at')
      .then(({ data }) => setMetodosPago(data || []))
  }, [])

  const zonaSel = zonas.find((z) => z.id === zonaId)
  const costoEnvio = metodo === 'envio' && zonaSel ? Number(zonaSel.costo) : 0
  const total = subtotal + costoEnvio
  const pagoSel = metodosPago.find((m) => m.id === pagoId)

  async function confirmar() {
    setError('')
    if (!nombre.trim()) return setError('Escribe tu nombre.')
    if (!telefono.trim()) return setError('Escribe tu teléfono.')
    if (metodo === 'envio') {
      if (!zonaId) return setError('Elige tu zona de envío.')
      if (!direccion.trim()) return setError('Escribe tu dirección de entrega.')
    }
    if (metodosPago.length > 0 && !pagoId) {
      return setError('Elige cómo vas a pagar.')
    }

    setEnviando(true)
    const { data, error: e } = await supabase.rpc('crear_pedido', {
      p_nombre: nombre,
      p_telefono: telefono,
      p_direccion: direccion,
      p_notas: notas,
      p_items: items.map((i) => ({ producto_id: i.id, cantidad: i.cantidad })),
      p_metodo_entrega: metodo,
      p_zona_id: metodo === 'envio' ? zonaId : null,
      p_metodo_pago_id: pagoId || null,
    })
    setEnviando(false)

    if (e) {
      setError(e.message || 'No se pudo crear el pedido. Intenta de nuevo.')
      return
    }
    setConfirmado({ ...data, pago: pagoSel || null })
    clear()
  }

  // ---- Confirmación + instrucciones de pago ----
  if (confirmado) {
    return (
      <div className="checkout-wrap">
        <div className="checkout-ok">
          <span className="check-ico">✅</span>
          <h1>¡Pedido recibido!</h1>
          <p className="pedido-num">Pedido #{confirmado.numero}</p>
          <p>
            Total a pagar: <strong>{formatPrecio(confirmado.total)}</strong>
          </p>
        </div>

        {confirmado.pago && (
          <PasoPago pedidoId={confirmado.id} pago={confirmado.pago} />
        )}

        <div style={{ textAlign: 'center', marginTop: 24 }}>
          <Link className="btn btn-ghost" to="/">
            Volver a la tienda
          </Link>
        </div>
      </div>
    )
  }

  // ---- Carrito vacío ----
  if (items.length === 0) {
    return (
      <div className="checkout-wrap">
        <div className="empty">
          <strong>Tu carrito está vacío</strong>
          Agrega productos antes de finalizar la compra.
        </div>
        <Link className="btn btn-ghost" to="/">
          ← Volver a la tienda
        </Link>
      </div>
    )
  }

  // ---- Formulario ----
  return (
    <div className="checkout-wrap">
      <button className="detalle-volver" onClick={() => navigate(-1)}>
        ← Seguir comprando
      </button>
      <h1 className="checkout-titulo">Finalizar compra</h1>

      <div className="checkout">
        {/* Resumen */}
        <div className="checkout-resumen">
          <h3>Tu pedido</h3>
          {items.map((i) => (
            <div className="checkout-item" key={i.id}>
              <img src={i.imagen_url} alt={i.nombre} />
              <div className="checkout-item-info">
                <span>{i.nombre}</span>
                <small>
                  {i.cantidad} x {formatPrecio(i.precio)}
                </small>
              </div>
              <strong>{formatPrecio(i.precio * i.cantidad)}</strong>
            </div>
          ))}
          <div className="checkout-linea">
            <span>Productos</span>
            <span>{formatPrecio(subtotal)}</span>
          </div>
          <div className="checkout-linea">
            <span>Envío</span>
            <span>
              {metodo === 'recoger'
                ? 'Gratis'
                : zonaSel
                ? formatPrecio(costoEnvio)
                : 'Elige zona'}
            </span>
          </div>
          <div className="checkout-total">
            <span>Total</span>
            <span>{formatPrecio(total)}</span>
          </div>
        </div>

        {/* Datos */}
        <div className="checkout-form">
          <h3>Tus datos</h3>
          {error && <div className="msg msg-err">{error}</div>}

          <div className="field">
            <label>Nombre completo *</label>
            <input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Tu nombre"
            />
          </div>
          <div className="field">
            <label>Teléfono / WhatsApp *</label>
            <input
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              placeholder="Ej. 300 123 4567"
            />
          </div>

          {/* Método de entrega */}
          <div className="field">
            <label>¿Cómo lo quieres recibir? *</label>
            <div className="metodo-entrega">
              <button
                type="button"
                className={`metodo-opcion ${metodo === 'recoger' ? 'active' : ''}`}
                onClick={() => setMetodo('recoger')}
              >
                🏫 Recoger en {STORE.lugarRecogida}
                <small>Gratis</small>
              </button>
              <button
                type="button"
                className={`metodo-opcion ${metodo === 'envio' ? 'active' : ''}`}
                onClick={() => setMetodo('envio')}
              >
                🚚 Envío a domicilio
                <small>Según tu zona</small>
              </button>
            </div>
          </div>

          {metodo === 'envio' && (
            <>
              <div className="field">
                <label>Zona de envío *</label>
                {zonas.length === 0 ? (
                  <p className="hint">
                    Aún no hay zonas de envío disponibles. Elige recoger o
                    contáctanos.
                  </p>
                ) : (
                  <select
                    value={zonaId}
                    onChange={(e) => setZonaId(e.target.value)}
                  >
                    <option value="">Elige tu zona...</option>
                    {zonas.map((z) => (
                      <option key={z.id} value={z.id}>
                        {z.nombre} — {formatPrecio(z.costo)}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              <div className="field">
                <label>Dirección de entrega *</label>
                <input
                  value={direccion}
                  onChange={(e) => setDireccion(e.target.value)}
                  placeholder="Calle, número, barrio"
                />
              </div>
            </>
          )}

          {/* Método de pago */}
          {metodosPago.length > 0 && (
            <div className="field">
              <label>¿Cómo vas a pagar? *</label>
              <div className="pagos-opciones">
                {metodosPago.map((m) => (
                  <button
                    type="button"
                    key={m.id}
                    className={`metodo-opcion ${pagoId === m.id ? 'active' : ''}`}
                    onClick={() => setPagoId(m.id)}
                  >
                    💳 {m.nombre}
                    {m.titular && <small>{m.titular}</small>}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="field">
            <label>Notas (opcional)</label>
            <textarea
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Ej. apto 302, dejar en portería..."
            />
          </div>

          <button
            className="btn btn-acento btn-block"
            onClick={confirmar}
            disabled={enviando}
          >
            {enviando ? 'Enviando pedido...' : 'Confirmar pedido'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ---------------- PASO DE PAGO ---------------- */
function PasoPago({ pedidoId, pago }) {
  const [archivo, setArchivo] = useState(null)
  const [subiendo, setSubiendo] = useState(false)
  const [listo, setListo] = useState(false)
  const [err, setErr] = useState('')

  async function subirComprobante() {
    if (!archivo) return setErr('Elige la imagen de tu comprobante.')
    setErr('')
    setSubiendo(true)
    try {
      const ext = archivo.name.split('.').pop()
      const path = `${pedidoId}-${Date.now()}.${ext}`
      const { error: upErr } = await supabase.storage
        .from(COMPROBANTES_BUCKET)
        .upload(path, archivo)
      if (upErr) throw upErr

      const { error: rpcErr } = await supabase.rpc('reportar_pago', {
        p_pedido_id: pedidoId,
        p_comprobante: path,
      })
      if (rpcErr) throw rpcErr

      setListo(true)
    } catch (e) {
      setErr('No se pudo subir el comprobante. Intenta de nuevo.')
    } finally {
      setSubiendo(false)
    }
  }

  return (
    <div className="pago-card">
      <h2>Cómo pagar</h2>
      <div className="pago-metodo">
        <strong>{pago.nombre}</strong>
        {pago.titular && (
          <span>
            A nombre de: <strong>{pago.titular}</strong>
          </span>
        )}
        {pago.numero && (
          <span className="pago-numero">{pago.numero}</span>
        )}
        {pago.instrucciones && <p>{pago.instrucciones}</p>}
        {pago.qr_url && (
          <img className="pago-qr" src={pago.qr_url} alt="Código QR de pago" />
        )}
      </div>

      {pago.requiere_comprobante && (
        <div className="pago-comprobante">
          {listo ? (
            <div className="msg msg-ok">
              ✅ ¡Comprobante recibido! Vamos a verificar tu pago y te
              confirmamos pronto.
            </div>
          ) : (
            <>
              <h3>Sube tu comprobante</h3>
              <p className="hint">
                Toma una captura de la transferencia y súbela aquí para que
                validemos tu pago.
              </p>
              {err && <div className="msg msg-err">{err}</div>}
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setArchivo(e.target.files?.[0] || null)}
              />
              <button
                className="btn btn-acento btn-block"
                style={{ marginTop: 10 }}
                onClick={subirComprobante}
                disabled={subiendo}
              >
                {subiendo ? 'Subiendo...' : 'Enviar comprobante'}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}

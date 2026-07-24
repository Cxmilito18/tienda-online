import { useEffect, useState } from 'react'
import { supabase, STORAGE_BUCKET } from '../lib/supabase.js'

const FORM_VACIO = {
  nombre: '',
  titular: '',
  numero: '',
  instrucciones: '',
  qr_url: '',
  requiere_comprobante: true,
}

export default function AdminMetodosPago() {
  const [metodos, setMetodos] = useState([])
  const [form, setForm] = useState(FORM_VACIO)
  const [qrArchivo, setQrArchivo] = useState(null)
  const [guardando, setGuardando] = useState(false)
  const [msg, setMsg] = useState(null)

  useEffect(() => {
    cargar()
  }, [])

  async function cargar() {
    const { data } = await supabase
      .from('metodos_pago')
      .select('*')
      .order('created_at')
    setMetodos(data || [])
  }

  function setField(k, v) {
    setForm((f) => ({ ...f, [k]: v }))
  }

  async function agregar() {
    setMsg(null)
    if (!form.nombre.trim()) {
      return setMsg({ tipo: 'err', texto: 'Ponle un nombre (ej. Nequi).' })
    }
    setGuardando(true)
    try {
      let qr_url = form.qr_url.trim()
      if (qrArchivo) {
        const ext = qrArchivo.name.split('.').pop()
        const path = `qr-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
        const { error: upErr } = await supabase.storage
          .from(STORAGE_BUCKET)
          .upload(path, qrArchivo)
        if (upErr) throw upErr
        qr_url = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path).data
          .publicUrl
      }

      const { error } = await supabase.from('metodos_pago').insert({
        nombre: form.nombre.trim(),
        titular: form.titular.trim() || null,
        numero: form.numero.trim() || null,
        instrucciones: form.instrucciones.trim() || null,
        qr_url: qr_url || null,
        requiere_comprobante: form.requiere_comprobante,
      })
      if (error) throw error

      setForm(FORM_VACIO)
      setQrArchivo(null)
      setMsg({ tipo: 'ok', texto: 'Método de pago agregado.' })
      cargar()
    } catch (e) {
      setMsg({ tipo: 'err', texto: 'No se pudo guardar: ' + (e.message || e) })
    } finally {
      setGuardando(false)
    }
  }

  async function alternarActivo(m) {
    await supabase
      .from('metodos_pago')
      .update({ activo: !m.activo })
      .eq('id', m.id)
    setMetodos((prev) =>
      prev.map((x) => (x.id === m.id ? { ...x, activo: !x.activo } : x))
    )
  }

  async function borrar(id) {
    if (!confirm('¿Eliminar este método de pago?')) return
    await supabase.from('metodos_pago').delete().eq('id', id)
    cargar()
  }

  return (
    <div className="form-card">
      <h3>Métodos de pago</h3>
      <p className="hint">
        Configura cómo te pueden pagar. Estos datos los verá el cliente al
        terminar su compra, así que revísalos bien antes de guardar.
      </p>

      {msg && (
        <div className={`msg ${msg.tipo === 'ok' ? 'msg-ok' : 'msg-err'}`}>
          {msg.texto}
        </div>
      )}

      {/* ---- Lista de métodos ---- */}
      {metodos.length > 0 && (
        <div className="pagos-lista">
          {metodos.map((m) => (
            <div className={`pago-item ${m.activo ? '' : 'inactivo'}`} key={m.id}>
              {m.qr_url && <img className="pago-item-qr" src={m.qr_url} alt="QR" />}
              <div className="pago-item-info">
                <strong>
                  {m.nombre}
                  {!m.activo && <span className="tag-inactivo">oculto</span>}
                </strong>
                {m.titular && <span>{m.titular}</span>}
                {m.numero && <span className="pago-numero">{m.numero}</span>}
                {m.instrucciones && <small>{m.instrucciones}</small>}
              </div>
              <div className="admin-actions">
                <button className="edit-btn" onClick={() => alternarActivo(m)}>
                  {m.activo ? 'Ocultar' : 'Mostrar'}
                </button>
                <button className="del-btn" onClick={() => borrar(m.id)}>
                  Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ---- Formulario nuevo método ---- */}
      <div className="pago-form">
        <h4>Agregar método de pago</h4>
        <div className="row2">
          <div className="field">
            <label>Nombre *</label>
            <input
              value={form.nombre}
              onChange={(e) => setField('nombre', e.target.value)}
              placeholder="Ej. Nequi, Daviplata, Bancolombia"
            />
          </div>
          <div className="field">
            <label>A nombre de</label>
            <input
              value={form.titular}
              onChange={(e) => setField('titular', e.target.value)}
              placeholder="Titular de la cuenta"
            />
          </div>
        </div>

        <div className="field">
          <label>Número (celular o cuenta)</label>
          <input
            value={form.numero}
            onChange={(e) => setField('numero', e.target.value)}
            placeholder="Ej. 300 123 4567 / Ahorros 123-456789-00"
          />
        </div>

        <div className="field">
          <label>Instrucciones (opcional)</label>
          <textarea
            value={form.instrucciones}
            onChange={(e) => setField('instrucciones', e.target.value)}
            placeholder="Ej. Envía el pago y sube la captura. Escribe tu nombre en el mensaje."
          />
        </div>

        <div className="field">
          <label>Imagen del QR (opcional)</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setQrArchivo(e.target.files?.[0] || null)}
          />
          {qrArchivo && (
            <img
              className="preview-img"
              src={URL.createObjectURL(qrArchivo)}
              alt="QR"
              style={{ maxWidth: 160 }}
            />
          )}
        </div>

        <label className="check-linea">
          <input
            type="checkbox"
            checked={form.requiere_comprobante}
            onChange={(e) => setField('requiere_comprobante', e.target.checked)}
          />
          Pedir comprobante al cliente
          <small>(desmárcalo para pago contra entrega)</small>
        </label>

        <button
          className="btn btn-acento"
          onClick={agregar}
          disabled={guardando}
        >
          {guardando ? 'Guardando...' : '+ Agregar método'}
        </button>
      </div>
    </div>
  )
}

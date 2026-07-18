import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { formatPrecio } from '../lib/format.js'

export default function AdminZonas() {
  const [zonas, setZonas] = useState([])
  const [nombre, setNombre] = useState('')
  const [costo, setCosto] = useState('')
  const [msg, setMsg] = useState('')

  useEffect(() => {
    cargar()
  }, [])

  async function cargar() {
    const { data } = await supabase
      .from('zonas_envio')
      .select('*')
      .order('nombre')
    setZonas(data || [])
  }

  async function agregar() {
    setMsg('')
    if (!nombre.trim()) return setMsg('Escribe el nombre de la zona.')
    const { error } = await supabase.from('zonas_envio').insert({
      nombre: nombre.trim(),
      costo: Number(costo) || 0,
    })
    if (error) return setMsg('No se pudo agregar la zona.')
    setNombre('')
    setCosto('')
    cargar()
  }

  async function actualizarCosto(id, nuevoCosto) {
    await supabase
      .from('zonas_envio')
      .update({ costo: Number(nuevoCosto) || 0 })
      .eq('id', id)
    setZonas((prev) =>
      prev.map((z) => (z.id === id ? { ...z, costo: Number(nuevoCosto) || 0 } : z))
    )
  }

  async function borrar(id) {
    if (!confirm('¿Eliminar esta zona de envío?')) return
    await supabase.from('zonas_envio').delete().eq('id', id)
    cargar()
  }

  return (
    <div className="form-card">
      <h3>Zonas de envío</h3>
      <p className="hint">
        Crea las zonas a las que envías y su costo. El cliente elige su zona al
        finalizar la compra.
      </p>

      {msg && <div className="msg msg-err">{msg}</div>}

      <div className="zona-nueva">
        <input
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Nombre de la zona (ej. Suba, Chapinero...)"
        />
        <input
          type="number"
          min="0"
          value={costo}
          onChange={(e) => setCosto(e.target.value)}
          placeholder="Costo ($)"
        />
        <button className="btn btn-acento" onClick={agregar}>
          + Agregar
        </button>
      </div>

      {zonas.length > 0 && (
        <div className="zonas-lista">
          {zonas.map((z) => (
            <div className="zona-item" key={z.id}>
              <span className="zona-nombre">{z.nombre}</span>
              <div className="zona-costo">
                <span>$</span>
                <input
                  type="number"
                  min="0"
                  defaultValue={z.costo}
                  onBlur={(e) => actualizarCosto(z.id, e.target.value)}
                  title="Edita el costo y sal del campo para guardar"
                />
              </div>
              <span className="zona-costo-fmt">{formatPrecio(z.costo)}</span>
              <button className="del-btn" onClick={() => borrar(z.id)}>
                Eliminar
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

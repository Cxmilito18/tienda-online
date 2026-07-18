import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import Estrellas from './Estrellas.jsx'

export default function AdminResenas() {
  const [resenas, setResenas] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    cargar()
  }, [])

  async function cargar() {
    setLoading(true)
    // El admin (autenticado) ve TODAS las reseñas, aprobadas o no
    const { data } = await supabase
      .from('resenas')
      .select('*, productos(nombre)')
      .order('created_at', { ascending: false })
    setResenas(
      (data || []).map((r) => ({
        ...r,
        producto_nombre: r.productos?.nombre || 'Producto eliminado',
      }))
    )
    setLoading(false)
  }

  async function aprobar(id) {
    await supabase.from('resenas').update({ aprobada: true }).eq('id', id)
    cargar()
  }

  async function ocultar(id) {
    await supabase.from('resenas').update({ aprobada: false }).eq('id', id)
    cargar()
  }

  async function borrar(id) {
    if (!confirm('¿Eliminar esta reseña definitivamente?')) return
    await supabase.from('resenas').delete().eq('id', id)
    cargar()
  }

  const pendientes = resenas.filter((r) => !r.aprobada)
  const aprobadas = resenas.filter((r) => r.aprobada)

  function fila(r) {
    return (
      <div className="admin-resena" key={r.id}>
        <div className="admin-resena-info">
          <div className="admin-resena-top">
            <strong>{r.nombre}</strong>
            <Estrellas valor={r.calificacion} size="0.85rem" />
            <span className="admin-resena-prod">en {r.producto_nombre}</span>
          </div>
          {r.comentario && <p>{r.comentario}</p>}
        </div>
        <div className="admin-actions">
          {r.aprobada ? (
            <button className="edit-btn" onClick={() => ocultar(r.id)}>
              Ocultar
            </button>
          ) : (
            <button className="aprobar-btn" onClick={() => aprobar(r.id)}>
              Aprobar
            </button>
          )}
          <button className="del-btn" onClick={() => borrar(r.id)}>
            Eliminar
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="form-card">
      <h3>
        Reseñas{' '}
        {pendientes.length > 0 && (
          <span className="pendientes-badge">
            {pendientes.length} por aprobar
          </span>
        )}
      </h3>

      {loading ? (
        <div className="spinner" />
      ) : resenas.length === 0 ? (
        <p className="hint">Todavía no hay reseñas.</p>
      ) : (
        <>
          {pendientes.length > 0 && (
            <>
              <p className="hint">Pendientes de aprobar:</p>
              <div className="admin-resenas-lista">
                {pendientes.map(fila)}
              </div>
            </>
          )}
          {aprobadas.length > 0 && (
            <>
              <p className="hint" style={{ marginTop: 16 }}>
                Publicadas:
              </p>
              <div className="admin-resenas-lista">
                {aprobadas.map(fila)}
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}

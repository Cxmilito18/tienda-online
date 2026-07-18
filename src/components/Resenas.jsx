import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import Estrellas from './Estrellas.jsx'

export default function Resenas({ productoId }) {
  const [resenas, setResenas] = useState([])
  const [loading, setLoading] = useState(true)

  // formulario
  const [nombre, setNombre] = useState('')
  const [calificacion, setCalificacion] = useState(0)
  const [comentario, setComentario] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [msg, setMsg] = useState(null)

  useEffect(() => {
    cargar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productoId])

  async function cargar() {
    setLoading(true)
    // El público solo recibe las aprobadas (lo controla la seguridad de Supabase)
    const { data } = await supabase
      .from('resenas')
      .select('*')
      .eq('producto_id', productoId)
      .order('created_at', { ascending: false })
    setResenas(data || [])
    setLoading(false)
  }

  const total = resenas.length
  const promedio =
    total > 0
      ? resenas.reduce((s, r) => s + r.calificacion, 0) / total
      : 0

  async function enviar() {
    setMsg(null)
    if (!nombre.trim()) {
      setMsg({ tipo: 'err', texto: 'Escribe tu nombre.' })
      return
    }
    if (calificacion < 1) {
      setMsg({ tipo: 'err', texto: 'Elige una calificación (estrellas).' })
      return
    }
    setEnviando(true)
    const { error } = await supabase.from('resenas').insert({
      producto_id: productoId,
      nombre: nombre.trim(),
      calificacion,
      comentario: comentario.trim() || null,
      aprobada: false,
    })
    setEnviando(false)
    if (error) {
      setMsg({ tipo: 'err', texto: 'No se pudo enviar. Intenta de nuevo.' })
      return
    }
    setMsg({
      tipo: 'ok',
      texto: '¡Gracias! Tu reseña se publicará cuando sea revisada.',
    })
    setNombre('')
    setCalificacion(0)
    setComentario('')
  }

  function formatFecha(iso) {
    return new Date(iso).toLocaleDateString('es-CO', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  }

  return (
    <section className="resenas">
      <div className="resenas-head">
        <h2>Reseñas</h2>
        {total > 0 && (
          <div className="resenas-resumen">
            <Estrellas valor={promedio} size="1.2rem" />
            <strong>{promedio.toFixed(1)}</strong>
            <span>
              · {total} reseña{total > 1 ? 's' : ''}
            </span>
          </div>
        )}
      </div>

      {/* ---- LISTA ---- */}
      {loading ? (
        <div className="spinner" />
      ) : total === 0 ? (
        <p className="resenas-vacio">
          Aún no hay reseñas. ¡Sé el primero en opinar!
        </p>
      ) : (
        <div className="resenas-lista">
          {resenas.map((r) => (
            <div className="resena" key={r.id}>
              <div className="resena-top">
                <strong>{r.nombre}</strong>
                <span className="resena-fecha">{formatFecha(r.created_at)}</span>
              </div>
              <Estrellas valor={r.calificacion} size="0.9rem" />
              {r.comentario && <p>{r.comentario}</p>}
            </div>
          ))}
        </div>
      )}

      {/* ---- FORMULARIO ---- */}
      <div className="resena-form">
        <h3>Deja tu reseña</h3>
        {msg && (
          <div className={`msg ${msg.tipo === 'ok' ? 'msg-ok' : 'msg-err'}`}>
            {msg.texto}
          </div>
        )}
        <div className="field">
          <label>Tu nombre</label>
          <input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Ej. Juan P."
          />
        </div>
        <div className="field">
          <label>Tu calificación</label>
          <Estrellas
            valor={calificacion}
            onChange={setCalificacion}
            size="1.8rem"
          />
        </div>
        <div className="field">
          <label>Comentario (opcional)</label>
          <textarea
            value={comentario}
            onChange={(e) => setComentario(e.target.value)}
            placeholder="¿Qué te pareció el producto?"
          />
        </div>
        <button
          className="btn btn-acento"
          onClick={enviar}
          disabled={enviando}
        >
          {enviando ? 'Enviando...' : 'Enviar reseña'}
        </button>
      </div>
    </section>
  )
}

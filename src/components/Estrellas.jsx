// Muestra estrellas (modo lectura) o permite calificar (si pasas onChange).
export default function Estrellas({ valor = 0, onChange, size = '1rem' }) {
  const editable = typeof onChange === 'function'
  return (
    <span
      className={`estrellas ${editable ? 'editable' : ''}`}
      style={{ fontSize: size }}
    >
      {[1, 2, 3, 4, 5].map((n) => (
        <span
          key={n}
          className={`estrella ${n <= Math.round(valor) ? 'llena' : ''}`}
          onClick={editable ? () => onChange(n) : undefined}
          role={editable ? 'button' : undefined}
          title={editable ? `${n} estrella${n > 1 ? 's' : ''}` : undefined}
        >
          ★
        </span>
      ))}
    </span>
  )
}

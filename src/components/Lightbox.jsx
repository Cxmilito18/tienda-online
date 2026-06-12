export default function Lightbox({ src, alt, onClose }) {
  if (!src) return null
  return (
    <div className="lightbox" onClick={onClose}>
      <button className="lightbox-close" onClick={onClose}>
        ✕
      </button>
      <img src={src} alt={alt} onClick={(e) => e.stopPropagation()} />
      {alt && <div className="lightbox-cap">{alt}</div>}
    </div>
  )
}

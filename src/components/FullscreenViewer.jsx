import { useEffect, useCallback, useState } from 'react'
import './FullscreenViewer.css'

export default function FullscreenViewer({ images, captions, index, onClose, onPrev, onNext }) {
  const hasPrev = index > 0
  const hasNext = index < images.length - 1
  const [showDesc, setShowDesc] = useState(false)

  const handleKey = useCallback((e) => {
    if (e.key === 'Escape') onClose()
    if (e.key === 'ArrowRight' && hasNext) onNext()
    if (e.key === 'ArrowLeft' && hasPrev) onPrev()
    if (e.key === 'd' || e.key === 'D') setShowDesc(v => !v)
  }, [onClose, onNext, onPrev, hasPrev, hasNext])

  useEffect(() => {
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [handleKey])

  const src = images[index]
  const caption = captions?.[index]

  return (
    <div className="fs-overlay" onClick={onClose}>
      <button className="fs-close" onClick={onClose} aria-label="Close">✕</button>

      <button
        className={`fs-desc-toggle ${showDesc ? 'fs-desc-toggle--active' : ''}`}
        onClick={e => { e.stopPropagation(); setShowDesc(v => !v) }}
        aria-label="Toggle description"
        title="Toggle description (D)"
      >T</button>

      <button
        className="fs-arrow fs-arrow--left"
        onClick={e => { e.stopPropagation(); onPrev() }}
        disabled={!hasPrev}
        aria-label="Previous"
      >‹</button>

      <img
        className="fs-image"
        src={src}
        alt=""
        onClick={e => e.stopPropagation()}
      />

      <button
        className="fs-arrow fs-arrow--right"
        onClick={e => { e.stopPropagation(); onNext() }}
        disabled={!hasNext}
        aria-label="Next"
      >›</button>

      {showDesc && caption?.greek && (
        <div className="fs-caption" onClick={e => e.stopPropagation()}>
          <div className="fs-caption-greek greek">{caption.greek}</div>
        </div>
      )}
    </div>
  )
}

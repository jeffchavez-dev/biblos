import { useEffect, useCallback } from 'react'
import './FullscreenViewer.css'

export default function FullscreenViewer({ images, index, onClose, onPrev, onNext }) {
  const hasPrev = index > 0
  const hasNext = index < images.length - 1

  const handleKey = useCallback((e) => {
    if (e.key === 'Escape') onClose()
    if (e.key === 'ArrowRight' && hasNext) onNext()
    if (e.key === 'ArrowLeft' && hasPrev) onPrev()
  }, [onClose, onNext, onPrev, hasPrev, hasNext])

  useEffect(() => {
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [handleKey])

  const src = images[index]

  return (
    <div className="fs-overlay" onClick={onClose}>
      <button className="fs-close" onClick={onClose} aria-label="Close">✕</button>

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

    </div>
  )
}

import { useState, useEffect, useRef } from 'react'
import './StoryTab.css'

function getParagraphParts(paragraphs) {
  let current = 'A'
  return paragraphs.map(para => {
    if (para.label?.includes('Βʹ')) current = 'B'
    else if (para.label?.includes('Αʹ')) current = 'A'
    return { ...para, _part: current }
  })
}

export default function StoryTab({ story, activePart }) {
  const [showTranslation, setShowTranslation] = useState(false)
  const [activeWord, setActiveWord] = useState(null)
  const [popoverPos, setPopoverPos] = useState({ top: 0, left: 0 })
  const popoverRef = useRef(null)

  function handleWordClick(e, word, paragraphId, wordIdx) {
    const key = `${paragraphId}-${wordIdx}`
    if (activeWord?.key === key) {
      setActiveWord(null)
      return
    }

    const rect = e.currentTarget.getBoundingClientRect()
    setPopoverPos({
      anchorTop: rect.bottom,
      anchorBottom: rect.top,
      anchorLeft: rect.left + rect.width / 2,
    })
    setActiveWord({ ...word, key })
  }

  // Close on outside click
  useEffect(() => {
    if (!activeWord) return
    function handleOutside(e) {
      if (popoverRef.current && !popoverRef.current.contains(e.target) &&
          !e.target.classList.contains('story-word')) {
        setActiveWord(null)
      }
    }
    document.addEventListener('mousedown', handleOutside)
    document.addEventListener('touchstart', handleOutside)
    return () => {
      document.removeEventListener('mousedown', handleOutside)
      document.removeEventListener('touchstart', handleOutside)
    }
  }, [activeWord])

  // Position popover after render to avoid overflow
  useEffect(() => {
    if (!activeWord || !popoverRef.current) return
    const pop = popoverRef.current
    const popW = pop.offsetWidth
    const viewW = window.innerWidth
    const margin = 10

    let left = popoverPos.anchorLeft - popW / 2
    if (left < margin) left = margin
    if (left + popW > viewW - margin) left = viewW - popW - margin

    // Prefer below, flip above if not enough room
    const popH = pop.offsetHeight
    const viewH = window.innerHeight
    const spaceBelow = viewH - popoverPos.anchorTop
    let top
    if (spaceBelow >= popH + 8) {
      top = popoverPos.anchorTop + 8
    } else {
      top = popoverPos.anchorBottom - popH - 8
    }

    pop.style.left = `${left}px`
    pop.style.top = `${top}px`
    pop.style.opacity = '1'
  }, [activeWord, popoverPos])

  if (!story) {
    return <div className="empty-tab">📖 Story text for this chapter has not been added yet.</div>
  }

  const paragraphs = getParagraphParts(story.paragraphs).filter(p => p._part === activePart)

  return (
    <div className="story-tab">
      <div className="story-header">
        <h2 className="greek story-title">{story.title}</h2>
        <p className="story-title-en">{story.titleTranslation}</p>
      </div>

      <div className="story-instruction">Tap any word to see its meaning.</div>

      {paragraphs.map((para, i) => (
        <div key={para.id}>
          {para.label && (
            <div className="part-divider">
              <span className="part-label greek">{para.label}</span>
            </div>
          )}
          <div className="story-paragraph-row">
            <span className="para-number">{i + 1}</span>
            <div className="story-paragraph">
              <p className="para-greek greek">
                {para.words.map((word, wi) => (
                  <span
                    key={wi}
                    className={`story-word ${activeWord?.key === `${para.id}-${wi}` ? 'story-word--active' : ''}`}
                    onClick={(e) => handleWordClick(e, word, para.id, wi)}
                  >
                    {word.greek}{wi < para.words.length - 1 ? ' ' : ''}
                  </span>
                ))}
              </p>
            </div>
          </div>
        </div>
      ))}

      <div className="story-translation-section">
        <button
          className="translation-toggle-full"
          onClick={() => setShowTranslation(v => !v)}
        >
          {showTranslation ? 'Hide Translation' : 'Show Translation'}
        </button>

        {showTranslation && (
          <div className="full-translation">
            {paragraphs.map(para => (
              <div key={para.id} className="translation-block">
                {para.label && (
                  <p className="translation-part-label">{para.label}</p>
                )}
                {para.translation && (
                  <p className="translation-para">{para.translation}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {activeWord && (
        <div className="word-popover" ref={popoverRef} style={{ opacity: 0 }}>
          <span className="tooltip-greek greek">{activeWord.greek}</span>
          <span className="tooltip-arrow">→</span>
          <span className="tooltip-def">{activeWord.definition}</span>
          <button className="tooltip-close" onClick={() => setActiveWord(null)}>✕</button>
        </div>
      )}
    </div>
  )
}

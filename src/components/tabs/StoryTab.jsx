import { useState, useEffect, useRef, useMemo } from 'react'
import { useLanguage, useUI, t } from '../../context/LanguageContext.jsx'
import './StoryTab.css'

function getParagraphParts(paragraphs) {
  let current = 'A'
  return paragraphs.map(para => {
    if (para.label?.includes('Βʹ')) current = 'B'
    else if (para.label?.includes('Αʹ')) current = 'A'
    return { ...para, _part: current }
  })
}

function normalizeGreek(s) {
  return s.normalize('NFD')
    .split('')
    .filter(c => { const code = c.charCodeAt(0); return code < 0x0300 || code > 0x036f })
    .join('')
    .replace(/[,.'·;!?\s]/g, '')
    .toLowerCase()
}

export default function StoryTab({ story, vocabulary, activePart }) {
  const { lang } = useLanguage()
  const ui = useUI()
  const [showTranslation, setShowTranslation] = useState(false)
  const [activeWord, setActiveWord] = useState(null)
  const [showImage, setShowImage] = useState(false)
  const [popoverPos, setPopoverPos] = useState({ top: 0, left: 0 })
  const popoverRef = useRef(null)

  // Build a lookup: normalized Greek base form → vocab entry (with image)
  const vocabImageMap = useMemo(() => {
    if (!vocabulary) return {}
    const map = {}
    for (const entry of vocabulary) {
      if (!entry.image) continue
      // vocab greek field: "ἄνθρωπος, -ου, ὁ" — take part before first comma/space
      const base = entry.greek.split(/[,\s]/)[0]
      map[normalizeGreek(base)] = entry
    }
    return map
  }, [vocabulary])

  function findVocabEntry(greekWord) {
    return vocabImageMap[normalizeGreek(greekWord)] || null
  }

  function handleWordClick(e, word, paragraphId, wordIdx) {
    const key = `${paragraphId}-${wordIdx}`
    if (activeWord?.key === key) {
      setActiveWord(null)
      setShowImage(false)
      return
    }
    const rect = e.currentTarget.getBoundingClientRect()
    setPopoverPos({ anchorTop: rect.bottom, anchorBottom: rect.top, anchorLeft: rect.left + rect.width / 2 })
    setActiveWord({ ...word, key, vocabEntry: findVocabEntry(word.greek) })
    setShowImage(false)
  }

  function handleWordDoubleClick(e, word, paragraphId, wordIdx) {
    e.preventDefault()
    const key = `${paragraphId}-${wordIdx}`
    const rect = e.currentTarget.getBoundingClientRect()
    setPopoverPos({ anchorTop: rect.bottom, anchorBottom: rect.top, anchorLeft: rect.left + rect.width / 2 })
    setActiveWord({ ...word, key, vocabEntry: findVocabEntry(word.greek) })
    setShowImage(true)
  }

  // Close on outside click
  useEffect(() => {
    if (!activeWord) return
    function handleOutside(e) {
      if (popoverRef.current && !popoverRef.current.contains(e.target) &&
          !e.target.classList.contains('story-word')) {
        setActiveWord(null)
        setShowImage(false)
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

      <div className="story-instruction">{ui('clickInstruction')}</div>

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
                    className={`story-word ${activeWord?.key === `${para.id}-${wi}` ? 'story-word--active' : ''} ${findVocabEntry(word.greek) ? 'story-word--has-image' : ''}`}
                    onClick={(e) => handleWordClick(e, word, para.id, wi)}
                    onDoubleClick={(e) => handleWordDoubleClick(e, word, para.id, wi)}
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
          {showTranslation ? ui('hideTranslation') : ui('showTranslation')}
        </button>

        {showTranslation && (
          <div className="full-translation">
            {paragraphs.map(para => (
              <div key={para.id} className="translation-block">
                {para.label && (
                  <p className="translation-part-label">{para.label}</p>
                )}
                {para.translation && (
                  <p className="translation-para">{t(para.translation, para.translations, lang)}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {activeWord && (
        <div className={`word-popover ${showImage && activeWord.vocabEntry?.image ? 'word-popover--with-image' : ''}`} ref={popoverRef} style={{ opacity: 0 }}>
          {showImage && activeWord.vocabEntry?.image ? (
            <div className="tooltip-image-layout">
              <img
                className="tooltip-vocab-image"
                src={`/vocab-images/${activeWord.vocabEntry.image}`}
                alt={activeWord.vocabEntry.definition}
              />
              <div className="tooltip-image-text">
                <span className="tooltip-greek greek">{activeWord.greek}</span>
                <span className="tooltip-def">{activeWord.definition}</span>
              </div>
              <button className="tooltip-close" onClick={() => { setActiveWord(null); setShowImage(false) }}>✕</button>
            </div>
          ) : (
            <>
              <span className="tooltip-greek greek">{activeWord.greek}</span>
              <span className="tooltip-arrow">→</span>
              <span className="tooltip-def">{t(activeWord.definition, activeWord.translations, lang)}</span>
              <button className="tooltip-close" onClick={() => { setActiveWord(null); setShowImage(false) }}>✕</button>
            </>
          )}
        </div>
      )}
    </div>
  )
}

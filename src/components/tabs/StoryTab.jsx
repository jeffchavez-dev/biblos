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

function MarginNote({ note, vocabMap }) {
  if (note.type === 'antonym' || note.type === 'synonym') {
    const [wordA, wordB] = note.words
    const entryA = vocabMap[wordA.normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase()] ||
      Object.values(vocabMap).find(e => e.greek.split(/[,\s]/)[0].normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().startsWith(
        wordA.normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().slice(0,4)
      ))
    const entryB = vocabMap[wordB.normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase()] ||
      Object.values(vocabMap).find(e => e.greek.split(/[,\s]/)[0].normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().startsWith(
        wordB.normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().slice(0,4)
      ))
    const symbol = note.type === 'antonym' ? '↔' : '≈'
    const label  = note.type === 'antonym' ? 'ἀντώνυμον' : 'συνώνυμον'
    return (
      <div className="margin-note margin-note--pair">
        <div className="margin-note-label">{label}</div>
        <div className="margin-note-pair">
          <div className="margin-note-word">
            {entryA?.image && <img src={`/vocab-images/${entryA.image}`} alt={wordA} />}
            <span className="greek">{wordA}</span>
          </div>
          <span className="margin-note-symbol">{symbol}</span>
          <div className="margin-note-word">
            {entryB?.image && <img src={`/vocab-images/${entryB.image}`} alt={wordB} />}
            <span className="greek">{wordB}</span>
          </div>
        </div>
      </div>
    )
  }
  return null
}

export default function StoryTab({ story, vocabulary, activePart }) {
  const { lang } = useLanguage()
  const ui = useUI()
  const [showTranslation, setShowTranslation] = useState(false)
  const [activeWord, setActiveWord] = useState(null)
  const [showImage, setShowImage] = useState(false)
  const [popoverPos, setPopoverPos] = useState({ top: 0, left: 0 })
  const popoverRef = useRef(null)

  // Build a lookup: normalized Greek base form → vocab entry (all entries)
  const vocabMap = useMemo(() => {
    if (!vocabulary) return {}
    const map = {}
    for (const entry of vocabulary) {
      const base = entry.greek.split(/[,\s]/)[0]
      map[normalizeGreek(base)] = entry
    }
    return map
  }, [vocabulary])

  // Verb endings (longest first to avoid partial matches)
  const VERB_SUFFIXES = ['ουσιν', 'ουσι', 'ομεν', 'ετε', 'εις', 'ει', 'ω']
  // Noun/adjective case endings (longest first)
  const NOUN_SUFFIXES = ['ους', 'οις', 'αις', 'ων', 'ου', 'ης', 'ος', 'ον', 'αν', 'ην', 'ας', 'ω', 'α', 'η', 'ε']

  function findVocabEntry(greekWord) {
    const normalized = normalizeGreek(greekWord)
    // 1. Direct match
    if (vocabMap[normalized]) return vocabMap[normalized]
    // 2. Verb stem: strip ending, match lemma ending in -ω or -μι
    for (const suffix of VERB_SUFFIXES) {
      if (normalized.endsWith(suffix)) {
        const stem = normalized.slice(0, -suffix.length)
        if (stem.length < 2) continue
        for (const [key, entry] of Object.entries(vocabMap)) {
          if (key.startsWith(stem) && (key.endsWith('ω') || key.endsWith('μι'))) {
            return entry
          }
        }
      }
    }
    // 3. Noun/adjective stem: strip case ending, match lemma with similar stem length
    for (const suffix of NOUN_SUFFIXES) {
      if (normalized.endsWith(suffix)) {
        const stem = normalized.slice(0, -suffix.length)
        if (stem.length < 2) continue
        for (const [key, entry] of Object.entries(vocabMap)) {
          // key must start with stem and not be much longer (avoids false broad matches)
          if (key.startsWith(stem) && key.length <= stem.length + 4) {
            return entry
          }
        }
      }
    }
    return null
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
      {story.heroImage ? (
        <div className="story-hero">
          <img className="story-hero-img" src={`/${story.heroImage}`} alt="" />
          <div className="story-hero-overlay">
            <h2 className="greek story-hero-title">{story.title}</h2>
          </div>
        </div>
      ) : (
        <div className="story-header">
          <h2 className="greek story-title">{story.title}</h2>
          <p className="story-title-en">{t(story.titleTranslation, story.titleTranslations, lang)}</p>
        </div>
      )}


      {paragraphs.map((para, i) => (
        <div key={para.id} className="story-row-outer">
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
                    className={(() => { const ve = findVocabEntry(word.greek); return `story-word ${activeWord?.key === `${para.id}-${wi}` ? 'story-word--active' : ''} ${ve?.image ? 'story-word--has-image' : ve ? 'story-word--has-vocab' : ''}` })()}
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
        <div className={`word-popover ${showImage && activeWord.vocabEntry?.image ? 'word-popover--with-image' : ''} ${showImage && activeWord.vocabEntry && !activeWord.vocabEntry.image ? 'word-popover--vocab' : ''}`} ref={popoverRef} style={{ opacity: 0 }}>
          {showImage && activeWord.vocabEntry?.image ? (
            <div className="tooltip-image-layout">
              <img
                className="tooltip-vocab-image"
                src={`/vocab-images/${activeWord.vocabEntry.image}`}
                alt={activeWord.vocabEntry.definition}
              />
              <div className="tooltip-image-text">
                <span className="tooltip-greek greek">{activeWord.vocabEntry.greek}</span>
                {activeWord.vocabEntry.transliteration && (
                  <span className="tooltip-transliteration">{activeWord.vocabEntry.transliteration}</span>
                )}
                <span className="tooltip-def">{t(activeWord.vocabEntry.definition, activeWord.vocabEntry.translations, lang)}</span>
              </div>
              <button className="tooltip-close" onClick={() => { setActiveWord(null); setShowImage(false) }}>✕</button>
            </div>
          ) : showImage && activeWord.vocabEntry ? (
            <div className="tooltip-vocab-layout">
              <div className="tooltip-vocab-header">
                <span className="tooltip-greek greek">{activeWord.vocabEntry.greek}</span>
                {activeWord.vocabEntry.transliteration && (
                  <span className="tooltip-transliteration">{activeWord.vocabEntry.transliteration}</span>
                )}
              </div>
              {activeWord.vocabEntry.partOfSpeech && (
                <span className="tooltip-pos">{activeWord.vocabEntry.partOfSpeech}</span>
              )}
              <span className="tooltip-def">{t(activeWord.vocabEntry.definition, activeWord.vocabEntry.translations, lang)}</span>
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

import { useState, useEffect } from 'react'
import { useLanguage, t } from '../../context/LanguageContext.jsx'
import './VocabularyTab.css'

export default function VocabularyTab({ words, unitId, chapterId, activePart }) {
  const { lang } = useLanguage()
  const filtered = words ? words.filter(w => !w.part || w.part === activePart) : []

  const [index, setIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [seen, setSeen] = useState({})

  // Reset card position when part or chapter changes
  useEffect(() => {
    setIndex(0)
    setFlipped(false)
  }, [unitId, chapterId, activePart])

  if (!words || filtered.length === 0) {
    return (
      <div className="empty-tab">
        <p>📋 Vocabulary for this part has not been added yet.</p>
      </div>
    )
  }

  const word = filtered[index]
  const seenCount = Object.values(seen).reduce((a, b) => a + b, 0)

  function markSeen(wordId) {
    setSeen(prev => ({ ...prev, [wordId]: (prev[wordId] || 0) + 1 }))
  }

  function handleFlip() {
    if (!flipped) markSeen(word.id)
    setFlipped(v => !v)
  }

  function handleNext() {
    setFlipped(false)
    setTimeout(() => setIndex(i => (i + 1) % filtered.length), 150)
  }

  function handlePrev() {
    setFlipped(false)
    setTimeout(() => setIndex(i => (i - 1 + filtered.length) % filtered.length), 150)
  }

  return (
    <div className="vocab-tab">
      <div className="vocab-header">
        <h2>Vocabulary Flashcards</h2>
        <div className="vocab-stats">
          <span>{index + 1} / {filtered.length}</span>
          <span className="seen-badge">{seenCount} reviews</span>
        </div>
      </div>

      {/* Progress dots */}
      <div className="vocab-dots">
        {filtered.map((w, i) => (
          <button
            key={w.id}
            className={`vocab-dot ${i === index ? 'vocab-dot--active' : ''} ${seen[w.id] ? 'vocab-dot--seen' : ''}`}
            onClick={() => { setFlipped(false); setIndex(i) }}
            aria-label={`Word ${i + 1}`}
          />
        ))}
      </div>

      {/* Flashcard */}
      <div className={`flashcard ${flipped ? 'flashcard--flipped' : ''}`} onClick={handleFlip}>
        <div className="flashcard-inner">
          <div className="flashcard-front">
            {word.image ? (
              <>
                <div className="flashcard-strip flashcard-strip--top">
                  <div className="flashcard-hint">Tap to reveal</div>
                </div>
                <img
                  src={`/vocab-images/${word.image}`}
                  alt={t(word.definition, word.translations, lang)}
                  className="flashcard-image"
                />
                <div className="flashcard-strip flashcard-strip--bottom">
                  <div className="flashcard-greek greek">{word.greek}</div>
                  {seen[word.id] > 0 && <div className="flashcard-seen-count-inline">Seen {seen[word.id]}×</div>}
                </div>
              </>
            ) : (
              <>
                <div className="flashcard-hint">Tap to reveal</div>
                <div className="flashcard-greek greek">{word.greek}</div>
                <div className="flashcard-transliteration">{word.transliteration}</div>
                {seen[word.id] > 0 && <div className="flashcard-seen-count">Seen {seen[word.id]}×</div>}
              </>
            )}
          </div>
          <div className="flashcard-back">
            <div className="flashcard-hint">Tap to flip back</div>
            <div className="flashcard-greek greek">{word.greek}</div>
            <div className="flashcard-definition">{t(word.definition, word.translations, lang)}</div>
            <div className="flashcard-pos">{word.partOfSpeech}</div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="vocab-nav">
        <button className="nav-btn" onClick={handlePrev}>← Previous</button>
        <button className="nav-btn nav-btn--primary" onClick={handleFlip}>
          {flipped ? 'Hide' : 'Reveal'}
        </button>
        <button className="nav-btn" onClick={handleNext}>Next →</button>
      </div>

      {/* Word list */}
      <div className="word-list-section">
        <h3>All Words — {filtered.length} words</h3>
        <div className="word-list">
          {filtered.map((w, i) => (
            <div
              key={w.id}
              className={`word-row ${i === index ? 'word-row--active' : ''}`}
              onClick={() => { setFlipped(false); setIndex(i) }}
            >
              <span className="word-row-num">{i + 1}</span>
              <span className="word-row-greek greek">{w.greek}</span>
              <span className={`word-row-def ${i === index ? 'word-row-def--visible' : 'word-row-def--hidden'}`}>{t(w.definition, w.translations, lang)}</span>
              {seen[w.id] > 0 && <span className="word-row-seen">{seen[w.id]}×</span>}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

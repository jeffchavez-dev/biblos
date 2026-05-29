import { useState, useEffect } from 'react'
import './VocabularyTab.css'

function getSeenKey(unitId, chapterId) {
  return `biblos_seen_u${unitId}c${chapterId}`
}

export default function VocabularyTab({ words, unitId, chapterId }) {
  const [index, setIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [seen, setSeen] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(getSeenKey(unitId, chapterId)) || '{}')
    } catch { return {} }
  })

  useEffect(() => {
    setIndex(0)
    setFlipped(false)
  }, [unitId, chapterId])

  if (!words || words.length === 0) {
    return <EmptyTab />
  }

  const word = words[index]
  const seenCount = Object.values(seen).reduce((a, b) => a + b, 0)

  function markSeen(wordId) {
    const next = { ...seen, [wordId]: (seen[wordId] || 0) + 1 }
    setSeen(next)
    localStorage.setItem(getSeenKey(unitId, chapterId), JSON.stringify(next))
  }

  function handleFlip() {
    if (!flipped) markSeen(word.id)
    setFlipped(v => !v)
  }

  function handleNext() {
    setFlipped(false)
    setTimeout(() => setIndex(i => (i + 1) % words.length), 150)
  }

  function handlePrev() {
    setFlipped(false)
    setTimeout(() => setIndex(i => (i - 1 + words.length) % words.length), 150)
  }

  return (
    <div className="vocab-tab">
      <div className="vocab-header">
        <h2>Vocabulary Flashcards</h2>
        <div className="vocab-stats">
          <span>{index + 1} / {words.length}</span>
          <span className="seen-badge">{seenCount} reviews total</span>
        </div>
      </div>

      {/* Progress dots */}
      <div className="vocab-dots">
        {words.map((w, i) => (
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
            <div className="flashcard-hint">Tap to reveal</div>
            <div className="flashcard-greek greek">{word.greek}</div>
            <div className="flashcard-transliteration">{word.transliteration}</div>
            {seen[word.id] > 0 && (
              <div className="flashcard-seen-count">Seen {seen[word.id]}×</div>
            )}
          </div>
          <div className="flashcard-back">
            <div className="flashcard-hint">Tap to flip back</div>
            <div className="flashcard-greek greek">{word.greek}</div>
            <div className="flashcard-definition">{word.definition}</div>
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
        <h3>All Words — Unit {unitId}, Chapter {chapterId}</h3>
        <div className="word-list">
          {words.map((w, i) => (
            <div
              key={w.id}
              className={`word-row ${i === index ? 'word-row--active' : ''}`}
              onClick={() => { setFlipped(false); setIndex(i) }}
            >
              <span className="word-row-num">{i + 1}</span>
              <span className="word-row-greek greek">{w.greek}</span>
              <span className="word-row-def">{w.definition}</span>
              {seen[w.id] > 0 && <span className="word-row-seen">{seen[w.id]}×</span>}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function EmptyTab() {
  return (
    <div className="empty-tab">
      <p>📋 Vocabulary for this chapter has not been added yet.</p>
    </div>
  )
}

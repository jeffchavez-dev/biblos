import { useState, useEffect } from 'react'
import { useLanguage, useUI, t } from '../../context/LanguageContext.jsx'
import FullscreenViewer from '../FullscreenViewer.jsx'
import './VocabularyTab.css'

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function lemma(greek) {
  return greek.split(',')[0].trim()
}

function buildOptions(allWords, correct) {
  const wrongs = shuffle(allWords.filter(w => w.id !== correct.id)).slice(0, 2)
  return shuffle([correct, ...wrongs])
}

// ── Introduction ─────────────────────────────────────────────────────────────
function IntroMode({ filtered, unitId, chapterId, activePart, lang, ui }) {
  const [index, setIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [seen, setSeen] = useState({})
  const [fullscreen, setFullscreen] = useState(false)

  useEffect(() => { setIndex(0); setFlipped(false) }, [unitId, chapterId, activePart])

  const word = filtered[index]
  const seenCount = Object.values(seen).reduce((a, b) => a + b, 0)

  function markSeen(id) { setSeen(prev => ({ ...prev, [id]: (prev[id] || 0) + 1 })) }
  function handleFlip() { if (!flipped) markSeen(word.id); setFlipped(v => !v) }
  function handleNext() { setFlipped(false); setTimeout(() => setIndex(i => (i + 1) % filtered.length), 150) }
  function handlePrev() { setFlipped(false); setTimeout(() => setIndex(i => (i - 1 + filtered.length) % filtered.length), 150) }

  const imageWords = filtered.filter(w => w.image)
  const imageSrcs = imageWords.map(w => `/vocab-images/${w.image}`)
  const imageCaptions = imageWords.map(w => ({ greek: w.greek }))
  const fsIndex = imageWords.findIndex(w => w.id === word.id)

  function openFullscreen(e) { e.stopPropagation(); if (word.image) setFullscreen(true) }
  function fsPrev() {
    const cur = imageWords.findIndex(w => w.id === word.id)
    if (cur > 0) { setFlipped(false); setIndex(filtered.indexOf(imageWords[cur - 1])) }
  }
  function fsNext() {
    const cur = imageWords.findIndex(w => w.id === word.id)
    if (cur < imageWords.length - 1) { setFlipped(false); setIndex(filtered.indexOf(imageWords[cur + 1])) }
  }

  return (
    <>
      {fullscreen && word.image && (
        <FullscreenViewer images={imageSrcs} captions={imageCaptions} index={Math.max(0, fsIndex)} onClose={() => setFullscreen(false)} onPrev={fsPrev} onNext={fsNext} />
      )}
      <div className="vocab-header">
        <h2>{ui('vocabFlashcards')}</h2>
        <div className="vocab-stats">
          <span>{index + 1} / {filtered.length}</span>
          <span className="seen-badge">{seenCount} {ui('reviews')}</span>
        </div>
      </div>
      <div className="vocab-dots">
        {filtered.map((w, i) => (
          <button key={w.id} className={`vocab-dot ${i === index ? 'vocab-dot--active' : ''} ${seen[w.id] ? 'vocab-dot--seen' : ''}`} onClick={() => { setFlipped(false); setIndex(i) }} aria-label={`Word ${i + 1}`} />
        ))}
      </div>
      <div className={`flashcard ${flipped ? 'flashcard--flipped' : ''}`} onClick={handleFlip}>
        <div className="flashcard-inner">
          <div className="flashcard-front">
            {word.image ? (
              <>
                <div className="flashcard-strip flashcard-strip--top">
                  <div className="flashcard-hint">{ui('tapToReveal')}</div>
                  <button className="flashcard-fs-btn" onClick={openFullscreen} aria-label="Fullscreen">⛶</button>
                </div>
                <img src={`/vocab-images/${word.image}`} alt={t(word.definition, word.translations, lang)} className="flashcard-image" />
                <div className="flashcard-strip flashcard-strip--bottom">
                  <div className="flashcard-greek greek">{word.greek}</div>
                  {seen[word.id] > 0 && <div className="flashcard-seen-count-inline">{ui('seen')} {seen[word.id]}×</div>}
                </div>
              </>
            ) : (
              <>
                <div className="flashcard-hint">{ui('tapToReveal')}</div>
                <div className="flashcard-greek greek">{word.greek}</div>
                <div className="flashcard-transliteration">{word.transliteration}</div>
                {seen[word.id] > 0 && <div className="flashcard-seen-count">{ui('seen')} {seen[word.id]}×</div>}
              </>
            )}
          </div>
          <div className="flashcard-back">
            <div className="flashcard-hint">{ui('tapToFlipBack')}</div>
            <div className="flashcard-greek greek">{word.greek}</div>
            <div className="flashcard-definition">{t(word.definition, word.translations, lang)}</div>
            <div className="flashcard-pos">{word.partOfSpeech}</div>
          </div>
        </div>
      </div>
      <div className="vocab-nav">
        <button className="nav-btn" onClick={handlePrev}>{ui('prev')}</button>
        <button className="nav-btn nav-btn--primary" onClick={handleFlip}>{flipped ? ui('hide') : ui('reveal')}</button>
        <button className="nav-btn" onClick={handleNext}>{ui('next')}</button>
      </div>
    </>
  )
}

// ── Practice ─────────────────────────────────────────────────────────────────
function PracticeMode({ filtered, lang, ui }) {
  const imageFiltered = filtered.filter(w => w.image)
  const [words, setWords] = useState(() => shuffle(imageFiltered))
  const [index, setIndex] = useState(0)
  const [options, setOptions] = useState([])
  const [selected, setSelected] = useState(null)
  const [score, setScore] = useState({ correct: 0, total: 0 })
  const [fullscreen, setFullscreen] = useState(false)

  const word = words[index]

  if (imageFiltered.length === 0) {
    return <div className="empty-tab">🖼️ No images available for practice yet.</div>
  }

  useEffect(() => {
    if (!word) return
    setOptions(buildOptions(imageFiltered, word))
    setSelected(null)
  }, [index, word])

  if (!word) return null

  function handleSelect(opt) {
    if (selected !== null) return
    setSelected(opt.id)
    setScore(s => ({ correct: s.correct + (opt.id === word.id ? 1 : 0), total: s.total + 1 }))
  }

  function handleNext() {
    if (index < words.length - 1) {
      setIndex(i => i + 1)
    } else {
      setWords(shuffle(imageFiltered))
      setIndex(0)
      setScore({ correct: 0, total: 0 })
    }
  }

  const isLast = index === words.length - 1
  const def = t(word.definition, word.translations, lang)

  function renderOptions(inFullscreen = false) {
    return (
      <div className={`practice-options${inFullscreen ? ' practice-options--fs' : ''}`}>
        {options.map(opt => {
          let cls = 'practice-option'
          if (selected !== null) {
            if (opt.id === word.id) cls += ' practice-option--correct'
            else if (opt.id === selected) cls += ' practice-option--wrong'
          }
          return (
            <button key={opt.id} className={cls} onClick={() => handleSelect(opt)}>
              <span className="greek">{lemma(opt.greek)}</span>
            </button>
          )
        })}
      </div>
    )
  }

  return (
    <>
      {fullscreen && word.image && (
        <div className="practice-fs-overlay" onClick={() => setFullscreen(false)}>
          <button className="fs-close" onClick={() => setFullscreen(false)} aria-label="Close">✕</button>
          <div className="practice-fs-image-wrap" onClick={e => e.stopPropagation()}>
            <img
              className="fs-image"
              src={`/vocab-images/${word.image}`}
              alt="vocabulary"
            />
            {selected !== null && (
              <>
                <div className={`practice-result-icon ${selected === word.id ? 'practice-result-icon--correct' : 'practice-result-icon--wrong'}`}>
                  {selected === word.id ? '✓' : '✗'}
                </div>
                <button className="practice-next-arrow" onClick={handleNext} aria-label="Next">›</button>
              </>
            )}
          </div>
          <div className="practice-fs-controls" onClick={e => e.stopPropagation()}>
            {renderOptions(true)}
          </div>
        </div>
      )}

      <div className="vocab-header">
        <h2>Practice</h2>
        <div className="vocab-stats">
          <span>{index + 1} / {words.length}</span>
          {score.total > 0 && <span className="seen-badge">{score.correct}/{score.total}</span>}
        </div>
      </div>
      <div className="practice-card">
        {word.image ? (
          <div className="practice-image-wrap">
            <img src={`/vocab-images/${word.image}`} alt="vocabulary" className="practice-image" />
            <button className="flashcard-fs-btn practice-fs-btn" onClick={() => setFullscreen(true)} aria-label="Fullscreen">⛶</button>
            {selected !== null && (
              <>
                <div className={`practice-result-icon ${selected === word.id ? 'practice-result-icon--correct' : 'practice-result-icon--wrong'}`}>
                  {selected === word.id ? '✓' : '✗'}
                </div>
                <button className="practice-next-arrow" onClick={handleNext} aria-label="Next">›</button>
              </>
            )}
          </div>
        ) : (
          <div className="practice-prompt">{def}</div>
        )}
        <p className="practice-question">Which Greek word matches?</p>
        {renderOptions()}
      </div>
    </>
  )
}

// ── Master ────────────────────────────────────────────────────────────────────
function MasterMode({ filtered, lang, ui }) {
  const [words, setWords] = useState(() => shuffle(filtered))
  const [index, setIndex] = useState(0)
  const [input, setInput] = useState('')
  const [result, setResult] = useState(null)
  const [score, setScore] = useState({ correct: 0, total: 0 })

  const word = words[index]
  if (!word) return null

  const def = t(word.definition, word.translations, lang)
  const answer = lemma(word.greek)

  function handleSubmit(e) {
    e.preventDefault()
    if (result !== null) return
    const isCorrect = input.trim() === answer
    setResult(isCorrect ? 'correct' : 'wrong')
    setScore(s => ({ correct: s.correct + (isCorrect ? 1 : 0), total: s.total + 1 }))
  }

  function handleNext() {
    if (index < words.length - 1) {
      setIndex(i => i + 1)
    } else {
      setWords(shuffle(filtered))
      setIndex(0)
      setScore({ correct: 0, total: 0 })
    }
    setInput('')
    setResult(null)
  }

  const isLast = index === words.length - 1

  return (
    <>
      <div className="vocab-header">
        <h2>Master</h2>
        <div className="vocab-stats">
          <span>{index + 1} / {words.length}</span>
          {score.total > 0 && <span className="seen-badge">{score.correct}/{score.total}</span>}
        </div>
      </div>
      <div className="master-card">
        {word.image ? (
          <img src={`/vocab-images/${word.image}`} alt="vocabulary" className="practice-image" />
        ) : (
          <div className="practice-prompt">{def}</div>
        )}
        <p className="practice-question">Type the Greek word:</p>
        <form onSubmit={handleSubmit} className="master-form">
          <input
            className={`master-input${result === 'correct' ? ' master-input--correct' : result === 'wrong' ? ' master-input--wrong' : ''}`}
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Type in Greek…"
            disabled={result !== null}
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
          />
          {result === null && (
            <button type="submit" className="nav-btn nav-btn--primary" disabled={!input.trim()}>Check</button>
          )}
        </form>
      </div>
      {result !== null && (
        <>
          <div className={`practice-result-icon ${result === 'correct' ? 'practice-result-icon--correct' : 'practice-result-icon--wrong'}`}>
            {result === 'correct' ? '✓' : '✗'}
          </div>
          <button className="practice-next-arrow" onClick={handleNext} aria-label="Next">›</button>
        </>
      )}
    </>
  )
}

// ── Main export ───────────────────────────────────────────────────────────────
export default function VocabularyTab({ words, unitId, chapterId, activePart }) {
  const { lang } = useLanguage()
  const ui = useUI()
  const [mode, setMode] = useState('intro')
  const filtered = words ? words.filter(w => !w.part || w.part === activePart) : []

  useEffect(() => { setMode('intro') }, [unitId, chapterId, activePart])

  if (!words || filtered.length === 0) {
    return <div className="empty-tab"><p>📋 Vocabulary for this part has not been added yet.</p></div>
  }

  return (
    <div className="vocab-tab">
      <div className="vocab-mode-tabs">
        {[
          { id: 'intro',    label: 'Introduction' },
          { id: 'practice', label: 'Practice' },
          { id: 'master',   label: 'Master' },
        ].map(m => (
          <button key={m.id} className={`vocab-mode-btn ${mode === m.id ? 'vocab-mode-btn--active' : ''}`} onClick={() => setMode(m.id)}>
            {m.label}
          </button>
        ))}
      </div>

      {mode === 'intro' && (
        <IntroMode filtered={filtered} unitId={unitId} chapterId={chapterId} activePart={activePart} lang={lang} ui={ui} />
      )}
      {mode === 'practice' && (
        <PracticeMode key={`practice-${unitId}-${chapterId}-${activePart}`} filtered={filtered} lang={lang} ui={ui} />
      )}
      {mode === 'master' && (
        <MasterMode key={`master-${unitId}-${chapterId}-${activePart}`} filtered={filtered} lang={lang} ui={ui} />
      )}
    </div>
  )
}

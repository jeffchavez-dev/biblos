import { useState, useEffect, useRef } from 'react'
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

function lemma(greek) { return greek.split(',')[0].trim() }

// Prefer same part-of-speech distractors, fall back to any
function buildOptions(pool, correct, count = 3) {
  const pos = correct.partOfSpeech
  const samePOS = shuffle(pool.filter(w => w.id !== correct.id && w.partOfSpeech === pos))
  const other   = shuffle(pool.filter(w => w.id !== correct.id && w.partOfSpeech !== pos))
  const wrongs  = [...samePOS, ...other].slice(0, count - 1)
  return shuffle([correct, ...wrongs])
}

// Strip diacritics for forgiving Greek typing comparison
function normalizeInput(s) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
}

// ── Greek keyboard ────────────────────────────────────────────────────────────
// Layout mirrors the standard Greek QWERTY keyboard (W=ς E=ε R=ρ … Z=ζ X=χ C=ψ V=ω …)
const GREEK_ROWS = [
  ['ς','ε','ρ','τ','υ','θ','ι','ο','π'],
  ['α','σ','δ','φ','γ','η','ξ','κ','λ'],
  ['ζ','χ','ψ','ω','β','ν','μ','⌫','·'],
]

const DIACRITIC_KEYS = [
  { label: '᾿', id: 'smooth',    mark: '̓' },
  { label: '῾', id: 'rough',     mark: '̔' },
  { label: '΄', id: 'acute',     mark: '́' },
  { label: '`', id: 'grave',     mark: '̀' },
  { label: '῀', id: 'circum',    mark: '͂' },
  { label: '¨', id: 'diaer',     mark: '̈' },
  { label: 'ͅ', id: 'subscript', mark: 'ͅ' },
]

const VOWELS = new Set('αεηιουωΑΕΗΙΟΥΩ')

function GreekKeyboard({ onKey }) {
  const [pending, setPending] = useState(new Set())

  function toggleDiacritic(id) {
    setPending(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function handleKey(k) {
    if (k === '⌫') {
      if (pending.size > 0) { setPending(new Set()); return }
      onKey('⌫')
      return
    }
    if (pending.size > 0 && VOWELS.has(k)) {
      const marks = DIACRITIC_KEYS.filter(d => pending.has(d.id)).map(d => d.mark).join('')
      onKey((k + marks).normalize('NFC'))
      setPending(new Set())
    } else {
      if (pending.size > 0) setPending(new Set())
      onKey(k)
    }
  }

  return (
    <div className="greek-kb">
      <div className="greek-kb-row greek-kb-diacritics">
        {DIACRITIC_KEYS.map(d => (
          <button
            key={d.id}
            type="button"
            className={`greek-kb-key greek-kb-key--diacritic${pending.has(d.id) ? ' greek-kb-key--active' : ''}`}
            onMouseDown={e => { e.preventDefault(); toggleDiacritic(d.id) }}
          >
            {d.label}
          </button>
        ))}
      </div>
      {GREEK_ROWS.map((row, ri) => (
        <div key={ri} className="greek-kb-row">
          {row.map(k => (
            <button
              key={k}
              type="button"
              className={`greek-kb-key${k === '⌫' ? ' greek-kb-key--wide' : ''}`}
              onMouseDown={e => { e.preventDefault(); handleKey(k) }}
            >
              {k}
            </button>
          ))}
        </div>
      ))}
    </div>
  )
}

// ── Learn (flashcards) ────────────────────────────────────────────────────────
function LearnMode({ filtered, unitId, chapterId, activePart, lang, ui }) {
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

// ── Test (image → pick Greek word, same POS distractors) ─────────────────────
function TestMode({ filtered, lang, ui }) {
  const imageFiltered = filtered.filter(w => w.image)
  const [words, setWords] = useState(() => shuffle(imageFiltered))
  const [index, setIndex] = useState(0)
  const [options, setOptions] = useState([])
  const [selected, setSelected] = useState(null)
  const [score, setScore] = useState({ correct: 0, total: 0 })
  const [fullscreen, setFullscreen] = useState(false)

  const word = words[index]

  useEffect(() => {
    if (!word) return
    // Use full filtered pool for distractors so same-POS matching has maximum choices
    setOptions(buildOptions(filtered, word, 3))
    setSelected(null)
  }, [index, word])

  // Auto-advance 1.5s after correct answer
  useEffect(() => {
    if (selected === null || selected !== word?.id) return
    const timer = setTimeout(() => handleNext(), 1500)
    return () => clearTimeout(timer)
  }, [selected])

  if (imageFiltered.length < 3) {
    return <div className="empty-tab">🖼️ Need at least 3 vocabulary images for Recognize mode.</div>
  }
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
            <button key={opt.id} className={cls} onClick={() => handleSelect(opt)} disabled={selected !== null}>
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
            <img className="fs-image" src={`/vocab-images/${word.image}`} alt="vocabulary" />
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
        <h2>Recognize</h2>
        <div className="vocab-stats">
          <span>{index + 1} / {words.length}</span>
          {score.total > 0 && <span className="seen-badge">{score.correct}/{score.total}</span>}
        </div>
      </div>
      <div className="practice-card">
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
        {renderOptions()}
      </div>
    </>
  )
}

// ── Challenge — Type it ───────────────────────────────────────────────────────
function ChallengeType({ filtered, lang, ui }) {
  const [words, setWords] = useState(() => shuffle(filtered))
  const [index, setIndex] = useState(0)
  const [input, setInput] = useState('')
  const [result, setResult] = useState(null)
  const [score, setScore] = useState({ correct: 0, total: 0 })
  const [showKb, setShowKb] = useState(true)
  const inputRef = useRef(null)

  const word = words[index]
  if (!word) return null

  const def = t(word.definition, word.translations, lang)
  const answer = lemma(word.greek)

  function handleSubmit(e) {
    e.preventDefault()
    if (result !== null || !input.trim()) return
    const isCorrect = normalizeInput(input) === normalizeInput(answer)
    setResult(isCorrect ? 'correct' : 'wrong')
    setScore(s => ({ correct: s.correct + (isCorrect ? 1 : 0), total: s.total + 1 }))
  }

  function handleNext() {
    if (index < words.length - 1) setIndex(i => i + 1)
    else { setWords(shuffle(filtered)); setIndex(0); setScore({ correct: 0, total: 0 }) }
    setInput('')
    setResult(null)
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  function handleKey(k) {
    if (result !== null) return
    if (k === '⌫') { setInput(v => v.slice(0, -1)); return }
    setInput(v => v + k)
    inputRef.current?.focus()
  }

  return (
    <>
      <div className="vocab-header">
        <h2>Produce — Type it</h2>
        <div className="vocab-stats">
          <span>{index + 1} / {words.length}</span>
          {score.total > 0 && <span className="seen-badge">{score.correct}/{score.total}</span>}
        </div>
      </div>
      <div className="challenge-card">
        {word.image
          ? <img src={`/vocab-images/${word.image}`} alt="vocabulary" className="practice-image" />
          : <div className="practice-prompt">{def}</div>
        }
        <p className="practice-question">Type the Greek word:</p>
        <form onSubmit={handleSubmit} className="master-form">
          <input
            ref={inputRef}
            className={`master-input greek${result === 'correct' ? ' master-input--correct' : result === 'wrong' ? ' master-input--wrong' : ''}`}
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="αβγ…"
            disabled={result !== null}
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
          />
          {result === null
            ? <button type="submit" className="nav-btn nav-btn--primary" disabled={!input.trim()}>Check</button>
            : <button type="button" className="nav-btn nav-btn--primary" onClick={handleNext}>Next →</button>
          }
        </form>

        {result !== null && (
          <div className={`challenge-result ${result === 'correct' ? 'challenge-result--correct' : 'challenge-result--wrong'}`}>
            {result === 'correct' ? '✓ Correct!' : `✗ Answer: `}
            {result === 'wrong' && <span className="greek challenge-answer">{answer}</span>}
          </div>
        )}

        <div className="challenge-kb-toggle">
          <button type="button" className="nav-btn" onClick={() => setShowKb(v => !v)}>
            {showKb ? 'Hide keyboard' : 'Show Greek keyboard'}
          </button>
        </div>
        {showKb && <GreekKeyboard onKey={handleKey} />}
        <p className="challenge-hint">Diacritics optional — base letters accepted</p>
      </div>
    </>
  )
}

// ── Challenge — Pick Word ─────────────────────────────────────────────────────
function ChallengePickWord({ filtered, lang, ui }) {
  const [words, setWords] = useState(() => shuffle(filtered))
  const [index, setIndex] = useState(0)
  const [options, setOptions] = useState([])
  const [selected, setSelected] = useState(null)
  const [score, setScore] = useState({ correct: 0, total: 0 })

  const word = words[index]

  useEffect(() => {
    if (!word) return
    setOptions(buildOptions(filtered, word, 4))
    setSelected(null)
  }, [index, word])

  // Auto-advance 1.5s after correct answer
  useEffect(() => {
    if (selected === null || selected !== word?.id) return
    const timer = setTimeout(() => handleNext(), 1500)
    return () => clearTimeout(timer)
  }, [selected])

  if (!word) return null

  const def = t(word.definition, word.translations, lang)

  function handleSelect(opt) {
    if (selected !== null) return
    setSelected(opt.id)
    setScore(s => ({ correct: s.correct + (opt.id === word.id ? 1 : 0), total: s.total + 1 }))
  }

  function handleNext() {
    if (index < words.length - 1) setIndex(i => i + 1)
    else { setWords(shuffle(filtered)); setIndex(0); setScore({ correct: 0, total: 0 }) }
  }

  return (
    <>
      <div className="vocab-header">
        <h2>Produce — Pick Word</h2>
        <div className="vocab-stats">
          <span>{index + 1} / {words.length}</span>
          {score.total > 0 && <span className="seen-badge">{score.correct}/{score.total}</span>}
        </div>
      </div>
      <div className="challenge-card">
        {word.image
          ? <img src={`/vocab-images/${word.image}`} alt="vocabulary" className="practice-image" />
          : <div className="practice-prompt">{def}</div>
        }
        <div className="practice-options practice-options--2col">
          {options.map(opt => {
            let cls = 'practice-option'
            if (selected !== null) {
              if (opt.id === word.id) cls += ' practice-option--correct'
              else if (opt.id === selected) cls += ' practice-option--wrong'
            }
            return (
              <button key={opt.id} className={cls} onClick={() => handleSelect(opt)} disabled={selected !== null}>
                <span className="greek">{lemma(opt.greek)}</span>
              </button>
            )
          })}
        </div>
        {selected !== null && selected !== word.id && (
          <button className="nav-btn nav-btn--primary" onClick={handleNext}>Next →</button>
        )}
      </div>
    </>
  )
}

// ── Challenge — Pick Image (reverse: word → image) ────────────────────────────
function ChallengePickImage({ filtered, lang, ui }) {
  const imageFiltered = filtered.filter(w => w.image)
  const [words, setWords] = useState(() => shuffle(imageFiltered))
  const [index, setIndex] = useState(0)
  const [options, setOptions] = useState([])
  const [selected, setSelected] = useState(null)
  const [score, setScore] = useState({ correct: 0, total: 0 })

  const word = words[index]

  useEffect(() => {
    if (!word) return
    setOptions(buildOptions(imageFiltered, word, 4))
    setSelected(null)
  }, [index, word])

  if (imageFiltered.length < 4) {
    return <div className="empty-tab">🖼️ Need at least 4 vocabulary images for Pick Image mode.</div>
  }
  if (!word) return null

  function handleSelect(opt) {
    if (selected !== null) return
    setSelected(opt.id)
    setScore(s => ({ correct: s.correct + (opt.id === word.id ? 1 : 0), total: s.total + 1 }))
  }

  function handleNext() {
    if (index < words.length - 1) setIndex(i => i + 1)
    else { setWords(shuffle(imageFiltered)); setIndex(0); setScore({ correct: 0, total: 0 }) }
  }

  return (
    <>
      <div className="vocab-header">
        <h2>Produce — Pick Image</h2>
        <div className="vocab-stats">
          <span>{index + 1} / {words.length}</span>
          {score.total > 0 && <span className="seen-badge">{score.correct}/{score.total}</span>}
        </div>
      </div>
      <div className="challenge-card">
        <div className="pick-image-prompt">
          <span className="greek pick-image-word">{lemma(word.greek)}</span>
          {word.partOfSpeech && <span className="pick-image-pos">{word.partOfSpeech}</span>}
        </div>
        <p className="practice-question">Which image matches this word?</p>
        <div className="pick-image-grid">
          {options.map(opt => {
            let cls = 'pick-image-tile'
            if (selected !== null) {
              if (opt.id === word.id) cls += ' pick-image-tile--correct'
              else if (opt.id === selected) cls += ' pick-image-tile--wrong'
            }
            return (
              <button key={opt.id} className={cls} onClick={() => handleSelect(opt)} disabled={selected !== null}>
                <img src={`/vocab-images/${opt.image}`} alt="" className="pick-image-thumb" />
                {selected !== null && opt.id === word.id && (
                  <div className="pick-image-badge pick-image-badge--correct">✓</div>
                )}
                {selected !== null && opt.id === selected && opt.id !== word.id && (
                  <div className="pick-image-badge pick-image-badge--wrong">✗</div>
                )}
              </button>
            )
          })}
        </div>
        {selected !== null && (
          <div className={`challenge-result ${selected === word.id ? 'challenge-result--correct' : 'challenge-result--wrong'}`}>
            {selected === word.id ? '✓ Correct!' : (
              <>✗ It was <span className="greek challenge-answer">{lemma(word.greek)}</span> — <span>{t(word.definition, word.translations, lang)}</span></>
            )}
          </div>
        )}
        {selected !== null && (
          <button className="nav-btn nav-btn--primary" onClick={handleNext}>Next →</button>
        )}
      </div>
    </>
  )
}

// ── Challenge wrapper ─────────────────────────────────────────────────────────
function ChallengeMode({ filtered, lang, ui }) {
  const [sub, setSub] = useState('type')
  const key = `${filtered.length}-${sub}`

  return (
    <>
      <div className="challenge-sub-tabs">
        {[
          { id: 'type',       label: '✍️ Type it' },
          { id: 'pick-word',  label: '🔤 Pick Word' },
          { id: 'pick-image', label: '🖼️ Pick Image' },
        ].map(s => (
          <button
            key={s.id}
            className={`challenge-sub-btn ${sub === s.id ? 'challenge-sub-btn--active' : ''}`}
            onClick={() => setSub(s.id)}
          >
            {s.label}
          </button>
        ))}
      </div>
      {sub === 'type'       && <ChallengeType      key={key} filtered={filtered} lang={lang} ui={ui} />}
      {sub === 'pick-word'  && <ChallengePickWord  key={key} filtered={filtered} lang={lang} ui={ui} />}
      {sub === 'pick-image' && <ChallengePickImage key={key} filtered={filtered} lang={lang} ui={ui} />}
    </>
  )
}

// ── Main export ───────────────────────────────────────────────────────────────
export default function VocabularyTab({ words, unitId, chapterId, activePart }) {
  const { lang } = useLanguage()
  const ui = useUI()
  const [mode, setMode] = useState('learn')
  const filtered = words ? words.filter(w => !w.part || w.part === activePart) : []

  useEffect(() => { setMode('learn') }, [unitId, chapterId, activePart])

  if (!words || filtered.length === 0) {
    return <div className="empty-tab"><p>📋 Vocabulary for this part has not been added yet.</p></div>
  }

  return (
    <div className="vocab-tab">
      <div className="vocab-mode-tabs">
        {[
          { id: 'learn',     label: '📖 Encounter' },
          { id: 'test',      label: '👁️ Recognize' },
          { id: 'challenge', label: '✍️ Produce' },
        ].map(m => (
          <button key={m.id} className={`vocab-mode-btn ${mode === m.id ? 'vocab-mode-btn--active' : ''}`} onClick={() => setMode(m.id)}>
            {m.label}
          </button>
        ))}
      </div>

      {mode === 'learn' && (
        <LearnMode filtered={filtered} unitId={unitId} chapterId={chapterId} activePart={activePart} lang={lang} ui={ui} />
      )}
      {mode === 'test' && (
        <TestMode key={`test-${unitId}-${chapterId}-${activePart}`} filtered={filtered} lang={lang} ui={ui} />
      )}
      {mode === 'challenge' && (
        <ChallengeMode key={`challenge-${unitId}-${chapterId}-${activePart}`} filtered={filtered} lang={lang} ui={ui} />
      )}
    </div>
  )
}

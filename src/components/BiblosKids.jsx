import { useState } from 'react'
import './BiblosKids.css'

const B = '/biblos-kids-images/'

const LETTERS = [
  {
    letter: 'α', name: 'alpha',
    intro:     B + '1.⁠α and name.jpeg',
    letterImg: B + '2.α letter.jpeg',
    nameImg:   B + '3.α name.jpeg',
    audioSrc:  null,
  },
  {
    letter: 'β', name: 'beta',
    intro:     B + '1.⁠β and name.jpeg',
    letterImg: B + '2.β letter.jpeg',
    nameImg:   B + '3.β name.jpeg',
    audioSrc:  null,
  },
  {
    letter: 'γ', name: 'gamma',
    intro:     B + '1.⁠γ and name.jpeg',
    letterImg: B + '2.γ letter.jpeg',
    nameImg:   B + '3.γ name.jpeg',
    audioSrc:  null,
  },
  {
    letter: 'δ', name: 'delta',
    intro:     B + '1.⁠δ and name.jpeg',
    letterImg: B + '2.δ letter.jpeg',
    nameImg:   B + '3.⁠δ name.jpeg',
    audioSrc:  null,
  },
]

function buildQuestions() {
  const modeA = LETTERS.map(l => ({
    mode: 'A',
    correct: l.letter,
    stimulus: l.letterImg,
    options: LETTERS.map(o => ({ letter: o.letter, img: o.nameImg })),
  }))
  const modeB = LETTERS.map(l => ({
    mode: 'B',
    correct: l.letter,
    stimulus: l.nameImg,
    options: LETTERS.map(o => ({ letter: o.letter, img: o.letterImg })),
  }))
  return [...modeA, ...modeB]
}

const QUESTIONS = buildQuestions()

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export default function BiblosKids({ onGoHome }) {
  const [screen, setScreen]   = useState('intro')
  const [qIndex, setQIndex]   = useState(0)
  const [selected, setSelected] = useState(null)
  const [phase, setPhase]     = useState('asking')
  const [opts, setOpts]       = useState(() => shuffle(QUESTIONS[0].options))

  function startQuiz() {
    setScreen('quiz')
    setQIndex(0)
    setSelected(null)
    setPhase('asking')
    setOpts(shuffle(QUESTIONS[0].options))
  }

  function advance() {
    const next = qIndex + 1
    if (next >= QUESTIONS.length) {
      setScreen('done')
    } else {
      setQIndex(next)
      setSelected(null)
      setPhase('asking')
      setOpts(shuffle(QUESTIONS[next].options))
    }
  }

  function handleSelect(opt) {
    if (phase !== 'asking') return
    setSelected(opt.letter)
    setPhase('feedback')
    const correct = opt.letter === QUESTIONS[qIndex].correct
    setTimeout(() => advance(), correct ? 900 : 1500)
  }

  function reset() {
    setScreen('intro')
    setQIndex(0)
    setSelected(null)
    setPhase('asking')
    setOpts(shuffle(QUESTIONS[0].options))
  }

  const q = QUESTIONS[qIndex]

  return (
    <div className="bk-root">
      <header className="bk-header">
        <button className="bk-back-btn" onClick={onGoHome}>← Home</button>
        <span className="bk-header-title greek">Βίβλος Kids</span>
        <span className="bk-header-spacer" />
      </header>

      {screen === 'intro' && (
        <div className="bk-intro">
          <div className="bk-intro-heading">
            <h1 className="bk-intro-title">Learn the Greek Alphabet</h1>
            <p className="bk-intro-sub">The first four letters — α β γ δ</p>
          </div>
          <div className="bk-intro-grid">
            {LETTERS.map(l => (
              <div key={l.letter} className="bk-intro-card">
                <img src={l.intro} alt={`${l.letter} — ${l.name}`} className="bk-intro-img" />
              </div>
            ))}
          </div>
          <button className="bk-start-btn" onClick={startQuiz}>Start Quiz →</button>
        </div>
      )}

      {screen === 'quiz' && (
        <div className="bk-quiz">
          <div className="bk-progress" aria-label="Progress">
            {QUESTIONS.map((_, i) => (
              <div
                key={i}
                className={`bk-progress-dot ${i < qIndex ? 'bk-progress-dot--done' : i === qIndex ? 'bk-progress-dot--active' : ''}`}
              />
            ))}
          </div>

          <p className="bk-mode-label">
            {q.mode === 'A' ? 'Which name matches this letter?' : 'Which letter matches this name?'}
          </p>

          <div className="bk-stimulus-wrap">
            <img src={q.stimulus} alt="stimulus" className="bk-stimulus-img" />
          </div>

          <div className="bk-options-grid">
            {opts.map(opt => {
              const isSelected = selected === opt.letter
              const isCorrect  = opt.letter === q.correct
              let cls = 'bk-option'
              if (isSelected && phase === 'feedback') {
                cls += isCorrect ? ' bk-option--correct' : ' bk-option--wrong'
              }
              return (
                <button
                  key={opt.letter}
                  className={cls}
                  onClick={() => handleSelect(opt)}
                  disabled={phase === 'feedback'}
                >
                  <img src={opt.img} alt={opt.letter} className="bk-option-img" />
                  {isSelected && phase === 'feedback' && isCorrect && (
                    <div className="bk-checkmark-overlay" aria-hidden="true">✓</div>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {screen === 'done' && (
        <div className="bk-done">
          <div className="bk-done-emoji">🎉</div>
          <h2 className="bk-done-title">Well done!</h2>
          <p className="bk-done-sub">You finished all 8 questions on <span className="greek">α β γ δ</span></p>
          <div className="bk-done-actions">
            <button className="bk-start-btn" onClick={reset}>Play Again</button>
            <button className="bk-home-btn" onClick={onGoHome}>← Home</button>
          </div>
        </div>
      )}
    </div>
  )
}

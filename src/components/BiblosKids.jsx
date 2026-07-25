import { useState, useEffect, useRef } from 'react'
import './BiblosKids.css'

const B = '/biblos-kids-images/'

const LETTERS = [
  {
    letter: 'α', name: 'alpha',
    intro:     B + '1.α and name.jpeg',
    letterImg: B + '2.α letter.jpeg',
    nameImg:   B + '3.α name.jpeg',
    audioSrc:  null,
  },
  {
    letter: 'β', name: 'beta',
    intro:     B + '1.β and name.jpeg',
    letterImg: B + '2.β letter.jpeg',
    nameImg:   B + '3.β name.jpeg',
    audioSrc:  null,
  },
  {
    letter: 'γ', name: 'gamma',
    intro:     B + '1.γ and name.jpeg',
    letterImg: B + '2.γ letter.jpeg',
    nameImg:   B + '3.γ name.jpeg',
    audioSrc:  null,
  },
  {
    letter: 'δ', name: 'delta',
    intro:     B + '1.δ and name.jpeg',
    letterImg: B + '2.δ letter.jpeg',
    nameImg:   B + '3.δ name.jpeg',
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

const CORRECT_SND  = '/sounds/correct.mp3'
const WRONG_SND    = '/sounds/wrong.mp3'
const CONGRATS_SND = '/sounds/congrats.mp3'

function playSound(src) {
  try { new Audio(src).play() } catch {}
}

function Confetti() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')

    canvas.width  = window.innerWidth
    canvas.height = window.innerHeight
    const W = canvas.width
    const H = canvas.height

    const COLORS = ['#f59e0b','#3b82f6','#22c55e','#ef4444','#a855f7','#ec4899','#14b8a6']
    const pieces = Array.from({ length: 120 }, () => ({
      x:     Math.random() * W,
      y:     Math.random() * -H,
      w:     6 + Math.random() * 8,
      h:     10 + Math.random() * 6,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      rot:   Math.random() * Math.PI * 2,
      rotV:  (Math.random() - 0.5) * 0.12,
      vy:    2.5 + Math.random() * 3,
      vx:    (Math.random() - 0.5) * 1.5,
    }))

    let raf
    let stopped = false

    function draw() {
      ctx.clearRect(0, 0, W, H)
      let allOut = true
      for (const p of pieces) {
        p.y   += p.vy
        p.x   += p.vx
        p.rot += p.rotV
        if (p.y < H + 20) allOut = false
        ctx.save()
        ctx.translate(p.x, p.y)
        ctx.rotate(p.rot)
        ctx.fillStyle = p.color
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h)
        ctx.restore()
      }
      if (!allOut && !stopped) raf = requestAnimationFrame(draw)
    }

    raf = requestAnimationFrame(draw)
    return () => { stopped = true; cancelAnimationFrame(raf) }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 100 }}
    />
  )
}

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export default function BiblosKids({ onGoHome }) {
  const [screen, setScreen]       = useState('home')
  const [letterIdx, setLetterIdx] = useState(0)
  const [qIndex, setQIndex]       = useState(0)
  const [selected, setSelected]   = useState(null)
  const [phase, setPhase]         = useState('asking')
  const [opts, setOpts]           = useState(() => shuffle(QUESTIONS[0].options))

  function startLetterIntro() {
    setLetterIdx(0)
    setScreen('letter')
  }

  function nextLetter() {
    if (letterIdx < LETTERS.length - 1) {
      setLetterIdx(i => i + 1)
    } else {
      setQIndex(0)
      setSelected(null)
      setPhase('asking')
      setOpts(shuffle(QUESTIONS[0].options))
      setScreen('quiz')
    }
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
    playSound(correct ? CORRECT_SND : WRONG_SND)
    setTimeout(() => advance(), correct ? 900 : 1500)
  }

  function reset() {
    setScreen('home')
    setLetterIdx(0)
    setQIndex(0)
    setSelected(null)
    setPhase('asking')
    setOpts(shuffle(QUESTIONS[0].options))
  }

  const q = QUESTIONS[qIndex]
  const isQuiz = screen === 'quiz'

  return (
    <div className={`bk-root${isQuiz ? ' bk-root--quiz' : ''}`}>

      {/* Header — hidden during quiz */}
      {!isQuiz && screen !== 'done' && (
        <header className="bk-header">
          <button className="bk-back-btn" onClick={onGoHome}>← Home</button>
          <span className="bk-header-title greek">Βίβλος Kids</span>
          <span className="bk-header-spacer" />
        </header>
      )}

      {/* ── Home ── */}
      {screen === 'home' && (
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
          <button className="bk-start-btn" onClick={startLetterIntro}>Learn →</button>
        </div>
      )}

      {/* ── Letter intro ── */}
      {screen === 'letter' && (
        <div className="bk-letter-screen">
          <div className="bk-letter-card">
            <img
              src={LETTERS[letterIdx].intro}
              alt={LETTERS[letterIdx].letter}
              className="bk-letter-img"
            />
          </div>
          <div className="bk-letter-nav">
            <button
              className="bk-prev-btn"
              onClick={() => letterIdx > 0 ? setLetterIdx(i => i - 1) : setScreen('home')}
              aria-label="Previous"
            >‹</button>
            <div className="bk-letter-dots">
              {LETTERS.map((_, i) => (
                <div
                  key={i}
                  className={`bk-progress-dot ${i < letterIdx ? 'bk-progress-dot--done' : i === letterIdx ? 'bk-progress-dot--active' : ''}`}
                />
              ))}
            </div>
            <button className="bk-next-btn" onClick={nextLetter} aria-label="Next">
              {letterIdx < LETTERS.length - 1 ? '›' : '▶'}
            </button>
          </div>
        </div>
      )}

      {/* ── Quiz ── */}
      {screen === 'quiz' && (
        <div className="bk-quiz">
          <button className="bk-quiz-back" onClick={onGoHome}>← Home</button>
          <div className="bk-progress" aria-label="Progress">
            {QUESTIONS.map((_, i) => (
              <div
                key={i}
                className={`bk-progress-dot ${i < qIndex ? 'bk-progress-dot--done' : i === qIndex ? 'bk-progress-dot--active' : ''}`}
              />
            ))}
          </div>
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

      {/* ── Done ── */}
      {screen === 'done' && (
        <DoneScreen onReset={reset} onGoHome={onGoHome} />
      )}

    </div>
  )
}

function DoneScreen({ onReset, onGoHome }) {
  useEffect(() => {
    playSound(CONGRATS_SND)
  }, [])

  return (
    <div className="bk-done-root">
      <Confetti />
      <div className="bk-done">
        <div className="bk-done-emoji">🎉</div>
        <h2 className="bk-done-title">Well done!</h2>
        <p className="bk-done-sub">You finished all 8 questions on <span className="greek">α β γ δ</span></p>
        <div className="bk-done-actions">
          <button className="bk-start-btn" onClick={onReset}>Play Again</button>
          <button className="bk-home-btn" onClick={onGoHome}>← Home</button>
        </div>
      </div>
    </div>
  )
}

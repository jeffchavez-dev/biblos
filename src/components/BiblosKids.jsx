import { useState, useEffect, useRef } from 'react'
import './BiblosKids.css'

const B = '/biblos-kids-images/'

const ROUNDS = [
  {
    label: 'Round 1',
    letters: ['α','β','γ','δ'],
    letterNames: ['alpha','beta','gamma','delta'],
  },
  {
    label: 'Round 2',
    letters: ['ε','ζ','η','θ'],
    letterNames: ['epsilon','zeta','eta','theta'],
  },
]

function getLetterData(letter) {
  return {
    letter,
    intro:     B + `1.${letter} and name.jpeg`,
    letterImg: B + `2.${letter} letter.jpeg`,
    nameImg:   B + `3.${letter} name.jpeg`,
  }
}

function buildQuestions(letters) {
  const data = letters.map(getLetterData)
  const modeA = data.map(l => ({
    correct: l.letter,
    stimulus: l.letterImg,
    options: data.map(o => ({ letter: o.letter, img: o.nameImg })),
  }))
  const modeB = data.map(l => ({
    correct: l.letter,
    stimulus: l.nameImg,
    options: data.map(o => ({ letter: o.letter, img: o.letterImg })),
  }))
  return [...modeA, ...modeB]
}

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
        p.y += p.vy; p.x += p.vx; p.rot += p.rotV
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
  // screen: 'home' | 'letter' | 'quiz' | 'done'
  const [screen, setScreen]       = useState('home')
  const [roundIdx, setRoundIdx]   = useState(0)
  const [letterIdx, setLetterIdx] = useState(0)
  const [qIndex, setQIndex]       = useState(0)
  const [selected, setSelected]   = useState(null)
  const [phase, setPhase]         = useState('asking')
  const [opts, setOpts]           = useState([])

  const round = ROUNDS[roundIdx]
  const letters = round.letters.map(getLetterData)
  const questions = buildQuestions(round.letters)

  function startRound(idx) {
    setRoundIdx(idx)
    setLetterIdx(0)
    setScreen('letter')
  }

  function nextLetter() {
    if (letterIdx < letters.length - 1) {
      setLetterIdx(i => i + 1)
    } else {
      const qs = buildQuestions(ROUNDS[roundIdx].letters)
      setQIndex(0)
      setSelected(null)
      setPhase('asking')
      setOpts(shuffle(qs[0].options))
      setScreen('quiz')
    }
  }

  function advance() {
    const qs = buildQuestions(ROUNDS[roundIdx].letters)
    const next = qIndex + 1
    if (next >= qs.length) {
      setScreen('done')
    } else {
      setQIndex(next)
      setSelected(null)
      setPhase('asking')
      setOpts(shuffle(qs[next].options))
    }
  }

  function handleSelect(opt) {
    if (phase !== 'asking') return
    const qs = buildQuestions(ROUNDS[roundIdx].letters)
    setSelected(opt.letter)
    setPhase('feedback')
    const correct = opt.letter === qs[qIndex].correct
    playSound(correct ? CORRECT_SND : WRONG_SND)
    setTimeout(() => advance(), correct ? 900 : 1500)
  }

  function reset() {
    setScreen('home')
    setLetterIdx(0)
    setQIndex(0)
    setSelected(null)
    setPhase('asking')
    setOpts([])
  }

  const qs = buildQuestions(round.letters)
  const q  = qs[qIndex] || qs[0]
  const isQuiz = screen === 'quiz'

  return (
    <div className={`bk-root${isQuiz ? ' bk-root--quiz' : ''}`}>

      {/* Header */}
      {!isQuiz && screen !== 'done' && (
        <header className="bk-header">
          <button className="bk-back-btn" onClick={screen === 'home' ? onGoHome : reset}>
            {screen === 'home' ? '← Home' : '← Rounds'}
          </button>
          <span className="bk-header-title greek">Βίβλος Kids</span>
          <span className="bk-header-spacer" />
        </header>
      )}

      {/* ── Home: two round cards ── */}
      {screen === 'home' && (
        <div className="bk-intro">
          <div className="bk-intro-heading">
            <h1 className="bk-intro-title">Learn the Greek Alphabet</h1>
            <p className="bk-intro-sub">Choose a round to begin</p>
          </div>
          <div className="bk-rounds-grid">
            {ROUNDS.map((r, ri) => {
              const data = r.letters.map(getLetterData)
              return (
                <button key={ri} className="bk-round-card" onClick={() => startRound(ri)}>
                  <div className="bk-round-info">
                    <div className="bk-round-label">{r.label}</div>
                    <div className="bk-round-letters greek">{r.letters.join(' ')}</div>
                    <div className="bk-round-cta">Start →</div>
                  </div>
                  <div className="bk-round-grid">
                    {data.map(l => (
                      <div key={l.letter} className="bk-intro-card">
                        <img src={l.intro} alt={l.letter} className="bk-intro-img" />
                      </div>
                    ))}
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Letter intro ── */}
      {screen === 'letter' && (
        <div className="bk-letter-screen">
          <div className="bk-letter-card">
            <img
              src={letters[letterIdx].intro}
              alt={letters[letterIdx].letter}
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
              {letters.map((_, i) => (
                <div
                  key={i}
                  className={`bk-progress-dot ${i < letterIdx ? 'bk-progress-dot--done' : i === letterIdx ? 'bk-progress-dot--active' : ''}`}
                />
              ))}
            </div>
            <button className="bk-next-btn" onClick={nextLetter} aria-label="Next">
              {letterIdx < letters.length - 1 ? '›' : '▶'}
            </button>
          </div>
        </div>
      )}

      {/* ── Quiz ── */}
      {screen === 'quiz' && (
        <div className="bk-quiz">
          <button className="bk-quiz-back" onClick={reset}>← Rounds</button>
          <div className="bk-quiz-left">
            <div className="bk-progress" aria-label="Progress">
              {qs.map((_, i) => (
                <div
                  key={i}
                  className={`bk-progress-dot ${i < qIndex ? 'bk-progress-dot--done' : i === qIndex ? 'bk-progress-dot--active' : ''}`}
                />
              ))}
            </div>
            <div className="bk-stimulus-wrap">
              <img src={q.stimulus} alt="stimulus" className="bk-stimulus-img" />
            </div>
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
        <DoneScreen
          round={round}
          hasNextRound={roundIdx < ROUNDS.length - 1}
          onNextRound={() => startRound(roundIdx + 1)}
          onReset={() => startRound(roundIdx)}
          onGoHome={reset}
        />
      )}

    </div>
  )
}

function DoneScreen({ round, hasNextRound, onNextRound, onReset, onGoHome }) {
  useEffect(() => {
    playSound(CONGRATS_SND)
  }, [])

  return (
    <div className="bk-done-root">
      <Confetti />
      <div className="bk-done">
        <div className="bk-done-emoji">🎉</div>
        <h2 className="bk-done-title">Well done!</h2>
        <p className="bk-done-sub">
          You finished <span className="greek">{round.letters.join(' ')}</span>
        </p>
        <div className="bk-done-actions">
          {hasNextRound && (
            <button className="bk-start-btn" onClick={onNextRound}>Next Round →</button>
          )}
          <button className="bk-start-btn" onClick={onReset}>Play Again</button>
          <button className="bk-home-btn" onClick={onGoHome}>← Rounds</button>
        </div>
      </div>
    </div>
  )
}

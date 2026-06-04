import { useState } from 'react'
import './ExercisesTab.css'

// Normalize Greek for comparison: strip diacritics, lowercase, trim
function normalize(str) {
  if (!str) return ''
  return str.normalize('NFD').replace(/[̀-ͯ̓̔̈ͅ]/g, '').toLowerCase().trim()
}

function checkAnswer(userInput, correctAnswer) {
  if (!userInput?.trim()) return false
  const u = normalize(userInput)
  // Support slash-separated alternates: "ἔχω/ἔχεις"
  return correctAnswer.split('/').some(a => normalize(a.trim()) === u)
}

const SECTION_META = [
  { id: 'mc',   labelEl: 'Τί ἐστιν ὀρθόν;',  labelEn: 'Multiple Choice'  },
  { id: 'tf',   labelEl: 'Ἀληθές / Ψεῦδος',  labelEn: 'True or False'    },
  { id: 'yn',   labelEl: 'Ναί / Οὔ',          labelEn: 'Yes or No'        },
  { id: 'thumbs',labelEl: '👍 / 👎',           labelEn: 'Correct or Not'   },
  { id: 'fill', labelEl: 'Γέμιζε!',           labelEn: 'Fill in the Blank'},
  { id: 'pc',   labelEl: 'Ἄλλαξον!',          labelEn: 'Change the Person'},
  { id: 'prep', labelEl: 'ἐν / πρός / ἐκ',   labelEn: 'Prepositions'     },
]

export default function ExercisesTab({ exercises }) {
  const [section, setSection] = useState(null)
  const [tfAnswers,     setTfAnswers]     = useState({})
  const [ynAnswers,     setYnAnswers]     = useState({})
  const [thumbsAnswers, setThumbsAnswers] = useState({})
  const [mcAnswers,     setMcAnswers]     = useState({})
  const [fillAnswers,   setFillAnswers]   = useState({})
  const [pcAnswers,     setPcAnswers]     = useState({})
  const [pfAnswers,     setPfAnswers]     = useState({}) // prepFill: { id: string[] }
  const [pfActive,      setPfActive]      = useState({}) // prepFill: { id: blankIndex }
  const [submitted, setSubmitted] = useState(false)
  const [score,     setScore]     = useState(null)

  if (!exercises) {
    return <div className="empty-tab">✏️ Exercises for this chapter have not been added yet.</div>
  }

  // Which sections exist in the data?
  const available = SECTION_META.filter(s => {
    const key = s.id === 'mc' ? 'multipleChoice' : s.id === 'tf' ? 'trueFalse' : s.id === 'yn' ? 'yesNo' : s.id === 'thumbs' ? 'thumbs' : s.id === 'fill' ? 'fillBlank' : s.id === 'pc' ? 'personChange' : 'prepFill'
    return exercises[key]?.length > 0
  })

  const activeId = section || available[0]?.id || 'mc'

  // --- handlers ---
  function handleTf(id, v)      { if (!submitted) setTfAnswers(a => ({ ...a, [id]: v })) }
  function handleYn(id, v)      { if (!submitted) setYnAnswers(a => ({ ...a, [id]: v })) }
  function handleThumbs(id, v)  { if (!submitted) setThumbsAnswers(a => ({ ...a, [id]: v })) }
  function handleMc(id, idx)    { if (!submitted) setMcAnswers(a => ({ ...a, [id]: idx })) }
  function handleFill(id, v)    { if (!submitted) setFillAnswers(a => ({ ...a, [id]: v })) }
  function handlePc(id, i, v) {
    if (submitted) return
    setPcAnswers(a => {
      const arr = [...(a[id] || [])]
      arr[i] = v
      return { ...a, [id]: arr }
    })
  }

  // --- scoring helpers ---
  function countAnswered() {
    let answered = 0, total = 0
    exercises.multipleChoice?.forEach(() => { total++; })
    answered += Object.keys(mcAnswers).length
    exercises.trueFalse?.forEach(() => { total++; })
    answered += Object.keys(tfAnswers).length
    exercises.yesNo?.forEach(() => { total++; })
    answered += Object.keys(ynAnswers).length
    exercises.thumbs?.forEach(() => { total++; })
    answered += Object.keys(thumbsAnswers).length
    exercises.fillBlank?.forEach(() => { total++; })
    answered += Object.values(fillAnswers).filter(v => v?.trim()).length
    exercises.personChange?.forEach(q => {
      total++
      const ans = pcAnswers[q.id] || []
      if (q.answers.every((_, i) => ans[i]?.trim())) answered++
    })
    exercises.prepFill?.forEach(q => {
      total++
      const ans = pfAnswers[q.id] || []
      if (q.answers.every((_, i) => ans[i]?.trim())) answered++
    })
    return { answered, total }
  }

  function handleSubmit() {
    let correct = 0, total = 0
    exercises.multipleChoice?.forEach(q => { total++; if (mcAnswers[q.id] === q.answer) correct++ })
    exercises.trueFalse?.forEach(q => { total++; if (tfAnswers[q.id] === q.answer) correct++ })
    exercises.yesNo?.forEach(q => { total++; if (ynAnswers[q.id] === q.answer) correct++ })
    exercises.thumbs?.forEach(q => { total++; if (thumbsAnswers[q.id] === q.answer) correct++ })
    exercises.fillBlank?.forEach(q => { total++; if (checkAnswer(fillAnswers[q.id], q.answer)) correct++ })
    exercises.personChange?.forEach(q => {
      total++
      const ans = pcAnswers[q.id] || []
      if (q.answers.every((a, i) => checkAnswer(ans[i], a))) correct++
    })
    exercises.prepFill?.forEach(q => {
      total++
      const ans = pfAnswers[q.id] || []
      if (q.answers.every((a, i) => normalize(ans[i]) === normalize(a))) correct++
    })
    setScore({ correct, total })
    setSubmitted(true)
  }

  function handleReset() {
    setTfAnswers({}); setYnAnswers({}); setThumbsAnswers({})
    setMcAnswers({}); setFillAnswers({}); setPcAnswers({})
    setPfAnswers({}); setPfActive({})
    setSubmitted(false); setScore(null)
  }

  const { answered, total } = countAnswered()
  const allAnswered = answered === total && total > 0

  // helper to build question-card class
  function cardClass(correct, wrong) {
    return `question-card${correct ? ' question-card--correct' : wrong ? ' question-card--wrong' : ''}`
  }

  return (
    <div className="exercises-tab">

      {/* Header */}
      <div className="exercises-header">
        <h2 className="greek">Ἐρωτήσεις</h2>
        {score && (
          <div className={`score-badge ${score.correct === score.total ? 'score-badge--perfect' : score.correct >= score.total * 0.7 ? 'score-badge--good' : 'score-badge--low'}`}>
            {score.correct} / {score.total}
          </div>
        )}
      </div>

      {/* Section tabs */}
      <div className="section-tabs">
        {available.map(s => {
          const dataKey = s.id === 'mc' ? 'multipleChoice' : s.id === 'tf' ? 'trueFalse' : s.id === 'yn' ? 'yesNo' : s.id === 'thumbs' ? 'thumbs' : s.id === 'fill' ? 'fillBlank' : 'personChange'
          const count = exercises[dataKey]?.length || 0
          return (
            <button
              key={s.id}
              className={`section-tab${activeId === s.id ? ' section-tab--active' : ''}`}
              onClick={() => setSection(s.id)}
            >
              <span className="section-tab-greek greek">{s.labelEl}</span>
              <span className="section-tab-count">({count})</span>
            </button>
          )
        })}
      </div>

      <div className="question-list">

        {/* ── Multiple Choice ── */}
        {activeId === 'mc' && exercises.multipleChoice?.map(q => {
          const correct = submitted && mcAnswers[q.id] === q.answer
          const wrong   = submitted && mcAnswers[q.id] !== undefined && mcAnswers[q.id] !== q.answer
          return (
            <div key={q.id} className={cardClass(correct, wrong)}>
              <div className="question-num">Q{q.id}</div>
              <div className="question-body">
                <p className="question-text greek">{q.question}</p>
                <div className="mc-options">
                  {q.options.map((opt, idx) => (
                    <button
                      key={idx}
                      className={`mc-btn${mcAnswers[q.id] === idx ? ' mc-btn--selected' : ''}${submitted && idx === q.answer ? ' mc-btn--answer' : ''}${submitted && mcAnswers[q.id] === idx && idx !== q.answer ? ' mc-btn--wrong' : ''}`}
                      onClick={() => handleMc(q.id, idx)}
                    >
                      <span className="mc-letter greek">{['α)', 'β)', 'γ)', 'δ)'][idx]}</span>
                      <span className="greek">{opt}</span>
                    </button>
                  ))}
                </div>
                {submitted && (
                  <div className={`explanation ${correct ? 'explanation--correct' : 'explanation--wrong'}`}>
                    {correct ? '✓ ' : '✗ '}{q.explanation}
                  </div>
                )}
              </div>
            </div>
          )
        })}

        {/* ── True / False ── */}
        {activeId === 'tf' && exercises.trueFalse?.map(q => {
          const answered = tfAnswers[q.id] !== undefined
          const correct  = submitted && tfAnswers[q.id] === q.answer
          const wrong    = submitted && answered && tfAnswers[q.id] !== q.answer
          return (
            <div key={q.id} className={cardClass(correct, wrong)}>
              <div className="question-num">Q{q.id}</div>
              <div className="question-body">
                <p className="question-text greek">{q.statement}</p>
                <div className="tf-options">
                  <button className={`tf-btn greek${tfAnswers[q.id] === true  ? ' tf-btn--selected' : ''}${submitted && q.answer === true  ? ' tf-btn--answer' : ''}`} onClick={() => handleTf(q.id, true)}>ἀληθές</button>
                  <button className={`tf-btn greek${tfAnswers[q.id] === false ? ' tf-btn--selected' : ''}${submitted && q.answer === false ? ' tf-btn--answer' : ''}`} onClick={() => handleTf(q.id, false)}>ψεῦδος</button>
                </div>
                {submitted && <div className={`explanation ${correct ? 'explanation--correct' : 'explanation--wrong'}`}>{correct ? '✓ ' : '✗ '}{q.explanation}</div>}
              </div>
            </div>
          )
        })}

        {/* ── Yes / No ── */}
        {activeId === 'yn' && exercises.yesNo?.map(q => {
          const answered = ynAnswers[q.id] !== undefined
          const correct  = submitted && ynAnswers[q.id] === q.answer
          const wrong    = submitted && answered && ynAnswers[q.id] !== q.answer
          return (
            <div key={q.id} className={cardClass(correct, wrong)}>
              <div className="question-num">Q{q.id}</div>
              <div className="question-body">
                <p className="question-text greek">{q.question}</p>
                <div className="tf-options">
                  <button className={`tf-btn greek${ynAnswers[q.id] === true  ? ' tf-btn--selected' : ''}${submitted && q.answer === true  ? ' tf-btn--answer' : ''}`} onClick={() => handleYn(q.id, true)}>ναί</button>
                  <button className={`tf-btn greek${ynAnswers[q.id] === false ? ' tf-btn--selected' : ''}${submitted && q.answer === false ? ' tf-btn--answer' : ''}`} onClick={() => handleYn(q.id, false)}>οὔ</button>
                </div>
                {submitted && <div className={`explanation ${correct ? 'explanation--correct' : 'explanation--wrong'}`}>{correct ? '✓ ' : '✗ '}{q.explanation}</div>}
              </div>
            </div>
          )
        })}

        {/* ── Thumbs ── */}
        {activeId === 'thumbs' && exercises.thumbs?.map(q => {
          const answered = thumbsAnswers[q.id] !== undefined
          const correct  = submitted && thumbsAnswers[q.id] === q.answer
          const wrong    = submitted && answered && thumbsAnswers[q.id] !== q.answer
          return (
            <div key={q.id} className={cardClass(correct, wrong)}>
              <div className="question-num">Q{q.id}</div>
              <div className="question-body">
                <p className="question-text greek">{q.statement}</p>
                <div className="tf-options">
                  <button className={`tf-btn tf-btn--emoji${thumbsAnswers[q.id] === true  ? ' tf-btn--selected' : ''}${submitted && q.answer === true  ? ' tf-btn--answer' : ''}`} onClick={() => handleThumbs(q.id, true)}>👍</button>
                  <button className={`tf-btn tf-btn--emoji${thumbsAnswers[q.id] === false ? ' tf-btn--selected' : ''}${submitted && q.answer === false ? ' tf-btn--answer' : ''}`} onClick={() => handleThumbs(q.id, false)}>👎</button>
                </div>
                {submitted && <div className={`explanation ${correct ? 'explanation--correct' : 'explanation--wrong'}`}>{correct ? '✓ ' : '✗ '}{q.explanation}</div>}
              </div>
            </div>
          )
        })}

        {/* ── Fill in the Blank ── */}
        {activeId === 'fill' && exercises.fillBlank?.map(q => {
          const userVal   = fillAnswers[q.id] || ''
          const isCorrect = submitted && checkAnswer(userVal, q.answer)
          const isWrong   = submitted && !isCorrect && userVal.trim()
          return (
            <div key={q.id} className={cardClass(isCorrect, isWrong)}>
              <div className="question-num">Q{q.id}</div>
              <div className="question-body">
                <p className="question-text greek">{q.prompt}</p>
                <div className="fill-row">
                  <input
                    className={`fill-input greek${isCorrect ? ' fill-input--correct' : isWrong ? ' fill-input--wrong' : ''}`}
                    value={userVal}
                    onChange={e => handleFill(q.id, e.target.value)}
                    disabled={submitted}
                    placeholder="___"
                    autoComplete="off"
                    autoCorrect="off"
                    spellCheck="false"
                  />
                </div>
                {submitted && (
                  <div className={`explanation ${isCorrect ? 'explanation--correct' : 'explanation--wrong'}`}>
                    {isCorrect
                      ? `✓ ${q.explanation}`
                      : <span>✗ <strong className="greek">{q.answer}</strong> — {q.explanation}</span>
                    }
                  </div>
                )}
              </div>
            </div>
          )
        })}

        {/* ── Person Change ── */}
        {activeId === 'pc' && exercises.personChange?.map(q => {
          const ans       = pcAnswers[q.id] || []
          const isCorrect = submitted && q.answers.every((a, i) => checkAnswer(ans[i], a))
          const isWrong   = submitted && !isCorrect && ans.some(a => a?.trim())
          // Split cue on _______ to interleave inputs
          const parts = q.cue.split('_______')
          return (
            <div key={q.id} className={cardClass(isCorrect, isWrong)}>
              <div className="question-num">Q{q.id}</div>
              <div className="question-body">
                <p className="question-text greek question-text--original">{q.original}</p>
                <div className="pc-row">
                  <span className="pc-arrow">→</span>
                  <span className="greek pc-cue">
                    {parts.map((part, i) => (
                      <span key={i}>
                        {part}
                        {i < q.answers.length && (
                          <input
                            className={`fill-input fill-input--inline greek${submitted && checkAnswer(ans[i], q.answers[i]) ? ' fill-input--correct' : submitted ? ' fill-input--wrong' : ''}`}
                            value={ans[i] || ''}
                            onChange={e => handlePc(q.id, i, e.target.value)}
                            disabled={submitted}
                            placeholder="___"
                            autoComplete="off"
                            autoCorrect="off"
                            spellCheck="false"
                            size={Math.max(6, (q.answers[i]?.length || 0) + 3)}
                          />
                        )}
                      </span>
                    ))}
                  </span>
                </div>
                {submitted && (
                  <div className={`explanation ${isCorrect ? 'explanation--correct' : 'explanation--wrong'}`}>
                    {isCorrect
                      ? `✓ ${q.explanation}`
                      : <span>✗ <strong className="greek">{q.answers.join(', ')}</strong> — {q.explanation}</span>
                    }
                  </div>
                )}
              </div>
            </div>
          )
        })}

        {/* ── Preposition Fill ── */}
        {activeId === 'prep' && exercises.prepFill?.map(q => {
          const ans = pfAnswers[q.id] || []
          const activeBlank = pfActive[q.id] ?? 0
          const parts = q.prompt.split('_______')
          const isCorrect = submitted && q.answers.every((a, i) => normalize(ans[i]) === normalize(a))
          const isWrong   = submitted && !isCorrect && ans.some(a => a?.trim())
          return (
            <div key={q.id} className={cardClass(isCorrect, isWrong)}>
              <div className="question-num">Q{q.id}</div>
              <div className="question-body">
                {/* Sentence with clickable blank chips */}
                <div className="prep-sentence greek">
                  {parts.map((part, i) => (
                    <span key={i}>
                      {part}
                      {i < q.answers.length && (
                        <button
                          className={`prep-blank
                            ${!submitted && activeBlank === i ? ' prep-blank--active' : ''}
                            ${ans[i] ? ' prep-blank--filled' : ''}
                            ${submitted && normalize(ans[i]) === normalize(q.answers[i]) ? ' prep-blank--correct' : ''}
                            ${submitted && ans[i] && normalize(ans[i]) !== normalize(q.answers[i]) ? ' prep-blank--wrong' : ''}
                          `}
                          onClick={() => { if (!submitted) setPfActive(a => ({ ...a, [q.id]: i })) }}
                        >
                          {ans[i] || '___'}
                        </button>
                      )}
                    </span>
                  ))}
                </div>
                {/* Word bank buttons */}
                {!submitted && (
                  <div className="prep-choices">
                    {q.choices.map(choice => (
                      <button
                        key={choice}
                        className="prep-choice greek"
                        onClick={() => {
                          const active = pfActive[q.id] ?? 0
                          setPfAnswers(a => {
                            const arr = [...(a[q.id] || [])]
                            arr[active] = choice
                            return { ...a, [q.id]: arr }
                          })
                          // Auto-advance to next blank
                          if (active < q.answers.length - 1) {
                            setPfActive(a => ({ ...a, [q.id]: active + 1 }))
                          }
                        }}
                      >
                        {choice}
                      </button>
                    ))}
                    {/* Clear button */}
                    {ans.some(a => a) && (
                      <button
                        className="prep-clear"
                        onClick={() => { setPfAnswers(a => ({ ...a, [q.id]: [] })); setPfActive(a => ({ ...a, [q.id]: 0 })) }}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                )}
                {submitted && (
                  <div className={`explanation ${isCorrect ? 'explanation--correct' : 'explanation--wrong'}`}>
                    {isCorrect
                      ? `✓ ${q.explanation}`
                      : <span>✗ <strong className="greek">{q.answers.join(' … ')}</strong> — {q.explanation}</span>
                    }
                  </div>
                )}
              </div>
            </div>
          )
        })}

      </div>

      {/* Footer */}
      <div className="exercises-footer">
        {!submitted ? (
          <button className="submit-btn" onClick={handleSubmit} disabled={!allAnswered}>
            {allAnswered
              ? <span><span className="greek">Ὑπόβαλλε</span> — Submit</span>
              : `${answered} / ${total} answered`
            }
          </button>
        ) : (
          <button className="reset-btn" onClick={handleReset}>
            <span className="greek">Πάλιν</span> — Try Again
          </button>
        )}
      </div>

    </div>
  )
}

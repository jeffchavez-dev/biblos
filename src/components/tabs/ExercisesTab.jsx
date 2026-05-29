import { useState } from 'react'
import './ExercisesTab.css'

export default function ExercisesTab({ exercises }) {
  const [section, setSection] = useState('tf')
  const [tfAnswers, setTfAnswers] = useState({})
  const [mcAnswers, setMcAnswers] = useState({})
  const [submitted, setSubmitted] = useState(false)
  const [score, setScore] = useState(null)

  if (!exercises) {
    return <div className="empty-tab">✏️ Exercises for this chapter have not been added yet.</div>
  }

  function handleTf(id, value) {
    if (submitted) return
    setTfAnswers(v => ({ ...v, [id]: value }))
  }

  function handleMc(id, idx) {
    if (submitted) return
    setMcAnswers(v => ({ ...v, [id]: idx }))
  }

  function handleSubmit() {
    let correct = 0
    let total = exercises.trueFalse.length + exercises.multipleChoice.length
    exercises.trueFalse.forEach(q => {
      if (tfAnswers[q.id] === q.answer) correct++
    })
    exercises.multipleChoice.forEach(q => {
      if (mcAnswers[q.id] === q.answer) correct++
    })
    setScore({ correct, total })
    setSubmitted(true)
  }

  function handleReset() {
    setTfAnswers({})
    setMcAnswers({})
    setSubmitted(false)
    setScore(null)
  }

  const tfTotal = exercises.trueFalse.length
  const mcTotal = exercises.multipleChoice.length
  const tfAnswered = Object.keys(tfAnswers).length
  const mcAnswered = Object.keys(mcAnswers).length
  const allAnswered = tfAnswered === tfTotal && mcAnswered === mcTotal

  return (
    <div className="exercises-tab">
      <div className="exercises-header">
        <h2>Exercises</h2>
        {score && (
          <div className={`score-badge ${score.correct === score.total ? 'score-badge--perfect' : score.correct >= score.total * 0.7 ? 'score-badge--good' : 'score-badge--low'}`}>
            {score.correct} / {score.total} correct
          </div>
        )}
      </div>

      {/* Section tabs */}
      <div className="section-tabs">
        <button
          className={`section-tab ${section === 'tf' ? 'section-tab--active' : ''}`}
          onClick={() => setSection('tf')}
        >
          True or False ({tfTotal})
        </button>
        <button
          className={`section-tab ${section === 'mc' ? 'section-tab--active' : ''}`}
          onClick={() => setSection('mc')}
        >
          Multiple Choice ({mcTotal})
        </button>
      </div>

      {section === 'tf' && (
        <div className="question-list">
          {exercises.trueFalse.map(q => {
            const answered = tfAnswers[q.id] !== undefined
            const correct = submitted && tfAnswers[q.id] === q.answer
            const wrong = submitted && tfAnswers[q.id] !== undefined && tfAnswers[q.id] !== q.answer
            return (
              <div key={q.id} className={`question-card ${correct ? 'question-card--correct' : wrong ? 'question-card--wrong' : ''}`}>
                <div className="question-num">Q{q.id}</div>
                <div className="question-body">
                  <p className="question-text">{q.statement}</p>
                  <div className="tf-options">
                    <button
                      className={`tf-btn ${tfAnswers[q.id] === true ? 'tf-btn--selected' : ''} ${submitted && q.answer === true ? 'tf-btn--answer' : ''}`}
                      onClick={() => handleTf(q.id, true)}
                    >
                      True
                    </button>
                    <button
                      className={`tf-btn ${tfAnswers[q.id] === false ? 'tf-btn--selected' : ''} ${submitted && q.answer === false ? 'tf-btn--answer' : ''}`}
                      onClick={() => handleTf(q.id, false)}
                    >
                      False
                    </button>
                  </div>
                  {submitted && (
                    <div className={`explanation ${correct ? 'explanation--correct' : 'explanation--wrong'}`}>
                      {correct ? '✓ Correct! ' : '✗ Incorrect. '}{q.explanation}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {section === 'mc' && (
        <div className="question-list">
          {exercises.multipleChoice.map(q => {
            const correct = submitted && mcAnswers[q.id] === q.answer
            const wrong = submitted && mcAnswers[q.id] !== undefined && mcAnswers[q.id] !== q.answer
            return (
              <div key={q.id} className={`question-card ${correct ? 'question-card--correct' : wrong ? 'question-card--wrong' : ''}`}>
                <div className="question-num">Q{q.id}</div>
                <div className="question-body">
                  <p className="question-text">{q.question}</p>
                  <div className="mc-options">
                    {q.options.map((opt, idx) => (
                      <button
                        key={idx}
                        className={`mc-btn
                          ${mcAnswers[q.id] === idx ? 'mc-btn--selected' : ''}
                          ${submitted && idx === q.answer ? 'mc-btn--answer' : ''}
                          ${submitted && mcAnswers[q.id] === idx && idx !== q.answer ? 'mc-btn--wrong' : ''}
                        `}
                        onClick={() => handleMc(q.id, idx)}
                      >
                        <span className="mc-letter">{String.fromCharCode(65 + idx)}</span>
                        {opt}
                      </button>
                    ))}
                  </div>
                  {submitted && (
                    <div className={`explanation ${correct ? 'explanation--correct' : 'explanation--wrong'}`}>
                      {correct ? '✓ Correct! ' : '✗ Incorrect. '}{q.explanation}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <div className="exercises-footer">
        {!submitted ? (
          <button className="submit-btn" onClick={handleSubmit} disabled={!allAnswered}>
            {allAnswered ? 'Submit Answers' : `Answer all questions (${tfAnswered + mcAnswered}/${tfTotal + mcTotal})`}
          </button>
        ) : (
          <button className="reset-btn" onClick={handleReset}>Try Again</button>
        )}
      </div>
    </div>
  )
}

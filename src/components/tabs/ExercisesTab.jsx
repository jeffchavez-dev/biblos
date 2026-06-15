import { useState, useRef } from 'react'
import { useUI } from '../../context/LanguageContext.jsx'
import GreekKeyboard from '../GreekKeyboard.jsx'
import './ExercisesTab.css'

function normalize(str) {
  if (!str) return ''
  return str.normalize('NFD').replace(/[̀-ͯ̓̔̈ͅ]/g, '').toLowerCase().trim()
}

function checkAnswer(userInput, correctAnswer) {
  if (!userInput?.trim()) return false
  const u = normalize(userInput)
  return correctAnswer.split('/').some(a => normalize(a.trim()) === u)
}

const SECTION_META = [
  { id: 'mc',     dataKey: 'multipleChoice', labelEl: 'Τί ἐστιν ὀρθόν;', labelKey: 'secMultipleChoice' },
  { id: 'tf',     dataKey: 'trueFalse',      labelEl: 'Ἀληθές / Ψεῦδος', labelKey: 'secTrueOrFalse'   },
  { id: 'yn',     dataKey: 'yesNo',          labelEl: 'Ναί / Οὔ',         labelKey: 'secYesOrNo'       },
  { id: 'thumbs', dataKey: 'thumbs',         labelEl: '👍 / 👎',           labelKey: 'secCorrectOrNot'  },
  { id: 'fill',   dataKey: 'fillBlank',      labelEl: 'Γέμιζε!',          labelKey: 'secFillBlank'     },
  { id: 'pc',     dataKey: 'personChange',   labelEl: 'Ἄλλαξον!',         labelKey: 'secChangePerson'  },
  { id: 'inf',    dataKey: 'infinitives',    labelEl: 'ἁπαρέμφατος',      labelKey: 'secInfinitives'   },
  { id: 'imp',    dataKey: 'imperatives',    labelEl: 'Προστατική',        labelKey: 'secImperatives'   },
  { id: 'cv',     dataKey: 'contractVerbs',  labelEl: 'Ῥήματα',           labelKey: 'secContractVerbs' },
  { id: 'cf',     dataKey: 'caseFill',           labelEl: 'Πτώσεις',          labelKey: 'secFillCase'      },
  { id: 'prep',   dataKey: 'prepFill',           labelEl: 'ἐν / πρός / ἐκ',  labelKey: 'secPrepositions'  },
  { id: 'convo',  dataKey: 'conversationQuestions', labelEl: 'Ἐρωτήσεις',    labelKey: 'secConversations' },
]

// Filter an array by activePart if items carry a `part` field; otherwise show all
function filterByPart(arr, activePart) {
  if (!arr?.length) return arr || []
  const hasParts = arr.some(q => q.part)
  if (!hasParts || !activePart) return arr
  return arr.filter(q => !q.part || q.part === activePart)
}

export default function ExercisesTab({ exercises, activePart }) {
  const ui = useUI()
  const [section,       setSection]       = useState(null)
  const [mcAnswers,     setMcAnswers]     = useState({})
  const [tfAnswers,     setTfAnswers]     = useState({})
  const [ynAnswers,     setYnAnswers]     = useState({})
  const [thumbsAnswers, setThumbsAnswers] = useState({})
  const [fillAnswers,   setFillAnswers]   = useState({})
  const [pcAnswers,     setPcAnswers]     = useState({})
  const [pfAnswers,     setPfAnswers]     = useState({})
  const [pfActive,      setPfActive]      = useState({})
  const [infAnswers,    setInfAnswers]    = useState({})
  const [impAnswers,    setImpAnswers]    = useState({})
  const [cvAnswers,     setCvAnswers]     = useState({})
  const [cfAnswers,     setCfAnswers]     = useState({})

  // Per-section submitted + score
  const [submitted, setSubmitted] = useState({}) // { [id]: bool }
  const [scores,    setScores]    = useState({}) // { [id]: { correct, total } }

  // Greek keyboard: tracks which input is focused { qid, idx? }
  const [kbTarget, setKbTarget] = useState(null)
  const inputRefs = useRef({})

  if (!exercises) {
    return <div className="empty-tab">✏️ Exercises for this chapter have not been added yet.</div>
  }

  // Apply part filter — ex is what we actually render
  const ex = {
    multipleChoice: filterByPart(exercises.multipleChoice, activePart),
    trueFalse:      filterByPart(exercises.trueFalse,      activePart),
    yesNo:          filterByPart(exercises.yesNo,          activePart),
    thumbs:         filterByPart(exercises.thumbs,         activePart),
    fillBlank:      filterByPart(exercises.fillBlank,      activePart),
    personChange:   filterByPart(exercises.personChange,   activePart),
    prepFill:       filterByPart(exercises.prepFill,       activePart),
    infinitives:    filterByPart(exercises.infinitives,    activePart),
    imperatives:    filterByPart(exercises.imperatives,    activePart),
    contractVerbs:  filterByPart(exercises.contractVerbs,  activePart),
    caseFill:            filterByPart(exercises.caseFill,                activePart),
    conversationQuestions: filterByPart(exercises.conversationQuestions, activePart),
  }

  const available = SECTION_META.filter(s => ex[s.dataKey]?.length > 0)
  const activeId  = section || available[0]?.id || 'mc'
  const isSubmitted = submitted[activeId] || false
  const sectionScore = scores[activeId] || null

  // ── answer handlers (guard against submitted) ──
  function handleMc(id, idx)   { if (!isSubmitted) setMcAnswers(a => ({ ...a, [id]: idx })) }
  function handleTf(id, v)     { if (!isSubmitted) setTfAnswers(a => ({ ...a, [id]: v })) }
  function handleYn(id, v)     { if (!isSubmitted) setYnAnswers(a => ({ ...a, [id]: v })) }
  function handleThumbs(id, v) { if (!isSubmitted) setThumbsAnswers(a => ({ ...a, [id]: v })) }
  function handleFill(id, v)   { if (!isSubmitted) setFillAnswers(a => ({ ...a, [id]: v })) }
  function handleInf(id, v)   { if (!isSubmitted) setInfAnswers(a => ({ ...a, [id]: v })) }
  function handleImp(id, v)   { if (!isSubmitted) setImpAnswers(a => ({ ...a, [id]: v })) }
  function handleCv(id, v)    { if (!isSubmitted) setCvAnswers(a => ({ ...a, [id]: v })) }
  function handleCf(id, v)    { if (!isSubmitted) setCfAnswers(a => ({ ...a, [id]: v })) }
  function handlePc(id, i, v) {
    if (isSubmitted) return
    setPcAnswers(a => { const arr = [...(a[id] || [])]; arr[i] = v; return { ...a, [id]: arr } })
  }

  function handleKbKey(k) {
    if (!kbTarget) return
    const { section, qid, idx } = kbTarget
    const setter = { fill: handleFill, inf: handleInf, imp: handleImp, cv: handleCv, cf: handleCf }[section]
    const getVal = () => {
      if (section === 'fill')  return fillAnswers[qid]  || ''
      if (section === 'inf')   return infAnswers[qid]   || ''
      if (section === 'imp')   return impAnswers[qid]   || ''
      if (section === 'cv')    return cvAnswers[qid]    || ''
      if (section === 'cf')    return cfAnswers[qid]    || ''
      if (section === 'pc')    return (pcAnswers[qid] || [])[idx] || ''
      return ''
    }
    const cur = getVal()
    const next = k === '⌫' ? cur.slice(0, -1) : cur + k
    if (section === 'pc') handlePc(qid, idx, next)
    else setter(qid, next)
  }

  // ── per-section count / score (uses filtered `ex`) ──
  function countForSection(sid) {
    let answered = 0, total = 0
    if (sid === 'mc')     { total = ex.multipleChoice?.length || 0; answered = ex.multipleChoice?.filter(q => mcAnswers[q.id] !== undefined).length || 0 }
    if (sid === 'tf')     { total = ex.trueFalse?.length || 0;      answered = ex.trueFalse?.filter(q => tfAnswers[q.id] !== undefined).length || 0 }
    if (sid === 'yn')     { total = ex.yesNo?.length || 0;          answered = ex.yesNo?.filter(q => ynAnswers[q.id] !== undefined).length || 0 }
    if (sid === 'thumbs') { total = ex.thumbs?.length || 0;         answered = ex.thumbs?.filter(q => thumbsAnswers[q.id] !== undefined).length || 0 }
    if (sid === 'fill')   { total = ex.fillBlank?.length || 0;      answered = ex.fillBlank?.filter(q => fillAnswers[q.id]?.trim()).length || 0 }
    if (sid === 'pc') {
      total = ex.personChange?.length || 0
      answered = (ex.personChange || []).filter(q => {
        const ans = pcAnswers[q.id] || []
        return q.answers.every((_, i) => ans[i]?.trim())
      }).length
    }
    if (sid === 'prep') {
      total = ex.prepFill?.length || 0
      answered = (ex.prepFill || []).filter(q => {
        const ans = pfAnswers[q.id] || []
        return q.answers.every((_, i) => ans[i]?.trim())
      }).length
    }
    if (sid === 'inf') {
      const items = (ex.infinitives || []).filter(q => !q.isExample)
      total = items.length
      answered = items.filter(q => infAnswers[q.id]?.trim()).length
    }
    if (sid === 'imp') {
      const items = (ex.imperatives || []).filter(q => !q.isExample)
      total = items.length
      answered = items.filter(q => impAnswers[q.id]?.trim()).length
    }
    if (sid === 'cv') {
      total = ex.contractVerbs?.length || 0
      answered = (ex.contractVerbs || []).filter(q => cvAnswers[q.id]?.trim()).length
    }
    if (sid === 'cf') {
      total = ex.caseFill?.length || 0
      answered = (ex.caseFill || []).filter(q => cfAnswers[q.id]?.trim()).length
    }
    if (sid === 'convo') { total = 0; answered = 0 } // display-only, no grading
    return { answered, total }
  }

  function scoreSection(sid) {
    let correct = 0, total = 0
    if (sid === 'mc')     ex.multipleChoice?.forEach(q => { total++; if (mcAnswers[q.id] === q.answer) correct++ })
    if (sid === 'tf')     ex.trueFalse?.forEach(q => { total++; if (tfAnswers[q.id] === q.answer) correct++ })
    if (sid === 'yn')     ex.yesNo?.forEach(q => { total++; if (ynAnswers[q.id] === q.answer) correct++ })
    if (sid === 'thumbs') ex.thumbs?.forEach(q => { total++; if (thumbsAnswers[q.id] === q.answer) correct++ })
    if (sid === 'fill')   ex.fillBlank?.forEach(q => { total++; if (checkAnswer(fillAnswers[q.id], q.answer)) correct++ })
    if (sid === 'pc')     ex.personChange?.forEach(q => {
      total++
      const ans = pcAnswers[q.id] || []
      if (q.answers.every((a, i) => checkAnswer(ans[i], a))) correct++
    })
    if (sid === 'prep')   ex.prepFill?.forEach(q => {
      total++
      const ans = pfAnswers[q.id] || []
      if (q.answers.every((a, i) => normalize(ans[i]) === normalize(a))) correct++
    })
    if (sid === 'inf') ex.infinitives?.filter(q => !q.isExample).forEach(q => { total++; if (checkAnswer(infAnswers[q.id], q.answer)) correct++ })
    if (sid === 'imp') ex.imperatives?.filter(q => !q.isExample).forEach(q => { total++; if (checkAnswer(impAnswers[q.id], q.answer)) correct++ })
    if (sid === 'cv')  ex.contractVerbs?.forEach(q => { total++; if (checkAnswer(cvAnswers[q.id], q.answer)) correct++ })
    if (sid === 'cf')  ex.caseFill?.forEach(q => { total++; if (checkAnswer(cfAnswers[q.id], q.answer)) correct++ })
    return { correct, total }
  }

  function handleSubmit() {
    const sc = scoreSection(activeId)
    setScores(s => ({ ...s, [activeId]: sc }))
    setSubmitted(s => ({ ...s, [activeId]: true }))
  }

  function handleReset() {
    if (activeId === 'mc')     setMcAnswers({})
    if (activeId === 'tf')     setTfAnswers({})
    if (activeId === 'yn')     setYnAnswers({})
    if (activeId === 'thumbs') setThumbsAnswers({})
    if (activeId === 'fill')   setFillAnswers({})
    if (activeId === 'pc')     setPcAnswers({})
    if (activeId === 'prep')   { setPfAnswers({}); setPfActive({}) }
    if (activeId === 'inf')  setInfAnswers({})
    if (activeId === 'imp')  setImpAnswers({})
    if (activeId === 'cv')   setCvAnswers({})
    if (activeId === 'cf')   setCfAnswers({})
    setSubmitted(s => ({ ...s, [activeId]: false }))
    setScores(s => { const n = { ...s }; delete n[activeId]; return n })
  }

  const { answered, total } = countForSection(activeId)
  const allAnswered = answered === total && total > 0

  function cardClass(correct, wrong) {
    return `question-card${correct ? ' question-card--correct' : wrong ? ' question-card--wrong' : ''}`
  }

  return (
    <div className="exercises-tab">

      {/* Header */}
      <div className="exercises-header">
        <h2 className="greek">Ἐρωτήσεις</h2>
        {sectionScore && (
          <div className={`score-badge ${sectionScore.correct === sectionScore.total ? 'score-badge--perfect' : sectionScore.correct >= sectionScore.total * 0.7 ? 'score-badge--good' : 'score-badge--low'}`}>
            {sectionScore.correct} / {sectionScore.total}
          </div>
        )}
      </div>

      {/* Section tabs */}
      <div className="section-tabs">
        {available.map(s => {
          const count = exercises[s.dataKey]?.length || 0
          const done  = submitted[s.id]
          const sc    = scores[s.id]
          return (
            <button
              key={s.id}
              className={`section-tab${activeId === s.id ? ' section-tab--active' : ''}${done ? ' section-tab--done' : ''}`}
              onClick={() => setSection(s.id)}
            >
              <span className="section-tab-greek greek">{s.labelEl}</span>
              <span className="section-tab-en">{ui(s.labelKey)}</span>
              {done && sc
                ? <span className="section-tab-score">{sc.correct}/{sc.total}</span>
                : <span className="section-tab-count">({count})</span>
              }
            </button>
          )
        })}
      </div>

      <div className="question-list">

        {/* ── Multiple Choice ── */}
        {activeId === 'mc' && ex.multipleChoice?.map(q => {
          const correct = isSubmitted && mcAnswers[q.id] === q.answer
          const wrong   = isSubmitted && mcAnswers[q.id] !== undefined && mcAnswers[q.id] !== q.answer
          return (
            <div key={q.id} className={cardClass(correct, wrong)}>
              <div className="question-num">Q{q.id}</div>
              <div className="question-body">
                <p className="question-text greek">{q.question}</p>
                <div className="mc-options">
                  {q.options.map((opt, idx) => (
                    <button
                      key={idx}
                      className={`mc-btn${mcAnswers[q.id] === idx ? ' mc-btn--selected' : ''}${isSubmitted && idx === q.answer ? ' mc-btn--answer' : ''}${isSubmitted && mcAnswers[q.id] === idx && idx !== q.answer ? ' mc-btn--wrong' : ''}`}
                      onClick={() => handleMc(q.id, idx)}
                    >
                      <span className="mc-letter greek">{['α)', 'β)', 'γ)', 'δ)'][idx]}</span>
                      <span className="greek">{opt}</span>
                    </button>
                  ))}
                </div>
                {isSubmitted && (
                  <div className={`explanation ${correct ? 'explanation--correct' : 'explanation--wrong'}`}>
                    {correct ? '✓ ' : '✗ '}{q.explanation}
                  </div>
                )}
              </div>
            </div>
          )
        })}

        {/* ── True / False ── */}
        {activeId === 'tf' && ex.trueFalse?.map(q => {
          const ans     = tfAnswers[q.id]
          const correct = isSubmitted && ans === q.answer
          const wrong   = isSubmitted && ans !== undefined && ans !== q.answer
          return (
            <div key={q.id} className={cardClass(correct, wrong)}>
              <div className="question-num">Q{q.id}</div>
              <div className="question-body">
                <p className="question-text greek">{q.statement}</p>
                <div className="tf-options">
                  <button className={`tf-btn greek${ans === true  ? ' tf-btn--selected' : ''}${isSubmitted && q.answer === true  ? ' tf-btn--answer' : ''}`} onClick={() => handleTf(q.id, true)}>ἀληθές</button>
                  <button className={`tf-btn greek${ans === false ? ' tf-btn--selected' : ''}${isSubmitted && q.answer === false ? ' tf-btn--answer' : ''}`} onClick={() => handleTf(q.id, false)}>ψεῦδος</button>
                </div>
                {isSubmitted && <div className={`explanation ${correct ? 'explanation--correct' : 'explanation--wrong'}`}>{correct ? '✓ ' : '✗ '}{q.explanation}</div>}
              </div>
            </div>
          )
        })}

        {/* ── Yes / No ── */}
        {activeId === 'yn' && ex.yesNo?.map(q => {
          const ans     = ynAnswers[q.id]
          const correct = isSubmitted && ans === q.answer
          const wrong   = isSubmitted && ans !== undefined && ans !== q.answer
          return (
            <div key={q.id} className={cardClass(correct, wrong)}>
              <div className="question-num">Q{q.id}</div>
              <div className="question-body">
                <p className="question-text greek">{q.question}</p>
                <div className="tf-options">
                  <button className={`tf-btn greek${ans === true  ? ' tf-btn--selected' : ''}${isSubmitted && q.answer === true  ? ' tf-btn--answer' : ''}`} onClick={() => handleYn(q.id, true)}>ναί</button>
                  <button className={`tf-btn greek${ans === false ? ' tf-btn--selected' : ''}${isSubmitted && q.answer === false ? ' tf-btn--answer' : ''}`} onClick={() => handleYn(q.id, false)}>οὔ</button>
                </div>
                {isSubmitted && <div className={`explanation ${correct ? 'explanation--correct' : 'explanation--wrong'}`}>{correct ? '✓ ' : '✗ '}{q.explanation}</div>}
              </div>
            </div>
          )
        })}

        {/* ── Thumbs ── */}
        {activeId === 'thumbs' && ex.thumbs?.map(q => {
          const ans     = thumbsAnswers[q.id]
          const correct = isSubmitted && ans === q.answer
          const wrong   = isSubmitted && ans !== undefined && ans !== q.answer
          return (
            <div key={q.id} className={cardClass(correct, wrong)}>
              <div className="question-num">Q{q.id}</div>
              <div className="question-body">
                <p className="question-text greek">{q.statement}</p>
                <div className="tf-options">
                  <button className={`tf-btn tf-btn--emoji${ans === true  ? ' tf-btn--selected' : ''}${isSubmitted && q.answer === true  ? ' tf-btn--answer' : ''}`} onClick={() => handleThumbs(q.id, true)}>👍</button>
                  <button className={`tf-btn tf-btn--emoji${ans === false ? ' tf-btn--selected' : ''}${isSubmitted && q.answer === false ? ' tf-btn--answer' : ''}`} onClick={() => handleThumbs(q.id, false)}>👎</button>
                </div>
                {isSubmitted && <div className={`explanation ${correct ? 'explanation--correct' : 'explanation--wrong'}`}>{correct ? '✓ ' : '✗ '}{q.explanation}</div>}
              </div>
            </div>
          )
        })}

        {/* ── Fill in the Blank ── */}
        {activeId === 'fill' && ex.fillBlank?.map(q => {
          const userVal   = fillAnswers[q.id] || ''
          const isCorrect = isSubmitted && checkAnswer(userVal, q.answer)
          const isWrong   = isSubmitted && !isCorrect && userVal.trim()
          const kbActive  = kbTarget?.qid === q.id
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
                    onFocus={() => !isSubmitted && setKbTarget({ section: 'fill', qid: q.id })}
                    disabled={isSubmitted}
                    placeholder="___"
                    autoComplete="off" autoCorrect="off" spellCheck="false"
                    readOnly
                  />
                </div>
                {kbActive && !isSubmitted && <GreekKeyboard onKey={handleKbKey} />}
                {isSubmitted && (
                  <div className={`explanation ${isCorrect ? 'explanation--correct' : 'explanation--wrong'}`}>
                    {isCorrect ? `✓ ${q.explanation}` : <span>✗ <strong className="greek">{q.answer}</strong> — {q.explanation}</span>}
                  </div>
                )}
              </div>
            </div>
          )
        })}

        {/* ── Person Change ── */}
        {activeId === 'pc' && ex.personChange?.map(q => {
          const ans       = pcAnswers[q.id] || []
          const isCorrect = isSubmitted && q.answers.every((a, i) => checkAnswer(ans[i], a))
          const isWrong   = isSubmitted && !isCorrect && ans.some(a => a?.trim())
          const parts     = q.cue.split('_______')
          const kbActive  = kbTarget?.qid === q.id
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
                            className={`fill-input fill-input--inline greek${isSubmitted && checkAnswer(ans[i], q.answers[i]) ? ' fill-input--correct' : isSubmitted ? ' fill-input--wrong' : ''}`}
                            value={ans[i] || ''}
                            onChange={e => handlePc(q.id, i, e.target.value)}
                            onFocus={() => !isSubmitted && setKbTarget({ section: 'pc', qid: q.id, idx: i })}
                            disabled={isSubmitted}
                            placeholder="___"
                            autoComplete="off" autoCorrect="off" spellCheck="false"
                            size={Math.max(6, (q.answers[i]?.length || 0) + 3)}
                            readOnly
                          />
                        )}
                      </span>
                    ))}
                  </span>
                </div>
                {kbActive && !isSubmitted && <GreekKeyboard onKey={handleKbKey} />}
                {isSubmitted && (
                  <div className={`explanation ${isCorrect ? 'explanation--correct' : 'explanation--wrong'}`}>
                    {isCorrect ? `✓ ${q.explanation}` : <span>✗ <strong className="greek">{q.answers.join(', ')}</strong> — {q.explanation}</span>}
                  </div>
                )}
              </div>
            </div>
          )
        })}

        {/* ── Preposition Fill ── */}
        {activeId === 'prep' && ex.prepFill?.map(q => {
          const ans         = pfAnswers[q.id] || []
          const activeBlank = pfActive[q.id] ?? 0
          const parts       = q.prompt.split('_______')
          const isCorrect   = isSubmitted && q.answers.every((a, i) => normalize(ans[i]) === normalize(a))
          const isWrong     = isSubmitted && !isCorrect && ans.some(a => a?.trim())
          return (
            <div key={q.id} className={cardClass(isCorrect, isWrong)}>
              <div className="question-num">Q{q.id}</div>
              <div className="question-body">
                <div className="prep-sentence greek">
                  {parts.map((part, i) => (
                    <span key={i}>
                      {part}
                      {i < q.answers.length && (
                        <button
                          className={`prep-blank${!isSubmitted && activeBlank === i ? ' prep-blank--active' : ''}${ans[i] ? ' prep-blank--filled' : ''}${isSubmitted && normalize(ans[i]) === normalize(q.answers[i]) ? ' prep-blank--correct' : ''}${isSubmitted && ans[i] && normalize(ans[i]) !== normalize(q.answers[i]) ? ' prep-blank--wrong' : ''}`}
                          onClick={() => { if (!isSubmitted) setPfActive(a => ({ ...a, [q.id]: i })) }}
                        >
                          {ans[i] || '___'}
                        </button>
                      )}
                    </span>
                  ))}
                </div>
                {!isSubmitted && (
                  <div className="prep-choices">
                    {q.choices.map(choice => (
                      <button key={choice} className="prep-choice greek"
                        onClick={() => {
                          const active = pfActive[q.id] ?? 0
                          setPfAnswers(a => { const arr = [...(a[q.id] || [])]; arr[active] = choice; return { ...a, [q.id]: arr } })
                          if (active < q.answers.length - 1) setPfActive(a => ({ ...a, [q.id]: active + 1 }))
                        }}
                      >{choice}</button>
                    ))}
                    {ans.some(a => a) && (
                      <button className="prep-clear"
                        onClick={() => { setPfAnswers(a => ({ ...a, [q.id]: [] })); setPfActive(a => ({ ...a, [q.id]: 0 })) }}
                      >✕</button>
                    )}
                  </div>
                )}
                {isSubmitted && (
                  <div className={`explanation ${isCorrect ? 'explanation--correct' : 'explanation--wrong'}`}>
                    {isCorrect ? `✓ ${q.explanation}` : <span>✗ <strong className="greek">{q.answers.join(' … ')}</strong> — {q.explanation}</span>}
                  </div>
                )}
              </div>
            </div>
          )
        })}

        {/* ── Infinitives ── */}
        {activeId === 'inf' && ex.infinitives?.map(q => {
          if (q.isExample) {
            const displayed = q.prompt.replace('_______', q.answer)
            return (
              <div key={q.id} className="question-card question-card--example">
                <div className="question-num greek">{q.label}</div>
                <div className="question-body">
                  <p className="question-text greek">{displayed}</p>
                </div>
              </div>
            )
          }
          const userVal   = infAnswers[q.id] || ''
          const isCorrect = isSubmitted && checkAnswer(userVal, q.answer)
          const isWrong   = isSubmitted && !isCorrect && userVal.trim()
          const kbActive  = kbTarget?.qid === q.id
          return (
            <div key={q.id} className={cardClass(isCorrect, isWrong)}>
              <div className="question-num greek">{q.label}</div>
              <div className="question-body">
                <p className="question-text greek">{q.prompt}</p>
                <div className="fill-row">
                  <input
                    className={`fill-input greek${isCorrect ? ' fill-input--correct' : isWrong ? ' fill-input--wrong' : ''}`}
                    value={userVal}
                    onChange={e => handleInf(q.id, e.target.value)}
                    onFocus={() => !isSubmitted && setKbTarget({ section: 'inf', qid: q.id })}
                    disabled={isSubmitted}
                    placeholder="___"
                    autoComplete="off" autoCorrect="off" spellCheck="false"
                    readOnly
                  />
                </div>
                {kbActive && !isSubmitted && <GreekKeyboard onKey={handleKbKey} />}
                {isSubmitted && (
                  <div className={`explanation ${isCorrect ? 'explanation--correct' : 'explanation--wrong'}`}>
                    {isCorrect ? `✓ ${q.explanation}` : <span>✗ <strong className="greek">{q.answer}</strong> — {q.explanation}</span>}
                  </div>
                )}
              </div>
            </div>
          )
        })}

        {/* ── Imperatives ── */}
        {activeId === 'imp' && ex.imperatives?.map(q => {
          if (q.isExample) {
            return (
              <div key={q.id} className="question-card question-card--example">
                <div className="question-num greek">{q.label}</div>
                <div className="question-body">
                  <p className="question-text greek">μαθητὴς 1· {q.student1}</p>
                  <p className="question-text greek">μαθητὴς 2· {q.student2}</p>
                </div>
              </div>
            )
          }
          const userVal   = impAnswers[q.id] || ''
          const isCorrect = isSubmitted && checkAnswer(userVal, q.answer)
          const isWrong   = isSubmitted && !isCorrect && userVal.trim()
          const kbActive  = kbTarget?.qid === q.id
          return (
            <div key={q.id} className={cardClass(isCorrect, isWrong)}>
              <div className="question-num greek">{q.label}</div>
              <div className="question-body">
                <p className="question-text greek">μαθητὴς 1· {q.student1}</p>
                <div className="fill-row" style={{ alignItems: 'center', gap: '8px' }}>
                  <span className="greek" style={{ whiteSpace: 'nowrap', color: 'var(--ink)' }}>μαθητὴς 2·</span>
                  <input
                    className={`fill-input greek${isCorrect ? ' fill-input--correct' : isWrong ? ' fill-input--wrong' : ''}`}
                    value={userVal}
                    onChange={e => handleImp(q.id, e.target.value)}
                    onFocus={() => !isSubmitted && setKbTarget({ section: 'imp', qid: q.id })}
                    disabled={isSubmitted}
                    placeholder="___"
                    autoComplete="off" autoCorrect="off" spellCheck="false"
                    style={{ flex: 1 }}
                    readOnly
                  />
                </div>
                {kbActive && !isSubmitted && <GreekKeyboard onKey={handleKbKey} />}
                {isSubmitted && (
                  <div className={`explanation ${isCorrect ? 'explanation--correct' : 'explanation--wrong'}`}>
                    {isCorrect ? `✓ ${q.explanation}` : <span>✗ <strong className="greek">{q.answer}</strong> — {q.explanation}</span>}
                  </div>
                )}
              </div>
            </div>
          )
        })}

        {/* ── Contract Verbs ── */}
        {activeId === 'cv' && ex.contractVerbs?.map(q => {
          const userVal   = cvAnswers[q.id] || ''
          const isCorrect = isSubmitted && checkAnswer(userVal, q.answer)
          const isWrong   = isSubmitted && !isCorrect && userVal.trim()
          const kbActive  = kbTarget?.qid === q.id
          return (
            <div key={q.id} className={cardClass(isCorrect, isWrong)}>
              <div className="question-num greek">{q.label || `Q${q.id}`}</div>
              <div className="question-body">
                <p className="question-text greek">{q.prompt}</p>
                <div className="fill-row">
                  <input
                    className={`fill-input greek${isCorrect ? ' fill-input--correct' : isWrong ? ' fill-input--wrong' : ''}`}
                    value={userVal}
                    onChange={e => handleCv(q.id, e.target.value)}
                    onFocus={() => !isSubmitted && setKbTarget({ section: 'cv', qid: q.id })}
                    disabled={isSubmitted}
                    placeholder="___"
                    autoComplete="off" autoCorrect="off" spellCheck="false"
                    readOnly
                  />
                </div>
                {kbActive && !isSubmitted && <GreekKeyboard onKey={handleKbKey} />}
                {isSubmitted && (
                  <div className={`explanation ${isCorrect ? 'explanation--correct' : 'explanation--wrong'}`}>
                    {isCorrect ? `✓ ${q.explanation}` : <span>✗ <strong className="greek">{q.answer}</strong> — {q.explanation}</span>}
                  </div>
                )}
              </div>
            </div>
          )
        })}

        {/* ── Fill the Case ── */}
        {activeId === 'cf' && ex.caseFill?.map(q => {
          const userVal   = cfAnswers[q.id] || ''
          const isCorrect = isSubmitted && checkAnswer(userVal, q.answer)
          const isWrong   = isSubmitted && !isCorrect && userVal.trim()
          const kbActive  = kbTarget?.qid === q.id
          return (
            <div key={q.id} className={cardClass(isCorrect, isWrong)}>
              <div className="question-num">{q.id}</div>
              <div className="question-body">
                <p className="question-text greek">{q.prompt}</p>
                <div className="fill-row">
                  <input
                    className={`fill-input greek${isCorrect ? ' fill-input--correct' : isWrong ? ' fill-input--wrong' : ''}`}
                    value={userVal}
                    onChange={e => handleCf(q.id, e.target.value)}
                    onFocus={() => !isSubmitted && setKbTarget({ section: 'cf', qid: q.id })}
                    disabled={isSubmitted}
                    placeholder="___"
                    autoComplete="off" autoCorrect="off" spellCheck="false"
                    readOnly
                  />
                </div>
                {kbActive && !isSubmitted && <GreekKeyboard onKey={handleKbKey} />}
                {isSubmitted && (
                  <div className={`explanation ${isCorrect ? 'explanation--correct' : 'explanation--wrong'}`}>
                    {isCorrect ? `✓ ${q.explanation}` : <span>✗ <strong className="greek">{q.answer}</strong> — {q.explanation}</span>}
                  </div>
                )}
              </div>
            </div>
          )
        })}

        {/* ── Conversation Questions ── */}
        {activeId === 'convo' && ex.conversationQuestions?.map((q, i) => (
          <div key={q.id} className="question-card">
            <div className="question-num">{i + 1}</div>
            <div className="question-body">
              <p className="question-text greek">{q.question}</p>
            </div>
          </div>
        ))}

      </div>

      {/* Footer — hidden for display-only sections */}
      {activeId !== 'convo' && (
        <div className="exercises-footer">
          {!isSubmitted ? (
            <button className="submit-btn" onClick={handleSubmit} disabled={!allAnswered}>
              {allAnswered
                ? <span><span className="greek">Ὑπόβαλλε</span> — {ui('submit')}</span>
                : `${answered} / ${total} ${ui('answered')}`
              }
            </button>
          ) : (
            <button className="reset-btn" onClick={handleReset}>
              <span className="greek">Πάλιν</span> — {ui('tryAgain')}
            </button>
          )}
        </div>
      )}

    </div>
  )
}

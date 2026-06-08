import { useState, useEffect } from 'react'
import './ConversationsTab.css'

export default function ConversationsTab({ conversations, activePart }) {
  const [current, setCurrent] = useState(0)

  if (!conversations) {
    return <div className="empty-tab">💬 Conversation questions for this chapter have not been added yet.</div>
  }

  const filtered = conversations.questions.filter(q => !q.part || q.part === activePart)

  // Reset when part changes
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => { setCurrent(0) }, [activePart])

  if (!filtered.length) {
    return <div className="empty-tab">💬 No questions for this part yet.</div>
  }

  const q = filtered[current]
  const hasPrev = current > 0
  const hasNext = current < filtered.length - 1

  return (
    <div className="conv-tab">
      <div className="conv-header">
        <h2 className="greek conv-title">{conversations.title}</h2>
        <span className="conv-count">{current + 1} / {filtered.length}</span>
      </div>

      {/* Progress dots */}
      <div className="conv-dots">
        {filtered.map((_, i) => (
          <button
            key={i}
            className={`conv-dot ${i === current ? 'conv-dot--active' : ''}`}
            onClick={() => setCurrent(i)}
            aria-label={`Question ${i + 1}`}
          />
        ))}
      </div>

      {/* Question card */}
      <div className="conv-card">
        <div className="conv-num">{current + 1}</div>
        <p className="conv-question greek">{q.question}</p>
      </div>

      {/* Navigation */}
      <div className="conv-nav">
        <button className="conv-nav-btn" onClick={() => setCurrent(c => c - 1)} disabled={!hasPrev}>
          ← Prev
        </button>
        <button className="conv-nav-btn conv-nav-btn--primary" onClick={() => setCurrent(c => c + 1)} disabled={!hasNext}>
          Next →
        </button>
      </div>

      {/* Full list */}
      <div className="conv-list">
        {filtered.map((item, i) => (
          <button
            key={item.id}
            className={`conv-list-row ${i === current ? 'conv-list-row--active' : ''}`}
            onClick={() => setCurrent(i)}
          >
            <span className="conv-list-num">{i + 1}</span>
            <span className="conv-list-q greek">{item.question}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

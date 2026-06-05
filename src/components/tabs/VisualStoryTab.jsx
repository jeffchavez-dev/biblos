import { useState, useEffect } from 'react'
import { useUI } from '../../context/LanguageContext.jsx'
import './VisualStoryTab.css'

export default function VisualStoryTab({ story, activePart }) {
  const ui = useUI()
  const [panel, setPanel] = useState(0)

  useEffect(() => { setPanel(0) }, [activePart])

  if (!story) {
    return <div className="empty-tab">🎨 Visual story for this unit has not been added yet.</div>
  }

  const panels = story.panels.some(p => p.part)
    ? story.panels.filter(p => !p.part || p.part === activePart)
    : story.panels

  if (!panels.length) {
    return <div className="empty-tab">🎨 Visual story for this part has not been added yet.</div>
  }

  const current = panels[Math.min(panel, panels.length - 1)]

  return (
    <div className="visual-tab">
      <div className="visual-header">
        <h2 className="greek">{story.title}</h2>
        <p className="visual-subtitle">{story.subtitle}</p>
      </div>

      {/* Main panel */}
      <div className="panel-card">
        <div className="panel-image">
          {current.image ? (
            <img
              src={`/${current.image}`}
              alt={current.scene}
              className="panel-image-actual"
            />
          ) : (
            <div className="panel-image-placeholder">
              <div className="panel-scene-desc">{current.scene}</div>
              <div className="panel-img-hint">{ui('illustrationSoon')}</div>
            </div>
          )}
        </div>

        <div className="panel-caption">
          <div className="caption-greek greek">{current.greekCaption}</div>
        </div>
      </div>

      {/* Navigation */}
      <div className="panel-nav">
        <button
          className="panel-nav-btn"
          onClick={() => setPanel(p => p - 1)}
          disabled={panel === 0}
        >{ui('prev')}</button>

        <div className="panel-dots">
          {panels.map((_, i) => (
            <button
              key={i}
              className={`panel-dot ${i === panel ? 'panel-dot--active' : ''}`}
              onClick={() => setPanel(i)}
              aria-label={`Panel ${i + 1}`}
            />
          ))}
        </div>

        <button
          className="panel-nav-btn"
          onClick={() => setPanel(p => p + 1)}
          disabled={panel === panels.length - 1}
        >{ui('next')}</button>
      </div>

      {/* All panels overview */}
      <div className="panels-overview">
        <h3>{ui('storyOverview')}</h3>
        <div className="panels-grid">
          {panels.map((p, i) => (
            <button
              key={p.id}
              className={`overview-panel ${i === panel ? 'overview-panel--active' : ''}`}
              onClick={() => setPanel(i)}
            >
              <div className="overview-num">{i + 1}</div>
              <div className="overview-greek greek">{p.greekCaption}</div>
              <div className="overview-en">{p.englishCaption}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

import { useState } from 'react'
import './VisualStoryTab.css'

export default function VisualStoryTab({ story }) {
  const [panel, setPanel] = useState(0)

  if (!story) {
    return <div className="empty-tab">🎨 Visual story for this unit has not been added yet.</div>
  }

  const current = story.panels[panel]

  return (
    <div className="visual-tab">
      <div className="visual-header">
        <h2>{story.title}</h2>
        <p className="visual-subtitle">{story.subtitle}</p>
      </div>

      {/* Main panel */}
      <div className="panel-card">
        {/* Placeholder image area */}
        <div className="panel-image">
          <div className="panel-image-placeholder">
            <div className="panel-scene-desc">{current.scene}</div>
            <div className="panel-img-note">🖼 Illustration area</div>
            <div className="panel-img-hint">Replace with your artwork or generated image</div>
          </div>
        </div>

        <div className="panel-caption">
          <div className="caption-greek greek">{current.greekCaption}</div>
          <div className="caption-english">{current.englishCaption}</div>
        </div>
      </div>

      {/* Navigation */}
      <div className="panel-nav">
        <button
          className="panel-nav-btn"
          onClick={() => setPanel(p => p - 1)}
          disabled={panel === 0}
        >← Previous</button>

        <div className="panel-dots">
          {story.panels.map((_, i) => (
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
          disabled={panel === story.panels.length - 1}
        >Next →</button>
      </div>

      {/* All panels overview */}
      <div className="panels-overview">
        <h3>Story Overview</h3>
        <div className="panels-grid">
          {story.panels.map((p, i) => (
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

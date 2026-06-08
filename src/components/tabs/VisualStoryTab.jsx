import { useState, useEffect } from 'react'
import { useUI, useLanguage, t } from '../../context/LanguageContext.jsx'
import FullscreenViewer from '../FullscreenViewer.jsx'
import './VisualStoryTab.css'

export default function VisualStoryTab({ story, activePart }) {
  const ui = useUI()
  const { lang } = useLanguage()
  const [panel, setPanel] = useState(0)
  const [fullscreen, setFullscreen] = useState(false)

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
  const imagePanels = panels.filter(p => p.image)
  const imageSrcs = imagePanels.map(p => `/${p.image}`)
  const imageCaptions = imagePanels.map(p => ({
    greek: p.greekCaption,
    english: t(p.englishCaption, p.captionTranslations, lang),
  }))
  const fsIndex = imagePanels.findIndex((_, i) => imagePanels[i] === imagePanels.find(p => p === current))

  function openFullscreen() {
    if (current.image) setFullscreen(true)
  }

  function fsPrev() {
    const cur = imagePanels.indexOf(current)
    if (cur > 0) setPanel(panels.indexOf(imagePanels[cur - 1]))
  }
  function fsNext() {
    const cur = imagePanels.indexOf(current)
    if (cur < imagePanels.length - 1) setPanel(panels.indexOf(imagePanels[cur + 1]))
  }

  const fsCurIndex = imagePanels.indexOf(current)

  return (
    <div className="visual-tab">
      {fullscreen && current.image && (
        <FullscreenViewer
          images={imageSrcs}
          captions={imageCaptions}
          index={Math.max(0, fsCurIndex)}
          onClose={() => setFullscreen(false)}
          onPrev={fsPrev}
          onNext={fsNext}
        />
      )}

      <div className="visual-header">
        <h2 className="greek">{story.title}</h2>
        <p className="visual-subtitle">{t(story.subtitle, story.subtitleTranslations, lang)}</p>
      </div>

      {/* Main panel */}
      <div className="panel-card">
        <div className="panel-image">
          {current.image ? (
            <div className="panel-image-wrap">
              <img
                src={`/${current.image}`}
                alt={current.scene}
                className="panel-image-actual"
              />
              <button className="panel-fullscreen-btn" onClick={openFullscreen} aria-label="Fullscreen">
                ⛶
              </button>
            </div>
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
              <div className="overview-en">{t(p.englishCaption, p.captionTranslations, lang)}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

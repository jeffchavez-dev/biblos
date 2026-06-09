import { useState } from 'react'
import { useUI, useLanguage, t } from '../context/LanguageContext.jsx'
import './Sidebar.css'

export default function Sidebar({ units, selectedUnit, selectedChapter, activePart, onSelect, onPartSelect, open, desktopHidden, onClose, totalWords, onVocabIndex, showingVocabIndex }) {
  const ui = useUI()
  const { lang } = useLanguage()
  const [collapsed, setCollapsed] = useState({})

  function toggleUnit(unitId) {
    setCollapsed(prev => ({ ...prev, [unitId]: !prev[unitId] }))
  }

  return (
    <aside className={`sidebar ${open ? 'sidebar--open' : ''} ${desktopHidden ? 'sidebar--desktop-hidden' : ''}`}>
      <div className="sidebar-header">
        <span className="greek">Βίβλος</span>
        <span>{ui('tableOfContents')}</span>
      </div>
      <nav className="sidebar-nav">
        {units.map(unit => {
          const isCollapsed = !!collapsed[unit.id]
          return (
            <div key={unit.id} className="unit-group">
              <button
                className={`unit-label unit-label--btn ${unit.locked ? 'unit-label--locked' : ''}`}
                onClick={() => toggleUnit(unit.id)}
                aria-expanded={!isCollapsed}
              >
                <span className="unit-label-main">
                  {unit.locked ? '🔒 ' : ''}{unit.title}
                </span>
                <span className="unit-subtitle">{t(unit.subtitle, unit.translations, lang)}</span>
                <span className={`unit-chevron ${isCollapsed ? 'unit-chevron--collapsed' : ''}`}>
                  ‹
                </span>
              </button>

              {!isCollapsed && unit.chapters.map(chapter => {
                const active = selectedUnit === unit.id && selectedChapter === chapter.id
                const locked = unit.locked || chapter.locked
                return (
                  <div key={chapter.id}>
                    <button
                      className={`chapter-btn ${active ? 'chapter-btn--active' : ''} ${locked ? 'chapter-btn--locked' : ''}`}
                      onClick={() => !locked && onSelect(unit.id, chapter.id)}
                      disabled={locked}
                    >
                      <span className="chapter-dot" />
                      <span>
                        <span className="chapter-title greek">{chapter.title}</span>
                        <span className="chapter-subtitle">{t(chapter.subtitle, chapter.translations, lang)}</span>
                      </span>
                      {locked && <span className="chapter-lock">🔒</span>}
                    </button>

                    {active && chapter.parts && (
                      <div className="part-nav">
                        {chapter.parts.map(part => (
                          <button
                            key={part.id}
                            className={`part-btn ${activePart === part.id ? 'part-btn--active' : ''}`}
                            onClick={() => onPartSelect(part.id)}
                          >
                            <span className="part-btn-label greek">{part.label}</span>
                            <span className="part-btn-subtitle">{part.subtitle}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )
        })}
      </nav>

      <div className="sidebar-footer">
        <button
          className={`vocab-index-link ${showingVocabIndex ? 'vocab-index-link--active' : ''}`}
          onClick={onVocabIndex}
        >
          <span className="vocab-index-link-icon">📖</span>
          <span className="vocab-index-link-text">
            <span className="greek">Λεξικόν</span>
            <span className="vocab-index-link-sub">{ui('allVocabulary')}</span>
          </span>
          {totalWords > 0 && (
            <span className="vocab-index-link-count">{totalWords}</span>
          )}
        </button>
      </div>
    </aside>
  )
}

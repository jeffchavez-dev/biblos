import './Sidebar.css'

export default function Sidebar({ units, selectedUnit, selectedChapter, activePart, onSelect, onPartSelect, open, onClose, totalWords, onVocabIndex, showingVocabIndex }) {
  return (
    <aside className={`sidebar ${open ? 'sidebar--open' : ''}`}>
      <div className="sidebar-header">
        <span className="greek">Βίβλος</span>
        <span>Table of Contents</span>
      </div>
      <nav className="sidebar-nav">
        {units.map(unit => (
          <div key={unit.id} className="unit-group">
            <div className={`unit-label ${unit.locked ? 'unit-label--locked' : ''}`}>
              {unit.locked ? '🔒 ' : ''}{unit.title}
              <span className="unit-subtitle">{unit.subtitle}</span>
            </div>
            {unit.chapters.map(chapter => {
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
                      <span className="chapter-subtitle">{chapter.subtitle}</span>
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
        ))}
      </nav>

      <div className="sidebar-footer">
        <button
          className={`vocab-index-link ${showingVocabIndex ? 'vocab-index-link--active' : ''}`}
          onClick={onVocabIndex}
        >
          <span className="vocab-index-link-icon">📖</span>
          <span className="vocab-index-link-text">
            <span className="greek">Λεξικόν</span>
            <span className="vocab-index-link-sub">All Vocabulary</span>
          </span>
          {totalWords > 0 && (
            <span className="vocab-index-link-count">{totalWords}</span>
          )}
        </button>
      </div>
    </aside>
  )
}

import './Sidebar.css'

export default function Sidebar({ units, selectedUnit, selectedChapter, onSelect, open, onClose }) {
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
                <button
                  key={chapter.id}
                  className={`chapter-btn ${active ? 'chapter-btn--active' : ''} ${locked ? 'chapter-btn--locked' : ''}`}
                  onClick={() => !locked && onSelect(unit.id, chapter.id)}
                  disabled={locked}
                >
                  <span className="chapter-dot" />
                  <span>
                    <span className="chapter-title">{chapter.title}</span>
                    <span className="chapter-subtitle">{chapter.subtitle}</span>
                  </span>
                  {locked && <span className="chapter-lock">🔒</span>}
                </button>
              )
            })}
          </div>
        ))}
      </nav>
    </aside>
  )
}

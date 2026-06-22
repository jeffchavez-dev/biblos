import { useState } from 'react'
import { useUI, useLanguage, t } from '../context/LanguageContext.jsx'
import './Sidebar.css'

const NT_BOOKS = [
  { abbr: 'Mat', name: 'Matthew',         ch: 28, group: 'Gospels' },
  { abbr: 'Mrk', name: 'Mark',            ch: 16, group: 'Gospels' },
  { abbr: 'Luk', name: 'Luke',            ch: 24, group: 'Gospels' },
  { abbr: 'Jhn', name: 'John',            ch: 21, group: 'Gospels' },
  { abbr: 'Act', name: 'Acts',            ch: 28, group: 'Acts' },
  { abbr: 'Rom', name: 'Romans',          ch: 16, group: 'Letters' },
  { abbr: '1Co', name: '1 Corinthians',   ch: 16, group: 'Letters' },
  { abbr: '2Co', name: '2 Corinthians',   ch: 13, group: 'Letters' },
  { abbr: 'Gal', name: 'Galatians',       ch:  6, group: 'Letters' },
  { abbr: 'Eph', name: 'Ephesians',       ch:  6, group: 'Letters' },
  { abbr: 'Php', name: 'Philippians',     ch:  4, group: 'Letters' },
  { abbr: 'Col', name: 'Colossians',      ch:  4, group: 'Letters' },
  { abbr: '1Th', name: '1 Thessalonians', ch:  5, group: 'Letters' },
  { abbr: '2Th', name: '2 Thessalonians', ch:  3, group: 'Letters' },
  { abbr: '1Ti', name: '1 Timothy',       ch:  6, group: 'Letters' },
  { abbr: '2Ti', name: '2 Timothy',       ch:  4, group: 'Letters' },
  { abbr: 'Tit', name: 'Titus',           ch:  3, group: 'Letters' },
  { abbr: 'Phm', name: 'Philemon',        ch:  1, group: 'Letters' },
  { abbr: 'Heb', name: 'Hebrews',         ch: 13, group: 'Letters' },
  { abbr: 'Jas', name: 'James',           ch:  5, group: 'General' },
  { abbr: '1Pe', name: '1 Peter',         ch:  5, group: 'General' },
  { abbr: '2Pe', name: '2 Peter',         ch:  3, group: 'General' },
  { abbr: '1Jn', name: '1 John',          ch:  5, group: 'General' },
  { abbr: '2Jn', name: '2 John',          ch:  1, group: 'General' },
  { abbr: '3Jn', name: '3 John',          ch:  1, group: 'General' },
  { abbr: 'Jud', name: 'Jude',            ch:  1, group: 'General' },
  { abbr: 'Rev', name: 'Revelation',      ch: 22, group: 'General' },
]

export default function Sidebar({ units, selectedUnit, selectedChapter, activePart, onSelect, onPartSelect, open, desktopHidden, onClose, totalWords, onVocabIndex, onUnitVocabReview, showingVocabIndex, onOpenGnt, activeGnt }) {
  const ui = useUI()
  const { lang } = useLanguage()
  const [collapsed, setCollapsed] = useState({})
  const [gntOpen, setGntOpen] = useState(false)
  const [activeBook, setActiveBook] = useState(null) // abbr of expanded book

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

              {!isCollapsed && unit.chapters.map((chapter, chIdx) => {
                const active = selectedUnit === unit.id && selectedChapter === chapter.id
                const locked = unit.locked || chapter.locked
                const isLastChapter = chIdx === unit.chapters.length - 1
                return (
                  <div key={chapter.id}>
                    <button
                      className={`chapter-btn ${active ? 'chapter-btn--active' : ''} ${locked ? 'chapter-btn--locked' : ''}`}
                      onClick={() => !locked && onSelect(unit.id, chapter.id)}
                      disabled={locked}
                    >
                      <span className="chapter-num">{chapter.id}.</span>
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

                    {isLastChapter && !unit.locked && (
                      <button
                        className="unit-vocab-review-btn"
                        onClick={() => onUnitVocabReview(unit.id)}
                      >
                        <span className="unit-vocab-review-icon">★</span>
                        <span className="unit-vocab-review-text">
                          {unit.title} Vocabulary Review
                        </span>
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          )
        })}
      </nav>

      {/* ── Greek NT section ── */}
      <div className="gnt-section">
        <button
          className="gnt-section-header"
          onClick={() => setGntOpen(v => !v)}
          aria-expanded={gntOpen}
        >
          <span className="gnt-section-icon">📜</span>
          <span className="gnt-section-label">Greek NT</span>
          <span className={`unit-chevron ${gntOpen ? '' : 'unit-chevron--collapsed'}`}>‹</span>
        </button>

        {gntOpen && (
          <div className="gnt-book-list">
            {NT_BOOKS.map(book => {
              const isActive = activeBook === book.abbr
              const isGntActive = activeGnt?.book === book.abbr
              return (
                <div key={book.abbr}>
                  <button
                    className={`gnt-book-btn ${isGntActive ? 'gnt-book-btn--active' : ''}`}
                    onClick={() => setActiveBook(isActive ? null : book.abbr)}
                  >
                    <span className="gnt-book-name">{book.name}</span>
                    <span className={`unit-chevron ${isActive ? '' : 'unit-chevron--collapsed'}`} style={{fontSize:'0.85rem', opacity: 0.5}}>‹</span>
                  </button>
                  {isActive && (
                    <div className="gnt-chapter-grid">
                      {Array.from({ length: book.ch }, (_, i) => i + 1).map(ch => (
                        <button
                          key={ch}
                          className={`gnt-ch-btn ${activeGnt?.book === book.abbr && activeGnt?.chapter === ch ? 'gnt-ch-btn--active' : ''}`}
                          onClick={() => onOpenGnt(book.abbr, ch)}
                        >
                          {ch}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

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

import { useState } from 'react'
import { useUI, useLanguage, t } from '../context/LanguageContext.jsx'
import { LANGUAGES } from '../context/LanguageContext.jsx'
import units from '../data/units.json'
import './HomeScreen.css'

const UNIT_CH_THEMES = {
  1: ['hs-ch-blue', 'hs-ch-blue2', 'hs-ch-blue3'],
  2: ['hs-ch-green', 'hs-ch-green2', 'hs-ch-green3'],
  3: ['hs-ch-amber', 'hs-ch-amber2'],
}

export default function HomeScreen({ onEnterApp, initialNav }) {
  const ui = useUI()
  const { lang, setLang } = useLanguage()
  const [page, setPage]           = useState(initialNav?.page ?? 'home')
  const [activeUnitId, setActiveUnitId] = useState(initialNav?.unitId ?? null)

  const activeUnit = units.find(u => u.id === activeUnitId)

  function openUnit(unitId) {
    const unit = units.find(u => u.id === unitId)
    if (unit?.locked) return
    setActiveUnitId(unitId)
    setPage('chapters')
  }

  return (
    <div className="hs-root">

      {/* ── App header — same structure as AppInner ── */}
      <header className="app-header">
        <nav className="app-bc-trail" aria-label="Breadcrumb">
          <span className="app-bc-home" onClick={() => setPage('home')}>Βίβλος</span>
          {page === 'units' && (
            <>
              <span className="app-bc-sep">›</span>
              <span className="app-bc-current">Βίβλος Stories</span>
            </>
          )}
          {page === 'chapters' && (
            <>
              <span className="app-bc-sep">›</span>
              <span className="app-bc-link" onClick={() => setPage('units')}>Βίβλος Stories</span>
              <span className="app-bc-sep">›</span>
              <span className="app-bc-current greek">{t(activeUnit?.title, activeUnit?.translations, lang)}</span>
            </>
          )}
        </nav>
        <select
          className="lang-select"
          value={lang}
          onChange={e => setLang(e.target.value)}
          aria-label="Language"
        >
          {LANGUAGES.map(l => (
            <option key={l.code} value={l.code}>{l.label} — {l.name}</option>
          ))}
        </select>
      </header>

      {/* ── Page: Home ── */}
      {page === 'home' && (
        <div className="hs-page">
          {page === 'chapters' && activeUnit && (
            <div className="hs-page-heading">
              <h1 className="hs-page-title greek">{activeUnit.title}</h1>
            </div>
          )}
          <div className="hs-grid hs-grid--home">

            <button className="hs-block" onClick={() => onEnterApp({ type: 'lexicon' })}>
              <div className="hs-block-accent hs-accent--gold" />
              <div className="hs-block-watermark">Λ</div>
              <span className="hs-block-icon" aria-hidden="true">🔍</span>
              <span className="hs-block-eyebrow">{ui('tabLexicon')}</span>
              <span className="hs-block-title greek">Λεξικόν</span>
              <span className="hs-block-sub">Search all vocabulary words by Greek, English, part of speech, or chapter.</span>
            </button>

            <button className="hs-block hs-block--center" onClick={() => setPage('units')}>
              <div className="hs-block-accent hs-accent--gradient" />
              <div className="hs-block-watermark">Β</div>
              <span className="hs-block-icon" aria-hidden="true">📖</span>
              <span className="hs-block-eyebrow">Narrative Curriculum</span>
              <span className="hs-block-title greek">Βίβλος Stories</span>
              <span className="hs-block-sub">Read original Koine Greek stories chapter by chapter with word-click definitions.</span>
              <span className="hs-block-badge">3 units · 8 chapters</span>
            </button>

            <button className="hs-block" onClick={() => onEnterApp({ type: 'gnt' })}>
              <div className="hs-block-accent hs-accent--green" />
              <div className="hs-block-watermark">Ν</div>
              <span className="hs-block-icon" aria-hidden="true">✝︎</span>
              <span className="hs-block-eyebrow">Scripture</span>
              <span className="hs-block-title">Greek NT</span>
              <span className="hs-block-sub">Read the New Testament in Greek with vocabulary-linked word definitions.</span>
              <span className="hs-block-badge">27 books · NA28</span>
            </button>

          </div>
        </div>
      )}

      {/* ── Page: Units ── */}
      {page === 'units' && (
        <div className="hs-page">
          <div className="hs-page-heading">
            <h1 className="hs-page-title">📖 <span className="greek">Βίβλος</span> Stories</h1>
            <p className="hs-page-sub">Choose a unit to begin</p>
          </div>
          <div className="hs-grid hs-grid--units">
            {units.map((unit, i) => {
              const themes = ['hs-unit-blue', 'hs-unit-green', 'hs-unit-amber']
              const locked = unit.locked
              return (
                <button
                  key={unit.id}
                  className={`hs-block hs-block--colored ${themes[i]} ${locked ? 'hs-block--locked' : ''}`}
                  onClick={() => openUnit(unit.id)}
                  disabled={locked}
                >
                  <div className="hs-block-watermark">{['Αʹ','Βʹ','Γʹ'][i]}</div>
                  <span className="hs-block-eyebrow">Unit {unit.id}</span>
                  <span className="hs-block-title large greek">{unit.title}</span>
                  <span className="hs-block-sub">{unit.subtitle}</span>
                  {locked
                    ? <span className="hs-block-lock">🔒 Locked</span>
                    : (
                      <div className="hs-ch-pills">
                        {unit.chapters.map(ch => (
                          <span key={ch.id} className="hs-ch-pill">Ch. {ch.id}</span>
                        ))}
                      </div>
                    )
                  }
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Page: Chapters ── */}
      {page === 'chapters' && activeUnit && (
        <div className="hs-page">
          <div className="hs-page-heading">
            <h1 className="hs-page-title">
              Unit {activeUnit.id} — <span className="greek">{activeUnit.title}</span>
            </h1>
            <p className="hs-page-sub">{activeUnit.subtitle}</p>
          </div>
          <div className="hs-grid hs-grid--chapters">
            {activeUnit.chapters.map((ch, i) => {
              const themes = UNIT_CH_THEMES[activeUnit.id] || []
              const theme  = themes[i] || themes[0] || 'hs-ch-blue'
              const locked = ch.locked
              return (
                <button
                  key={ch.id}
                  className={`hs-block hs-block--colored ${theme} ${locked ? 'hs-block--locked' : ''}`}
                  onClick={() => !locked && onEnterApp({ type: 'chapter', unitId: activeUnit.id, chapterId: ch.id, part: 'A' })}
                  disabled={locked}
                >
                  <div className="hs-block-watermark">{['Αʹ','Βʹ','Γʹ','Δʹ','Εʹ','Ϛʹ','Ζʹ','Ηʹ'][ch.id - 1]}</div>
                  <span className="hs-block-eyebrow">Chapter {ch.id}</span>
                  <span className="hs-block-title large greek">{ch.title}</span>
                  <span className="hs-block-sub">{ch.subtitle}</span>
                  {locked
                    ? <span className="hs-block-lock">🔒 Locked</span>
                    : (
                      <div className="hs-ch-pills">
                        {ch.parts?.map(p => (
                          <span key={p.id} className="hs-ch-pill">{p.label}</span>
                        ))}
                      </div>
                    )
                  }
                </button>
              )
            })}
          </div>
        </div>
      )}

    </div>
  )
}

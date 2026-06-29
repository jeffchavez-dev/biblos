import { useState, useEffect, useCallback } from 'react'
import LoginPage from './components/LoginPage.jsx'
import AdminPage from './components/AdminPage.jsx'
import Sidebar from './components/Sidebar.jsx'
import ChapterView from './components/ChapterView.jsx'
import VocabularyIndex from './components/VocabularyIndex.jsx'
import VocabularyTab from './components/tabs/VocabularyTab.jsx'
import GntReader from './components/GntReader.jsx'
import { LanguageProvider, LANGUAGES, useLanguage, useUI } from './context/LanguageContext.jsx'
import units from './data/units.json'
import './App.css'

const VOCAB_SOURCES = [
  { file: () => import('./data/unit1/chapter1/vocabulary.json'), unit: 1, chapter: 1 },
  { file: () => import('./data/unit1/chapter2/vocabulary.json'), unit: 1, chapter: 2 },
  { file: () => import('./data/unit1/chapter3/vocabulary.json'), unit: 1, chapter: 3 },
  { file: () => import('./data/unit2/chapter4/vocabulary.json'), unit: 2, chapter: 4 },
  { file: () => import('./data/unit2/chapter5/vocabulary.json'), unit: 2, chapter: 5 },
  { file: () => import('./data/unit2/chapter6/vocabulary.json'), unit: 2, chapter: 6 },
  { file: () => import('./data/unit3/chapter7/vocabulary.json'), unit: 3, chapter: 7 },
]

function UnitVocabReview({ unitId, allVocabulary, units, onOpenLexicon }) {
  const unit = units.find(u => u.id === unitId)
  const words = allVocabulary.filter(w => w.unit === unitId)
  return (
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '860px', margin: '0 auto' }}>
      <div style={{ textAlign: 'center' }}>
        <h2 style={{ fontSize: '1.4rem', color: 'var(--deep-blue)', margin: 0 }}>{unit?.title} — Vocabulary Review</h2>
        <p style={{ color: 'var(--grey)', fontSize: '0.9rem', margin: '4px 0 0', fontStyle: 'italic' }}>{words.length} words · all chapters</p>
      </div>
      <VocabularyTab
        words={words}
        unitId={unitId}
        chapterId={null}
        activePart={null}
        onOpenLexicon={onOpenLexicon}
      />
    </div>
  )
}

function makeSnap(fields) {
  return {
    selectedUnit: 1,
    selectedChapter: 1,
    activePart: 'A',
    showVocabIndex: false,
    lexiconTarget: null,
    gntView: null,
    unitReviewId: null,
    ...fields,
  }
}

function AppInner() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [desktopSidebarHidden, setDesktopSidebarHidden] = useState(false)
  const [navHidden, setNavHidden] = useState(false)
  const [fontSize, setFontSize] = useState(16)
  const [totalWords, setTotalWords] = useState(0)
  const [allVocabulary, setAllVocabulary] = useState([])
  const [isFullscreen, setIsFullscreen] = useState(false)

  useEffect(() => {
    function onFsChange() { setIsFullscreen(!!document.fullscreenElement) }
    document.addEventListener('fullscreenchange', onFsChange)
    return () => document.removeEventListener('fullscreenchange', onFsChange)
  }, [])

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen()
    } else {
      document.exitFullscreen()
    }
  }

  const FONT_SIZES = [14, 16, 19, 22, 26, 30]

  function changeFontSize(delta) {
    setFontSize(prev => {
      const idx = FONT_SIZES.indexOf(prev)
      const next = FONT_SIZES[Math.max(0, Math.min(FONT_SIZES.length - 1, idx + delta))]
      document.documentElement.setAttribute('data-font-size', String(next))
      return next
    })
  }

  // ── Navigation history ──────────────────────────────────────────────
  const [navStack, setNavStack] = useState([makeSnap({})])
  const [navIdx, setNavIdx] = useState(0)
  const current = navStack[navIdx]
  const { selectedUnit, selectedChapter, activePart, showVocabIndex, lexiconTarget, gntView, unitReviewId } = current

  const canBack = navIdx > 0
  const canForward = navIdx < navStack.length - 1

  function pushNav(snap) {
    setNavStack(prev => [...prev.slice(0, navIdx + 1), snap])
    setNavIdx(prev => prev + 1)
  }

  const goBack = useCallback(() => {
    if (canBack) setNavIdx(prev => prev - 1)
  }, [canBack])

  const goForward = useCallback(() => {
    if (canForward) setNavIdx(prev => prev + 1)
  }, [canForward])

  // Keyboard shortcuts: Alt+Left / Alt+Right
  useEffect(() => {
    function handler(e) {
      if (e.altKey && e.key === 'ArrowLeft') { e.preventDefault(); goBack() }
      if (e.altKey && e.key === 'ArrowRight') { e.preventDefault(); goForward() }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [goBack, goForward])
  // ───────────────────────────────────────────────────────────────────

  useEffect(() => {
    Promise.all(VOCAB_SOURCES.map(s => s.file().then(m => ({ data: m.default, unit: s.unit, chapter: s.chapter }))))
      .then(results => {
        const all = results.flatMap(({ data, unit, chapter }) => data.map(w => ({ ...w, unit, chapter })))
        setTotalWords(all.length)
        setAllVocabulary(all)
      })
  }, [])

  const currentUnit = units.find(u => u.id === selectedUnit)
  const currentChapter = currentUnit?.chapters.find(c => c.id === selectedChapter)
  const isLocked = currentUnit?.locked || currentChapter?.locked

  function handleOpenLexicon(unitId, chapterId, part) {
    pushNav(makeSnap({ selectedUnit: unitId, selectedChapter: chapterId, activePart: part, showVocabIndex: true, lexiconTarget: { unitId, chapterId, part } }))
    setSidebarOpen(false)
  }

  function handleOpenGnt(book, chapter, verse = null) {
    pushNav(makeSnap({ selectedUnit, selectedChapter, activePart, gntView: { book, chapter, verse } }))
    setSidebarOpen(false)
  }

  function handleOpenLexiconByStrongs(strongsNum) {
    pushNav(makeSnap({ selectedUnit, selectedChapter, activePart, showVocabIndex: true, lexiconTarget: { strongsNum } }))
    setSidebarOpen(false)
  }

  function handleSelect(unitId, chapterId) {
    pushNav(makeSnap({ selectedUnit: unitId, selectedChapter: chapterId, activePart: 'A' }))
    setSidebarOpen(false)
  }

  function handlePartSelect(partId) {
    pushNav(makeSnap({ selectedUnit, selectedChapter, activePart: partId }))
    setSidebarOpen(false)
  }

  function handleVocabIndexNavigate(unitId, chapterId, part) {
    pushNav(makeSnap({ selectedUnit: unitId, selectedChapter: chapterId, activePart: part }))
    setSidebarOpen(false)
  }

  function handleOpenVocabIndex() {
    pushNav(makeSnap({ selectedUnit, selectedChapter, activePart, showVocabIndex: true }))
    setSidebarOpen(false)
  }

  function handleUnitVocabReview(unitId) {
    pushNav(makeSnap({ selectedUnit: unitId, selectedChapter, activePart, unitReviewId: unitId }))
    setSidebarOpen(false)
  }

  const currentPart = currentChapter?.parts?.find(p => p.id === activePart)

  const { lang, setLang } = useLanguage()
  const ui = useUI()

  const desktopFullyHidden = navHidden && desktopSidebarHidden

  return (
    <div className={`app-shell ${navHidden ? 'app-shell--nav-hidden' : ''}`}>
      {desktopFullyHidden && (
        <button
          className="nav-restore-btn"
          onClick={() => { setDesktopSidebarHidden(false); setNavHidden(false) }}
          aria-label="Show navigation"
        >
          <span /><span /><span />
        </button>
      )}
      <header className={`app-header ${navHidden ? 'app-header--hidden' : ''}`}>
        <button className="menu-btn" onClick={() => {
          if (window.innerWidth <= 768) setSidebarOpen(v => !v)
          else { setDesktopSidebarHidden(v => !v); setNavHidden(v => !v) }
        }} aria-label="Menu">
          <span /><span /><span />
        </button>

        <div className="app-title">
          <span className="app-title-greek greek">Βίβλος</span>
          <span className="app-title-sub">{ui('appSubtitle')}</span>
        </div>
        <div className="app-breadcrumb greek">
          {currentChapter?.title}
          {currentPart && <> · {currentPart.label} — {currentPart.subtitle}</>}
        </div>
        <div className="font-size-ctrl" aria-label="Font size">
          <button
            className="font-size-btn"
            onClick={() => changeFontSize(-1)}
            disabled={fontSize === FONT_SIZES[0]}
            aria-label="Decrease font size"
          >A−</button>
          <button
            className="font-size-btn"
            onClick={() => changeFontSize(1)}
            disabled={fontSize === FONT_SIZES[FONT_SIZES.length - 1]}
            aria-label="Increase font size"
          >A+</button>
        </div>

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

        <button
          className="fullscreen-btn"
          onClick={toggleFullscreen}
          aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
          title={isFullscreen ? 'Exit fullscreen (Esc)' : 'Fullscreen'}
        >
          {isFullscreen ? '⊠' : '⛶'}
        </button>
      </header>

      <div className="app-body">
        <Sidebar
          units={units}
          selectedUnit={selectedUnit}
          selectedChapter={selectedChapter}
          activePart={activePart}
          onSelect={handleSelect}
          onPartSelect={handlePartSelect}
          open={sidebarOpen}
          desktopHidden={desktopSidebarHidden}
          onClose={() => setSidebarOpen(false)}
          totalWords={totalWords}
          onVocabIndex={handleOpenVocabIndex}
          onUnitVocabReview={handleUnitVocabReview}
          showingVocabIndex={showVocabIndex}
          onOpenGnt={handleOpenGnt}
          activeGnt={gntView}
        />

        {sidebarOpen && (
          <div className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} />
        )}

        <main className="main-content">
          {gntView ? (
            <GntReader
              book={gntView.book}
              chapter={gntView.chapter}
              highlightVerse={gntView.verse}
              onOpenLexicon={handleOpenLexiconByStrongs}
              onClose={goBack}
            />
          ) : unitReviewId ? (
            <UnitVocabReview
              key={unitReviewId}
              unitId={unitReviewId}
              allVocabulary={allVocabulary}
              units={units}
              onOpenLexicon={handleOpenLexicon}
            />
          ) : showVocabIndex ? (
            <VocabularyIndex
              onNavigate={handleVocabIndexNavigate}
              target={lexiconTarget}
              onOpenGnt={handleOpenGnt}
            />
          ) : isLocked ? (
            <LockedView />
          ) : (
            <ChapterView
              unitId={selectedUnit}
              chapterId={selectedChapter}
              activePart={activePart}
              navHidden={navHidden}
              onToggleNav={() => setNavHidden(v => !v)}
              onOpenLexicon={handleOpenLexicon}
              onOpenGnt={handleOpenGnt}
              allVocabulary={allVocabulary}
              canBack={canBack}
              canForward={canForward}
              onBack={goBack}
              onForward={goForward}
            />
          )}
        </main>
      </div>
    </div>
  )
}

export default function App() {
  const [session, setSession] = useState(() => localStorage.getItem('biblos_session') || null)

  function handleEnter() {
    setSession(localStorage.getItem('biblos_session'))
  }

  function handleExit() {
    setSession(null)
  }

  if (!session) return <LoginPage onEnter={handleEnter} />
  if (session === 'admin') return <AdminPage onExit={handleExit} />

  return (
    <LanguageProvider>
      <AppInner />
    </LanguageProvider>
  )
}

function LockedView() {
  const ui = useUI()
  return (
    <div className="locked-view">
      <div className="lock-icon">🔒</div>
      <h2>{ui('chapterLocked')}</h2>
      <p>{ui('chapterLockedMsg')}</p>
    </div>
  )
}

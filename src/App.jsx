import { useState, useEffect, useCallback } from 'react'
import LoginPage from './components/LoginPage.jsx'
import AdminPage from './components/AdminPage.jsx'
import HomeScreen from './components/HomeScreen.jsx'
import Sidebar from './components/Sidebar.jsx'
import ChapterView from './components/ChapterView.jsx'
import VocabularyIndex from './components/VocabularyIndex.jsx'
import VocabularyTab from './components/tabs/VocabularyTab.jsx'
import GntReader from './components/GntReader.jsx'
import BiblosKids from './components/BiblosKids.jsx'
import { LanguageProvider, LANGUAGES, useLanguage, useUI } from './context/LanguageContext.jsx'
import { clearSession } from './auth.js'
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
  { file: () => import('./data/unit3/chapter8/vocabulary.json'), unit: 3, chapter: 8 },
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

function AppInner({ onSignOut, initialNav, onGoHome, onGoToUnits, onGoToUnit }) {
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
  const [navStack, setNavStack] = useState([makeSnap({
    selectedUnit:    initialNav?.unitId    ?? 1,
    selectedChapter: initialNav?.chapterId ?? 1,
    activePart:      initialNav?.part      ?? 'A',
    showVocabIndex:  initialNav?.type === 'lexicon',
    gntView:         initialNav?.type === 'gnt' ? { book: 'Mat', chapter: 1 } : null,
    unitReviewId:    initialNav?.type === 'unitReview' ? initialNav.unitId : null,
  })])
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
  }

  function handleUnitVocabReview(unitId) {
    pushNav(makeSnap({ selectedUnit: unitId, selectedChapter, activePart, unitReviewId: unitId }))
  }

  const currentPart = currentChapter?.parts?.find(p => p.id === activePart)

  const { lang, setLang } = useLanguage()
  const ui = useUI()

  function headerBreadcrumb() {
    if (showVocabIndex) return <><span className="app-bc-sep">›</span><span className="app-bc-current">Λεξικόν</span></>
    if (gntView)        return <><span className="app-bc-sep">›</span><span className="app-bc-current">Greek NT</span></>
    if (unitReviewId)   return (
      <>
        <span className="app-bc-sep">›</span>
        <span className="app-bc-link" onClick={onGoToUnits}>Βίβλος Stories</span>
        <span className="app-bc-sep">›</span>
        <span className="app-bc-current greek">{currentUnit?.title} — Vocabulary</span>
      </>
    )
    return (
      <>
        <span className="app-bc-sep">›</span>
        <span className="app-bc-link" onClick={onGoToUnits}>Βίβλος Stories</span>
        <span className="app-bc-sep">›</span>
        <span className="app-bc-link greek" onClick={() => onGoToUnit(selectedUnit)}>{currentUnit?.title}</span>
        <span className="app-bc-sep">›</span>
        <span className="app-bc-current greek">
          {currentChapter?.title}
          {currentPart && <> · {currentPart.label}</>}
        </span>
      </>
    )
  }

  return (
    <div className={`app-shell app-shell--no-sidebar ${navHidden ? 'app-shell--nav-hidden' : ''}`}>
      {navHidden && (
        <button
          className="nav-restore-btn"
          onClick={() => setNavHidden(false)}
          aria-label="Show navigation"
        >
          <span /><span /><span />
        </button>
      )}
      <header className={`app-header ${navHidden ? 'app-header--hidden' : ''}`}>
        <nav className="app-bc-trail" aria-label="Breadcrumb">
          <span className="app-bc-home" onClick={onGoHome} title="Home">Βίβλος</span>
          {headerBreadcrumb()}
        </nav>
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
        <main className="main-content">
          {gntView ? (
            <GntReader
              book={gntView.book}
              chapter={gntView.chapter}
              highlightVerse={gntView.verse}
              onOpenLexicon={handleOpenLexiconByStrongs}
              onClose={goBack}
              onNavigate={(b, ch) => handleOpenGnt(b, ch)}
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
              onPartChange={handlePartSelect}
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
  const [session, setSession]     = useState(() => localStorage.getItem('biblos_session') || null)
  const [homeScreen, setHomeScreen] = useState(true)
  const [kidsScreen, setKidsScreen] = useState(false)
  const [initialNav, setInitialNav] = useState(null)
  const [homeNav, setHomeNav] = useState(null) // { page, unitId } for HomeScreen initial state

  function handleEnter() {
    setSession(localStorage.getItem('biblos_session'))
    setHomeScreen(true)
  }

  function handleExit() {
    setSession(null)
  }

  function handleEnterApp(nav) {
    if (nav.type === 'kids') {
      setKidsScreen(true)
      setHomeScreen(false)
      return
    }
    if (nav.type === 'unitReview') {
      setInitialNav({ ...nav, unitId: nav.unitId })
    } else {
      setInitialNav(nav)
    }
    setHomeScreen(false)
  }

  function handleGoHome() {
    setHomeNav(null)
    setKidsScreen(false)
    setHomeScreen(true)
  }

  function handleGoToUnits() {
    setHomeNav({ page: 'units' })
    setHomeScreen(true)
  }

  function handleGoToUnit(unitId) {
    setHomeNav({ page: 'chapters', unitId })
    setHomeScreen(true)
  }

  function handleSignOut() {
    clearSession()
    setSession(null)
    setHomeScreen(true)
  }

  if (!session) return <LoginPage onEnter={handleEnter} />
  if (session === 'admin') return <AdminPage onExit={handleExit} />

  return (
    <LanguageProvider>
      {kidsScreen
        ? <BiblosKids onGoHome={handleGoHome} />
        : homeScreen
        ? <HomeScreen onEnterApp={handleEnterApp} initialNav={homeNav} />
        : <AppInner
            onSignOut={handleSignOut}
            initialNav={initialNav}
            onGoHome={handleGoHome}
            onGoToUnits={handleGoToUnits}
            onGoToUnit={handleGoToUnit}
          />
      }
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

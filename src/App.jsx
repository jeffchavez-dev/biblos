import { useState, useEffect } from 'react'
import Sidebar from './components/Sidebar.jsx'
import ChapterView from './components/ChapterView.jsx'
import VocabularyIndex from './components/VocabularyIndex.jsx'
import GntReader from './components/GntReader.jsx'
import { LanguageProvider, LANGUAGES, useLanguage, useUI } from './context/LanguageContext.jsx'
import units from './data/units.json'
import './App.css'

const VOCAB_SOURCES = [
  () => import('./data/unit1/chapter1/vocabulary.json'),
  () => import('./data/unit1/chapter2/vocabulary.json'),
  () => import('./data/unit1/chapter3/vocabulary.json'),
  () => import('./data/unit2/chapter4/vocabulary.json'),
  () => import('./data/unit2/chapter5/vocabulary.json'),
  () => import('./data/unit2/chapter6/vocabulary.json'),
]

function AppInner() {
  const [selectedUnit, setSelectedUnit] = useState(1)
  const [selectedChapter, setSelectedChapter] = useState(1)
  const [activePart, setActivePart] = useState('A')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [desktopSidebarHidden, setDesktopSidebarHidden] = useState(false)
  const [navHidden, setNavHidden] = useState(false)
  const [fontSize, setFontSize] = useState(16)

  const FONT_SIZES = [14, 16, 19, 22, 26, 30]

  function changeFontSize(delta) {
    setFontSize(prev => {
      const idx = FONT_SIZES.indexOf(prev)
      const next = FONT_SIZES[Math.max(0, Math.min(FONT_SIZES.length - 1, idx + delta))]
      document.documentElement.setAttribute('data-font-size', String(next))
      return next
    })
  }
  const [showVocabIndex, setShowVocabIndex] = useState(false)
  const [lexiconTarget, setLexiconTarget] = useState(null)
  const [totalWords, setTotalWords] = useState(0)
  const [gntView, setGntView] = useState(null) // { book, chapter } or null

  useEffect(() => {
    Promise.all(VOCAB_SOURCES.map(fn => fn().then(m => m.default)))
      .then(results => setTotalWords(results.reduce((sum, arr) => sum + arr.length, 0)))
  }, [])

  const currentUnit = units.find(u => u.id === selectedUnit)
  const currentChapter = currentUnit?.chapters.find(c => c.id === selectedChapter)
  const isLocked = currentUnit?.locked || currentChapter?.locked

  function handleOpenLexicon(unitId, chapterId, part) {
    setLexiconTarget({ unitId, chapterId, part })
    setShowVocabIndex(true)
    setGntView(null)
    setSidebarOpen(false)
  }

  function handleOpenGnt(book, chapter, verse = null) {
    setGntView({ book, chapter, verse })
    setShowVocabIndex(false)
    setSidebarOpen(false)
  }

  function handleOpenLexiconByStrongs(strongsNum) {
    setLexiconTarget({ strongsNum })
    setShowVocabIndex(true)
    setGntView(null)
    setSidebarOpen(false)
  }

  function handleSelect(unitId, chapterId) {
    setSelectedUnit(unitId)
    setSelectedChapter(chapterId)
    setActivePart('A')
    setShowVocabIndex(false)
    setGntView(null)
    setLexiconTarget(null)
    setSidebarOpen(false)
  }

  function handlePartSelect(partId) {
    setActivePart(partId)
    setShowVocabIndex(false)
    setGntView(null)
    setSidebarOpen(false)
  }

  function handleVocabIndexNavigate(unitId, chapterId, part) {
    setSelectedUnit(unitId)
    setSelectedChapter(chapterId)
    setActivePart(part)
    setShowVocabIndex(false)
    setGntView(null)
    setLexiconTarget(null)
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
          onVocabIndex={() => { setShowVocabIndex(true); setGntView(null); setLexiconTarget(null); setSidebarOpen(false) }}
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
              onClose={() => setGntView(null)}
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
            />
          )}
        </main>
      </div>
    </div>
  )
}

export default function App() {
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

import { useState, useEffect } from 'react'
import Sidebar from './components/Sidebar.jsx'
import ChapterView from './components/ChapterView.jsx'
import VocabularyIndex from './components/VocabularyIndex.jsx'
import { LanguageProvider, LANGUAGES, useLanguage, useUI } from './context/LanguageContext.jsx'
import units from './data/units.json'
import './App.css'

const VOCAB_SOURCES = [
  () => import('./data/unit1/chapter1/vocabulary.json'),
  () => import('./data/unit1/chapter2/vocabulary.json'),
  () => import('./data/unit1/chapter3/vocabulary.json'),
  () => import('./data/unit2/chapter4/vocabulary.json'),
  () => import('./data/unit2/chapter5/vocabulary.json'),
]

function AppInner() {
  const [selectedUnit, setSelectedUnit] = useState(1)
  const [selectedChapter, setSelectedChapter] = useState(1)
  const [activePart, setActivePart] = useState('A')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [desktopSidebarHidden, setDesktopSidebarHidden] = useState(false)
  const [fontSize, setFontSize] = useState('md')

  const FONT_SIZES = [
    { key: 'sm',  label: 'A',   px: 14 },
    { key: 'md',  label: 'A',   px: 16 },
    { key: 'lg',  label: 'A',   px: 19 },
    { key: 'xl',  label: 'A',   px: 22 },
    { key: 'xxl', label: 'A',   px: 26 },
  ]

  function changeFontSize(key) {
    setFontSize(key)
    const size = FONT_SIZES.find(f => f.key === key)
    document.documentElement.style.fontSize = size.px + 'px'
  }
  const [showVocabIndex, setShowVocabIndex] = useState(false)
  const [totalWords, setTotalWords] = useState(0)

  useEffect(() => {
    Promise.all(VOCAB_SOURCES.map(fn => fn().then(m => m.default)))
      .then(results => setTotalWords(results.reduce((sum, arr) => sum + arr.length, 0)))
  }, [])

  const currentUnit = units.find(u => u.id === selectedUnit)
  const currentChapter = currentUnit?.chapters.find(c => c.id === selectedChapter)
  const isLocked = currentUnit?.locked || currentChapter?.locked

  function handleSelect(unitId, chapterId) {
    setSelectedUnit(unitId)
    setSelectedChapter(chapterId)
    setActivePart('A')
    setShowVocabIndex(false)
    setSidebarOpen(false)
  }

  function handlePartSelect(partId) {
    setActivePart(partId)
    setShowVocabIndex(false)
    setSidebarOpen(false)
  }

  function handleVocabIndexNavigate(unitId, chapterId, part) {
    setSelectedUnit(unitId)
    setSelectedChapter(chapterId)
    setActivePart(part)
    setShowVocabIndex(false)
    setSidebarOpen(false)
  }

  const currentPart = currentChapter?.parts?.find(p => p.id === activePart)

  const { lang, setLang } = useLanguage()
  const ui = useUI()

  return (
    <div className="app-shell">
      <header className="app-header">
        <button className="menu-btn" onClick={() => {
          if (window.innerWidth <= 768) setSidebarOpen(v => !v)
          else setDesktopSidebarHidden(v => !v)
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
          {FONT_SIZES.map(f => (
            <button
              key={f.key}
              className={`font-size-btn ${fontSize === f.key ? 'font-size-btn--active' : ''}`}
              style={{ fontSize: f.px * 0.6 + 'px' }}
              onClick={() => changeFontSize(f.key)}
              aria-label={`Font size ${f.key}`}
            >A</button>
          ))}
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
          onVocabIndex={() => { setShowVocabIndex(true); setSidebarOpen(false) }}
          showingVocabIndex={showVocabIndex}
        />

        {sidebarOpen && (
          <div className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} />
        )}

        <main className="main-content">
          {showVocabIndex ? (
            <VocabularyIndex onNavigate={handleVocabIndexNavigate} />
          ) : isLocked ? (
            <LockedView />
          ) : (
            <ChapterView
              unitId={selectedUnit}
              chapterId={selectedChapter}
              activePart={activePart}
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

import { useState } from 'react'
import Sidebar from './components/Sidebar.jsx'
import ChapterView from './components/ChapterView.jsx'
import units from './data/units.json'
import './App.css'

export default function App() {
  const [selectedUnit, setSelectedUnit] = useState(1)
  const [selectedChapter, setSelectedChapter] = useState(1)
  const [activePart, setActivePart] = useState('A')
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const currentUnit = units.find(u => u.id === selectedUnit)
  const currentChapter = currentUnit?.chapters.find(c => c.id === selectedChapter)
  const isLocked = currentUnit?.locked || currentChapter?.locked

  function handleSelect(unitId, chapterId) {
    setSelectedUnit(unitId)
    setSelectedChapter(chapterId)
    setActivePart('A')
    setSidebarOpen(false)
  }

  function handlePartSelect(partId) {
    setActivePart(partId)
    setSidebarOpen(false)
  }

  const currentPart = currentChapter?.parts?.find(p => p.id === activePart)

  return (
    <div className="app-shell">
      <header className="app-header">
        <button className="menu-btn" onClick={() => setSidebarOpen(v => !v)} aria-label="Menu">
          <span /><span /><span />
        </button>
        <div className="app-title">
          <span className="app-title-greek greek">Βίβλος</span>
          <span className="app-title-sub">Koine Greek Reader</span>
        </div>
        <div className="app-breadcrumb greek">
          {currentChapter?.title}
          {currentPart && <> · {currentPart.label} — {currentPart.subtitle}</>}
        </div>
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
          onClose={() => setSidebarOpen(false)}
        />

        {sidebarOpen && (
          <div className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} />
        )}

        <main className="main-content">
          {isLocked ? (
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

function LockedView() {
  return (
    <div className="locked-view">
      <div className="lock-icon">🔒</div>
      <h2>Chapter Locked</h2>
      <p>This chapter is not yet available. Complete Unit 1 to unlock future units.</p>
    </div>
  )
}

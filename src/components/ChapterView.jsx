import { useState, useEffect, useRef } from 'react'
import './ChapterView.css'
import VocabularyTab from './tabs/VocabularyTab.jsx'
import StoryTab from './tabs/StoryTab.jsx'
import ExercisesTab from './tabs/ExercisesTab.jsx'
import GrammarTab from './tabs/GrammarTab.jsx'
import VisualStoryTab from './tabs/VisualStoryTab.jsx'
import VideoTab from './tabs/VideoTab.jsx'
import VocabularyIndex from './VocabularyIndex.jsx'
import { useUI } from '../context/LanguageContext.jsx'

const TAB_CONFIG = [
  { id: 'story',      labelKey: 'tabStory',     emoji: '📖' },
  { id: 'vocabulary', labelKey: 'tabVocabulary', emoji: '📚' },
  { id: 'lexicon',    labelKey: 'tabLexicon',    emoji: '🔍' },
  { id: 'visual',     labelKey: 'tabVisual',     emoji: '🎨' },
  { id: 'exercises',  labelKey: 'tabExercises',  emoji: '✏️' },
  { id: 'grammar',    labelKey: 'tabGrammar',    emoji: '📐' },
  { id: 'video',      labelKey: 'tabVideo',      emoji: '🎬' },
]

async function loadData(unitId, chapterId, type) {
  try {
    const mod = await import(`../data/unit${unitId}/chapter${chapterId}/${type}.json`)
    return mod.default
  } catch {
    return null
  }
}

export default function ChapterView({ unitId, chapterId, activePart, onPartChange, navHidden, onToggleNav, onOpenLexicon, onOpenGnt, allVocabulary, canBack, canForward, onBack, onForward }) {
  const ui = useUI()
  const [activeTab, setActiveTab] = useState('story')
  const [data, setData] = useState({})
  const [loading, setLoading] = useState(true)
  const prevKey = useRef(null)
  const key = `${unitId}-${chapterId}`

  useEffect(() => {
    if (prevKey.current === key) return
    prevKey.current = key
    setActiveTab('story')
    setLoading(true)
    Promise.all([
      loadData(unitId, chapterId, 'vocabulary'),
      loadData(unitId, chapterId, 'story'),
      loadData(unitId, chapterId, 'exercises'),
      loadData(unitId, chapterId, 'grammar'),
      loadData(unitId, chapterId, 'visualstory'),
    ]).then(([vocabulary, story, exercises, grammar, visualstory]) => {
      setData({ vocabulary, story, exercises, grammar, visualstory })
      setLoading(false)
    })
  }, [unitId, chapterId, key])

  const hasData = (tabId) => {
    const map = { vocabulary: 'vocabulary', story: 'story', exercises: 'exercises', grammar: 'grammar', visual: 'visualstory' }
    // New tabs are always "present" (they show their own empty state)
    if (!map[tabId]) return true
    return !!data[map[tabId]]
  }

  return (
    <div className="chapter-view">
      <div className={`tab-bar-wrapper ${navHidden ? 'tab-bar-wrapper--hidden' : ''}`}>
        <nav className="tab-bar" role="tablist">
          {TAB_CONFIG.map(tab => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={activeTab === tab.id}
              className={`tab-btn ${activeTab === tab.id ? 'tab-btn--active' : ''} ${!hasData(tab.id) && !loading ? 'tab-btn--empty' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span className="tab-emoji">{tab.emoji}</span>
              <span className="tab-label">{ui(tab.labelKey)}</span>
            </button>
          ))}
        </nav>
      </div>

      {onPartChange && (
        <div className="part-switcher">
          <button
            className={`part-switcher-btn ${activePart === 'A' ? 'part-switcher-btn--active' : ''}`}
            onClick={() => onPartChange('A')}
          >Μέρος Αʹ</button>
          <button
            className={`part-switcher-btn ${activePart === 'B' ? 'part-switcher-btn--active' : ''}`}
            onClick={() => onPartChange('B')}
          >Μέρος Βʹ</button>
        </div>
      )}

      <div className="study-nav-pill" aria-label="Page navigation">
        <button className="study-nav-btn" onClick={onBack} disabled={!canBack} aria-label="Go back" title="Go back (Alt+←)">‹</button>
        <button className="study-nav-btn" onClick={onForward} disabled={!canForward} aria-label="Go forward" title="Go forward (Alt+→)">›</button>
      </div>

      <div className="tab-content">
        {loading ? (
          <div className="loading">{ui('loading')}</div>
        ) : (
          <>
            {/* All tabs stay mounted — hidden with CSS so position is remembered when switching */}
            <div hidden={activeTab !== 'story'}>
              <StoryTab key={key} story={data.story} vocabulary={data.vocabulary} allVocabulary={allVocabulary} activePart={activePart} />
            </div>
            <div hidden={activeTab !== 'vocabulary'}>
              <VocabularyTab key={key} words={data.vocabulary} activePart={activePart} unitId={unitId} chapterId={chapterId} onOpenLexicon={onOpenLexicon} />
            </div>
            <div hidden={activeTab !== 'grammar'}>
              <GrammarTab key={key} grammar={data.grammar} words={data.vocabulary} activePart={activePart} />
            </div>
            <div hidden={activeTab !== 'exercises'}>
              <ExercisesTab key={key} exercises={data.exercises} activePart={activePart} />
            </div>
            <div hidden={activeTab !== 'lexicon'} style={{ height: '100%' }}>
              <VocabularyIndex
                key={`${key}-${activePart}`}
                target={{ chapterId, part: activePart }}
                onNavigate={(u, c, p) => onOpenLexicon?.(u, c, p)}
                onOpenGnt={onOpenGnt}
              />
            </div>
            <div hidden={activeTab !== 'visual'}>
              <VisualStoryTab key={key} story={data.visualstory} activePart={activePart} />
            </div>
            <div hidden={activeTab !== 'video'}>
              <VideoTab />
            </div>
          </>
        )}
      </div>
    </div>
  )
}

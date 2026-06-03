import { useState, useEffect, useRef } from 'react'
import './ChapterView.css'
import VocabularyTab from './tabs/VocabularyTab.jsx'
import StoryTab from './tabs/StoryTab.jsx'
import ExercisesTab from './tabs/ExercisesTab.jsx'
import GrammarTab from './tabs/GrammarTab.jsx'
import VisualStoryTab from './tabs/VisualStoryTab.jsx'

const TAB_CONFIG = [
  { id: 'story',      label: 'Story',        emoji: '📖' },
  { id: 'vocabulary', label: 'Vocabulary',   emoji: '📚' },
  { id: 'grammar',    label: 'Grammar',      emoji: '📐' },
  { id: 'exercises',  label: 'Exercises',    emoji: '✏️' },
  { id: 'visual',     label: 'Visual Story', emoji: '🎨' },
]

async function loadData(unitId, chapterId, type) {
  try {
    const mod = await import(`../data/unit${unitId}/chapter${chapterId}/${type}.json`)
    return mod.default
  } catch {
    return null
  }
}

export default function ChapterView({ unitId, chapterId, activePart }) {
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
    return !!data[map[tabId]]
  }

  return (
    <div className="chapter-view">
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
            <span className="tab-label">{tab.label}</span>
          </button>
        ))}
      </nav>

      <div className="tab-content">
        {loading ? (
          <div className="loading">Loading chapter…</div>
        ) : (
          <>
            {activeTab === 'story'      && <StoryTab story={data.story} activePart={activePart} />}
            {activeTab === 'vocabulary' && <VocabularyTab words={data.vocabulary} activePart={activePart} />}
            {activeTab === 'grammar'    && <GrammarTab grammar={data.grammar} activePart={activePart} />}
            {activeTab === 'exercises'  && <ExercisesTab exercises={data.exercises} />}
            {activeTab === 'visual'     && <VisualStoryTab story={data.visualstory} activePart={activePart} />}
          </>
        )}
      </div>
    </div>
  )
}

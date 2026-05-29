import { useState, lazy, Suspense } from 'react'
import './ChapterView.css'

const TAB_CONFIG = [
  { id: 'vocabulary', label: 'Vocabulary', emoji: '📚' },
  { id: 'story',      label: 'Story',      emoji: '📖' },
  { id: 'exercises',  label: 'Exercises',  emoji: '✏️' },
  { id: 'grammar',    label: 'Grammar',    emoji: '📐' },
  { id: 'visual',     label: 'Visual Story', emoji: '🎨' },
]

// Dynamic imports for content — only unit1/chapter1 has real data for now
async function loadData(unitId, chapterId, type) {
  try {
    const mod = await import(`../data/unit${unitId}/chapter${chapterId}/${type}.json`)
    return mod.default
  } catch {
    return null
  }
}

import VocabularyTab from './tabs/VocabularyTab.jsx'
import StoryTab from './tabs/StoryTab.jsx'
import ExercisesTab from './tabs/ExercisesTab.jsx'
import GrammarTab from './tabs/GrammarTab.jsx'
import VisualStoryTab from './tabs/VisualStoryTab.jsx'

import { useEffect, useRef } from 'react'

export default function ChapterView({ unitId, chapterId }) {
  const [activeTab, setActiveTab] = useState('vocabulary')
  const [data, setData] = useState({})
  const [loading, setLoading] = useState(true)
  const prevKey = useRef(null)
  const key = `${unitId}-${chapterId}`

  useEffect(() => {
    if (prevKey.current === key) return
    prevKey.current = key
    setActiveTab('vocabulary')
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
            {activeTab === 'vocabulary' && <VocabularyTab words={data.vocabulary} unitId={unitId} chapterId={chapterId} />}
            {activeTab === 'story'      && <StoryTab story={data.story} />}
            {activeTab === 'exercises'  && <ExercisesTab exercises={data.exercises} />}
            {activeTab === 'grammar'    && <GrammarTab grammar={data.grammar} />}
            {activeTab === 'visual'     && <VisualStoryTab story={data.visualstory} />}
          </>
        )}
      </div>
    </div>
  )
}

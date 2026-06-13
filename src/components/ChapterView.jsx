import { useState, useEffect, useRef } from 'react'
import './ChapterView.css'
import VocabularyTab from './tabs/VocabularyTab.jsx'
import StoryTab from './tabs/StoryTab.jsx'
import ExercisesTab from './tabs/ExercisesTab.jsx'
import GrammarTab from './tabs/GrammarTab.jsx'
import VisualStoryTab from './tabs/VisualStoryTab.jsx'
import BibleTranslationTab from './tabs/BibleTranslationTab.jsx'
import LinguisticsTab from './tabs/LinguisticsTab.jsx'
import ExegesisTab from './tabs/ExegesisTab.jsx'
import VideoTab from './tabs/VideoTab.jsx'
import { useUI } from '../context/LanguageContext.jsx'

const TAB_CONFIG = [
  { id: 'story',            labelKey: 'tabStory',            emoji: '📖' },
  { id: 'vocabulary',       labelKey: 'tabVocabulary',       emoji: '📚' },
  { id: 'visual',           labelKey: 'tabVisual',           emoji: '🎨' },
  { id: 'exercises',        labelKey: 'tabExercises',        emoji: '✏️' },
  { id: 'grammar',          labelKey: 'tabGrammar',          emoji: '📐' },
  { id: 'bibletranslation', labelKey: 'tabBibleTranslation', emoji: '📜' },
  { id: 'linguistics',      labelKey: 'tabLinguistics',      emoji: '🔤' },
  { id: 'exegesis',         labelKey: 'tabExegesis',         emoji: '🔍' },
  { id: 'video',            labelKey: 'tabVideo',            emoji: '🎬' },
]

async function loadData(unitId, chapterId, type) {
  try {
    const mod = await import(`../data/unit${unitId}/chapter${chapterId}/${type}.json`)
    return mod.default
  } catch {
    return null
  }
}

export default function ChapterView({ unitId, chapterId, activePart, navHidden, onToggleNav }) {
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
        <button
          className="tab-bar-toggle"
          onClick={onToggleNav}
          aria-label={navHidden ? 'Show navigation' : 'Hide navigation'}
          title={navHidden ? 'Show navigation' : 'Hide navigation'}
        >
          <span className={`tab-bar-toggle-icon ${navHidden ? 'tab-bar-toggle-icon--up' : ''}`}>‹</span>
        </button>
      </div>

      <div className="tab-content">
        {loading ? (
          <div className="loading">{ui('loading')}</div>
        ) : (
          <>
            {/* All tabs stay mounted — hidden with CSS so position is remembered when switching */}
            <div hidden={activeTab !== 'story'}>
              <StoryTab key={key} story={data.story} vocabulary={data.vocabulary} activePart={activePart} />
            </div>
            <div hidden={activeTab !== 'vocabulary'}>
              <VocabularyTab key={key} words={data.vocabulary} activePart={activePart} />
            </div>
            <div hidden={activeTab !== 'grammar'}>
              <GrammarTab key={key} grammar={data.grammar} words={data.vocabulary} activePart={activePart} />
            </div>
            <div hidden={activeTab !== 'exercises'}>
              <ExercisesTab key={key} exercises={data.exercises} activePart={activePart} />
            </div>
            <div hidden={activeTab !== 'visual'}>
              <VisualStoryTab key={key} story={data.visualstory} activePart={activePart} />
            </div>
            <div hidden={activeTab !== 'bibletranslation'}>
              <BibleTranslationTab />
            </div>
            <div hidden={activeTab !== 'linguistics'}>
              <LinguisticsTab />
            </div>
            <div hidden={activeTab !== 'exegesis'}>
              <ExegesisTab />
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

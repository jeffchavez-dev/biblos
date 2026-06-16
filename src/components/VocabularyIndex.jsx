import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useUI, useLanguage, t } from '../context/LanguageContext.jsx'
import FullscreenViewer from './FullscreenViewer.jsx'
import GreekKeyboard from './GreekKeyboard.jsx'
import './VocabularyIndex.css'

function wordImages(w) { return w.images || (w.image ? [w.image] : []) }

// All vocab sources in lesson order
const SOURCES = [
  { file: () => import('../data/unit1/chapter1/vocabulary.json'), unit: 1, chapter: 1 },
  { file: () => import('../data/unit1/chapter2/vocabulary.json'), unit: 1, chapter: 2 },
  { file: () => import('../data/unit1/chapter3/vocabulary.json'), unit: 1, chapter: 3 },
  { file: () => import('../data/unit2/chapter4/vocabulary.json'), unit: 2, chapter: 4 },
  { file: () => import('../data/unit2/chapter5/vocabulary.json'), unit: 2, chapter: 5 },
  { file: () => import('../data/unit2/chapter6/vocabulary.json'), unit: 2, chapter: 6 },
]

// Story sources — loaded lazily for context feature
const STORY_SOURCES = [
  { file: () => import('../data/unit1/chapter1/story.json'), unit: 1, chapter: 1 },
  { file: () => import('../data/unit1/chapter2/story.json'), unit: 1, chapter: 2 },
  { file: () => import('../data/unit1/chapter3/story.json'), unit: 1, chapter: 3 },
  { file: () => import('../data/unit2/chapter4/story.json'), unit: 2, chapter: 4 },
  { file: () => import('../data/unit2/chapter5/story.json'), unit: 2, chapter: 5 },
  { file: () => import('../data/unit2/chapter6/story.json'), unit: 2, chapter: 6 },
]

// Part-of-speech categories (priority order — first match wins)
const CATEGORIES = [
  { id: 'noun',        labelKey: 'catNoun',        test: p => /^noun/.test(p) },
  { id: 'verb',        labelKey: 'catVerb',        test: p => /^verb/.test(p) },
  { id: 'adjective',   labelKey: 'catAdjective',   test: p => /^adjective/.test(p) },
  { id: 'adverb',      labelKey: 'catAdverb',      test: p => /^adverb/.test(p) },
  { id: 'preposition', labelKey: 'catPreposition', test: p => /^preposition/.test(p) },
  { id: 'conjunction', labelKey: 'catConjunction', test: p => /conjunction/.test(p) },
  { id: 'pronoun',     labelKey: 'catPronoun',     test: p => /^pronoun/.test(p) },
  { id: 'particle',    labelKey: 'catParticle',    test: p => /^particle/.test(p) },
  { id: 'other',       labelKey: 'catOther',       test: () => true },
]

// Verb sub-groups shown as a separate filter section
const VERB_GROUPS = [
  {
    id: 'verb-epsilon',
    label: 'ε-contract (-έω)',
    labelShort: '-έω verbs',
    test: p => /verb.*-έω/.test(p) || /verb.*contract.*-εω/.test(p.toLowerCase()),
    pattern: [
      { from: 'ε + ει',  to: 'εῖ',  example: 'θεωρέω → θεωρεῖ' },
      { from: 'ε + ο',   to: 'ου',  example: 'θεωρέω → θεωροῦμεν' },
      { from: 'ε + ου',  to: 'οῦ',  example: 'θεωρέω → θεωροῦ' },
      { from: 'ε + ε',   to: 'εῖ',  example: 'ζητέω → ζητεῖ' },
    ],
    tip: 'When the stem ends in ε and the ending begins with ε or ο, they merge into a long vowel or diphthong.',
  },
  {
    id: 'verb-alpha',
    label: 'α-contract (-άω)',
    labelShort: '-άω verbs',
    test: p => /verb.*-άω/.test(p) || /verb.*contract.*-αω/.test(p.toLowerCase()),
    pattern: [
      { from: 'α + ει',  to: 'ᾷ',   example: 'ἀγαπάω → ἀγαπᾷ' },
      { from: 'α + ε',   to: 'ᾷ',   example: 'ἀγαπάω → ἀγαπᾷ' },
      { from: 'α + ο',   to: 'ῶ',   example: 'ἀγαπάω → ἀγαπῶ' },
      { from: 'α + ου',  to: 'ῶ',   example: 'ἀγαπάω → ἀγαπῶ' },
    ],
    tip: 'An α stem before any ο/ω sound gives ω; before ε/ει/η gives ᾳ (with iota subscript). The α always dominates!',
  },
  {
    id: 'verb-deponent',
    label: 'Deponent verbs',
    labelShort: 'Deponent',
    test: p => /deponent/i.test(p),
    pattern: null,
    tip: 'Deponent verbs appear only in middle/passive forms but carry active meaning. Present endings: -ομαι, -ῃ/-ει, -εται / -όμεθα, -εσθε, -ονται.',
  },
  {
    id: 'verb-mi',
    label: 'μι-verbs',
    labelShort: 'μι-verbs',
    test: p => /μι/.test(p),
    pattern: null,
    tip: 'μι-verbs use -μι (not -ω) for the 1st person singular and show vowel gradation in the stem: e.g. δίδω-μι / δίδο-μεν. Includes δίδωμι, τίθημι, ἵστημι.',
  },
]

// Noun sub-groups shown as filter below Noun category
const NOUN_GROUPS = [
  { id: 'noun-1st', label: '1st Declension', tip: '1st declension nouns typically have -η or -α nominative singular (feminine) or -ης/-ας (masculine). Genitive singular ends in -ης or -ας.' },
  { id: 'noun-2nd', label: '2nd Declension', tip: '2nd declension nouns have -ος (masc./fem.) or -ον (neut.) nominative singular. Genitive singular ends in -ου.' },
  { id: 'noun-3rd', label: '3rd Declension', tip: '3rd declension nouns have varied endings. The stem is found from the genitive singular. Includes many important NT words.' },
]

function getNounGroup(partOfSpeech = '') {
  const pos = partOfSpeech.toLowerCase()
  if (/1st decl/.test(pos)) return 'noun-1st'
  if (/2nd decl/.test(pos)) return 'noun-2nd'
  if (/3rd decl/.test(pos)) return 'noun-3rd'
  return null
}

function getCategory(partOfSpeech = '') {
  const pos = partOfSpeech.toLowerCase()
  for (const cat of CATEGORIES) {
    if (cat.test(pos)) return cat.id
  }
  return 'other'
}

function getVerbGroup(partOfSpeech = '') {
  const pos = partOfSpeech
  for (const g of VERB_GROUPS) {
    if (g.test(pos)) return g.id
  }
  return null
}

function sourceLabel(chapter, part) {
  return `${chapter}.${part === 'A' ? 1 : 2}`
}

// Strip Greek diacritics for accent-insensitive matching
function stripAccents(str) {
  return str.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

function matches(word, query) {
  if (!query.trim()) return true
  const q = query.trim()
  const qStripped = stripAccents(q)
  if (stripAccents(word.greek).includes(qStripped)) return true
  if (word.definition.toLowerCase().includes(q.toLowerCase())) return true
  if (word.transliteration?.toLowerCase().includes(q.toLowerCase())) return true
  return false
}

// ── Context helpers ────────────────────────────────────────────────────────────

function getStem(greekField) {
  // Take first token before any comma/space/dash, strip accents
  const lemma = greekField.split(/[,\s\-–—]/)[0].trim()
  let s = stripAccents(lemma)
  // Strip verb -ω ending so ἄγω → αγ, ὑπάγω → υπαγ, but only if stem ≥ 3 chars
  if (s.endsWith('ω') && s.length > 3) s = s.slice(0, -1)
  return s.slice(0, 4)
}

// Returns true if a story word (stripped) matches a vocab lemma stem
function stemMatches(storyWordStripped, lemmaStripped) {
  // Exact or prefix match on first 4 chars of stem (only reliable when stem ≥ 4 chars)
  const stem = lemmaStripped.slice(0, 4)
  if (stem.length >= 4 && storyWordStripped.startsWith(stem)) return true
  // For the exact lemma form (e.g., lexical form appears in story)
  if (storyWordStripped === lemmaStripped) return true
  return false
}

// Extract the primary matchable English root from a vocab definition
// e.g., "I lead, bring" → "lead"; "I go away" → "go"
function defKeyword(definition) {
  const words = definition.toLowerCase().replace(/[,;()]/g, ' ').split(/\s+/)
  const skip = new Set(['i', 'a', 'an', 'the', 'to', 'not', 'be', 'am', 'is', 'are'])
  return words.find(w => w.length >= 3 && !skip.has(w)) || ''
}

function extractSentences(words) {
  // Split paragraph words into sentences at . · ; boundaries
  const sentences = []
  let buf = []
  for (const w of words) {
    buf.push(w)
    if (/[.·;]$/.test(w.greek.replace(/["'"»]/g, ''))) {
      sentences.push(buf)
      buf = []
    }
  }
  if (buf.length > 0) sentences.push(buf)
  return sentences
}

function findContexts(vocabWord, storyData) {
  if (!storyData) return []
  const stem = getStem(vocabWord.greek)
  if (stem.length < 2) return []

  const results = []

  for (const { data, unit, chapter } of storyData) {
    const paragraphs = data.paragraphs || []
    for (const para of paragraphs) {
      const words = para.words || []
      const part = para.label?.includes('Βʹ') ? 'B' : 'A'
      const sentences = extractSentences(words)
      for (const sent of sentences) {
        const lemmaStripped = stripAccents(vocabWord.greek.split(/[,\s\-–—]/)[0].trim())
        const keyword = defKeyword(vocabWord.definition)
        const hit = sent.find(w => {
          const ws = stripAccents(w.greek)
          if (stemMatches(ws, lemmaStripped)) return true
          // For short-stem verbs: match via story word definition containing vocab keyword
          if (keyword && w.definition && w.definition.toLowerCase().includes(keyword)) return true
          return false
        })
        if (hit) {
          const greek = sent.map(w => w.greek).join(' ')
          // avoid duplicate sentences
          if (!results.find(r => r.greek === greek)) {
            results.push({
              greek,
              matchStem: stem,
              unit,
              chapter,
              part,
              source: sourceLabel(chapter, part),
            })
          }
          if (results.length >= 3) break
        }
      }
      if (results.length >= 3) break
    }
    if (results.length >= 3) break
  }
  return results
}

// ── ContextPanel component ─────────────────────────────────────────────────────

function ContextPanel({ word, stories, storiesLoading, onNavigate }) {
  const matches = stories ? findContexts(word, stories) : []
  const lemmaStripped = stripAccents(word.greek.split(/[,\s\-–—]/)[0].trim())

  if (storiesLoading) {
    return <div className="ctx-panel ctx-loading">Loading story examples…</div>
  }
  if (!stories) return null
  if (matches.length === 0) {
    return <div className="ctx-panel ctx-empty">No story examples found yet for this word.</div>
  }

  return (
    <div className="ctx-panel">
      {matches.map((m, i) => (
        <div key={i} className="ctx-item">
          <div className="ctx-greek greek">
            <CtxHighlight text={m.greek} lemmaStripped={lemmaStripped} keyword={defKeyword(word.definition)} />
          </div>
          <button
            className="ctx-source-btn"
            onClick={() => onNavigate(m.unit, m.chapter, m.part)}
            title={`Go to Chapter ${m.chapter}, Part ${m.part}`}
          >
            → {m.source}
          </button>
        </div>
      ))}
    </div>
  )
}

function CtxHighlight({ text, lemmaStripped, keyword }) {
  // Highlight words that match the lemma stem
  // For short-stem verbs we can't do definition-lookup here, so use a loose stem
  const shortStem = (lemmaStripped.endsWith('ω') && lemmaStripped.length <= 4)
    ? lemmaStripped.slice(0, -1) : null
  const tokens = text.split(/(\s+)/)
  return (
    <>
      {tokens.map((tok, i) => {
        if (/^\s+$/.test(tok)) return tok
        const ws = stripAccents(tok)
        const isMatch = stemMatches(ws, lemmaStripped)
          || (shortStem && shortStem.length >= 2 && ws.startsWith(shortStem) && ws.length > shortStem.length)
        return isMatch
          ? <mark key={i} className="ctx-word-highlight">{tok}</mark>
          : <span key={i}>{tok}</span>
      })}
    </>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function VocabularyIndex({ onNavigate, target }) {
  const ui = useUI()
  const { lang } = useLanguage()
  const [words, setWords] = useState([])
  const [sort, setSort] = useState('lesson')
  const [query, setQuery] = useState('')
  const [activeCats, setActiveCats] = useState(new Set())
  const [activeVerbGroup, setActiveVerbGroup] = useState(null)
  const [activeNounGroup, setActiveNounGroup] = useState(null)
  const [targetFilter, setTargetFilter] = useState(target || null)
  const [loading, setLoading] = useState(true)
  const [fsWord, setFsWord] = useState(null)

  // Context feature state
  const [openCtx, setOpenCtx] = useState(null)
  const [stories, setStories] = useState(null)
  const [storiesLoading, setStoriesLoading] = useState(false)
  const storiesRef = useRef(null)

  // Display toggle state
  const [hideGloss, setHideGloss] = useState(false)
  const [openParadigm, setOpenParadigm] = useState(null)
  const [showKeyboard, setShowKeyboard] = useState(false)

  // Search history
  const [searchHistory, setSearchHistory] = useState(() => {
    try { return JSON.parse(localStorage.getItem('lexicon-search-history') || '[]') } catch { return [] }
  })
  const [showHistory, setShowHistory] = useState(false)

  const searchRef = useRef(null)

  useEffect(() => {
    Promise.all(SOURCES.map(s => s.file().then(m => ({ data: m.default, unit: s.unit, chapter: s.chapter }))))
      .then(results => {
        const all = results.flatMap(({ data, unit, chapter }) =>
          data.map(w => ({
            ...w,
            unit,
            chapter,
            source: sourceLabel(chapter, w.part),
            lessonOrder: chapter * 10 + (w.part === 'A' ? 1 : 2),
            category: getCategory(w.partOfSpeech),
            verbGroup: getVerbGroup(w.partOfSpeech || ''),
            nounGroup: getNounGroup(w.partOfSpeech || ''),
          }))
        )
        setWords(all)
        setLoading(false)
      })
  }, [])

  useEffect(() => {
    if (!loading) searchRef.current?.focus()
  }, [loading])

  const loadStories = useCallback(async () => {
    if (storiesRef.current || storiesLoading) return
    setStoriesLoading(true)
    try {
      const results = await Promise.all(
        STORY_SOURCES.map(s => s.file().then(m => ({ data: m.default, unit: s.unit, chapter: s.chapter })))
      )
      storiesRef.current = results
      setStories(results)
    } finally {
      setStoriesLoading(false)
    }
  }, [storiesLoading])

  function handleCtxClick(w) {
    if (openCtx === w._key) {
      setOpenCtx(null)
      return
    }
    setOpenCtx(w._key)
    if (!storiesRef.current && !storiesLoading) loadStories()
  }

  function toggleParadigm(key) {
    setOpenParadigm(prev => prev === key ? null : key)
  }

  function toggleCat(id) {
    setActiveCats(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
    setActiveVerbGroup(null)
  }

  function selectVerbGroup(id) {
    setActiveVerbGroup(prev => prev === id ? null : id)
    setActiveNounGroup(null)
    setActiveCats(new Set())
  }

  function selectNounGroup(id) {
    setActiveNounGroup(prev => prev === id ? null : id)
    setActiveVerbGroup(null)
    setActiveCats(new Set())
  }

  const selectValue = activeVerbGroup || activeNounGroup || (activeCats.size === 1 ? [...activeCats][0] : '')

  function handleFilterChange(e) {
    const val = e.target.value
    if (VERB_GROUPS.find(g => g.id === val)) {
      selectVerbGroup(val)
    } else if (NOUN_GROUPS.find(g => g.id === val)) {
      selectNounGroup(val)
    } else if (val) {
      setActiveCats(new Set([val]))
      setActiveVerbGroup(null)
      setActiveNounGroup(null)
    } else {
      setActiveCats(new Set())
      setActiveVerbGroup(null)
      setActiveNounGroup(null)
    }
  }

  const catCounts = {}
  for (const cat of CATEGORIES) {
    catCounts[cat.id] = words.filter(w => w.category === cat.id).length
  }
  const verbGroupCounts = {}
  for (const g of VERB_GROUPS) {
    verbGroupCounts[g.id] = words.filter(w => w.verbGroup === g.id).length
  }
  const nounGroupCounts = {}
  for (const g of NOUN_GROUPS) {
    nounGroupCounts[g.id] = words.filter(w => w.nounGroup === g.id).length
  }

  const sorted = [...words].sort((a, b) =>
    sort === 'alpha'
      ? a.greek.localeCompare(b.greek, 'el')
      : a.lessonOrder - b.lessonOrder || a.id - b.id
  )

  const filtered = sorted
    .filter(w => {
      if (targetFilter) return w.chapter === targetFilter.chapterId && w.part === targetFilter.part && matches(w, query)
      if (activeVerbGroup) return w.verbGroup === activeVerbGroup && matches(w, query)
      if (activeNounGroup) return w.nounGroup === activeNounGroup && matches(w, query)
      return (activeCats.size === 0 || activeCats.has(w.category)) && matches(w, query)
    })
    .map(w => ({ ...w, _key: `${w.chapter}-${w.id}` }))

  const total = words.length
  const isFiltered = query.trim().length > 0 || activeCats.size > 0 || !!activeVerbGroup || !!activeNounGroup || !!targetFilter
  const activeGroup = VERB_GROUPS.find(g => g.id === activeVerbGroup)
  // Column count for colSpan on ctx rows
  const colCount = 5 + (activeGroup ? 1 : 0) + 1 // base + 3sg + ctx

  return (
    <div className="vocab-index">
      {fsWord && (
        <FullscreenViewer
          images={wordImages(fsWord).map(img => `/vocab-images/${img}`)}
          captions={[{ greek: fsWord.thirdSingular ?? fsWord.greek, lexical: fsWord.thirdSingular ? fsWord.greek : null }]}
          index={0}
          onClose={() => setFsWord(null)}
          onPrev={() => {}}
          onNext={() => {}}
        />
      )}
      <div className="vocab-index-header">
        <div className="vocab-index-title-row">
          <h2 className="greek">Λεξικόν</h2>
          <span className="vocab-index-count">{total} {ui('words')}</span>
        </div>
        <p className="vocab-index-subtitle">{ui('vocabSubtitle')}</p>

        {/* Search row */}
        <div className="vocab-search-row">
          <div className="vocab-search-box" style={{ position: 'relative' }}>
            <span className="vocab-search-icon">🔍</span>
            <input
              ref={searchRef}
              className="vocab-search-input"
              type="text"
              placeholder={ui('searchPlaceholder')}
              value={query}
              onChange={e => setQuery(e.target.value)}
              onFocus={() => setShowHistory(true)}
              onBlur={() => setTimeout(() => setShowHistory(false), 150)}
              onKeyDown={e => {
                if (e.key === 'Enter' && query.trim()) {
                  const h = [query.trim(), ...searchHistory.filter(s => s !== query.trim())].slice(0, 8)
                  setSearchHistory(h)
                  localStorage.setItem('lexicon-search-history', JSON.stringify(h))
                  setShowHistory(false)
                }
              }}
              spellCheck={false}
              autoComplete="off"
            />
            {query && (
              <button
                className="vocab-search-clear"
                onClick={() => { setQuery(''); searchRef.current?.focus() }}
                aria-label="Clear"
              >✕</button>
            )}
            {showHistory && !query && searchHistory.length > 0 && (
              <div className="search-history-dropdown">
                <div className="search-history-label">Recent searches</div>
                {searchHistory.map((h, i) => (
                  <button key={i} className="search-history-item" onMouseDown={() => { setQuery(h); setShowHistory(false) }}>
                    <span className="search-history-icon">🕐</span>
                    <span className="greek">{h}</span>
                  </button>
                ))}
                <button className="search-history-clear" onMouseDown={() => { setSearchHistory([]); localStorage.removeItem('lexicon-search-history') }}>
                  Clear history
                </button>
              </div>
            )}
          </div>
          <button
            className={`gk-toggle-btn${showKeyboard ? ' gk-toggle-btn--active' : ''}`}
            onClick={() => setShowKeyboard(v => !v)}
            title="Greek keyboard"
            aria-label="Toggle Greek keyboard"
          >αβ</button>
        </div>
        {showKeyboard && (
          <GreekKeyboard
            onKey={ch => {
              if (ch === '⌫') {
                setQuery(q => [...q].slice(0, -1).join(''))
              } else {
                setQuery(q => q + ch)
              }
              searchRef.current?.focus()
            }}
          />
        )}

        {/* Filter · Sort · Gloss — single toolbar row */}
        <div className="vocab-toolbar-row">
          <div className="filter-select-wrap">
            <span className="filter-select-icon">▾</span>
            <select
              className="filter-select"
              value={selectValue}
              onChange={handleFilterChange}
              aria-label="Filter by part of speech"
            >
              <option value="">All parts of speech</option>
              {CATEGORIES.filter(c => catCounts[c.id] > 0).map(cat => (
                <React.Fragment key={cat.id}>
                  <option value={cat.id}>
                    {ui(cat.labelKey)} ({catCounts[cat.id]})
                  </option>
                  {cat.id === 'noun' && NOUN_GROUPS.filter(g => nounGroupCounts[g.id] > 0).map(g => (
                    <option key={g.id} value={g.id}>
                      ↳ {g.label} ({nounGroupCounts[g.id]})
                    </option>
                  ))}
                  {cat.id === 'verb' && VERB_GROUPS.filter(g => verbGroupCounts[g.id] > 0).map(g => (
                    <option key={g.id} value={g.id}>
                      ↳ {g.label} ({verbGroupCounts[g.id]})
                    </option>
                  ))}
                </React.Fragment>
              ))}
            </select>
          </div>
          {(activeCats.size > 0 || activeVerbGroup || activeNounGroup) && (
            <button className="filter-clear-btn" onClick={() => { setActiveCats(new Set()); setActiveVerbGroup(null); setActiveNounGroup(null) }}>
              ✕
            </button>
          )}
          <div className="toolbar-divider" />
          <div className="vocab-index-sort">
            <button className={`sort-btn ${sort === 'lesson' ? 'sort-btn--active' : ''}`} onClick={() => setSort('lesson')}>{ui('byLesson')}</button>
            <button className={`sort-btn ${sort === 'alpha' ? 'sort-btn--active' : ''}`} onClick={() => setSort('alpha')}>{ui('alphabetical')}</button>
          </div>
          <div className="toolbar-divider" />
          <button
            className={`display-toggle-btn ${hideGloss ? 'display-toggle-btn--active' : ''}`}
            onClick={() => setHideGloss(v => !v)}
            title={hideGloss ? 'Show translation' : 'Hide translation'}
          >
            {hideGloss ? '👁 Show gloss' : '🙈 Hide gloss'}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="vocab-index-loading">{ui('loading')}</div>
      ) : filtered.length === 0 ? (
        <div className="vocab-index-empty">
          {ui('noWordsMatch')}
        </div>
      ) : (
        <>
          {/* Lesson target banner */}
          {targetFilter && (
            <div className="lexicon-target-banner">
              <span>
                Showing vocabulary for lesson <strong>{targetFilter.chapterId}.{targetFilter.part === 'A' ? '1' : '2'}</strong>
                {' '}· {filtered.length} {filtered.length === 1 ? 'word' : 'words'}
              </span>
              <button className="lexicon-target-clear" onClick={() => setTargetFilter(null)}>
                View all →
              </button>
            </div>
          )}

          {isFiltered && !targetFilter && (
            <p className="vocab-index-result-count">{filtered.length} of {total} {ui('words')}</p>
          )}

          {/* Contract verb pattern banner */}
          {activeGroup && (
            <div className={`contract-banner contract-banner--${activeGroup.id.replace('verb-','')}`}>
              <div className="contract-banner-head">
                <span className="contract-banner-title greek">{activeGroup.label}</span>
                <span className="contract-banner-tip">{activeGroup.tip}</span>
              </div>
              {activeGroup.pattern && (
                <div className="contract-pattern-row">
                  {activeGroup.pattern.map((p, i) => (
                    <div key={i} className="contract-pattern-cell">
                      <span className="cp-from greek">{p.from}</span>
                      <span className="cp-arrow">→</span>
                      <span className="cp-to greek">{p.to}</span>
                      <span className="cp-example greek">{p.example}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Hide-gloss notice */}
          {hideGloss && (
            <div className="gloss-hidden-notice">
              Translation hidden — try to recall each meaning from the image or Greek form.
              <button className="gloss-show-btn" onClick={() => setHideGloss(false)}>Show</button>
            </div>
          )}

          <table className="vocab-table">
            <thead>
              <tr>
                <th className="vt-ctx"></th>
                <th className="vt-img-col"></th>
                <th className="vt-greek">{ui('colGreek')}</th>
                {activeGroup && <th className="vt-3sg">3sg</th>}
                <th className="vt-english">{hideGloss ? '' : ui('colEnglish')}</th>
                <th className="vt-pos">{ui('colType')}</th>
                <th className="vt-source">{ui('colLesson')}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((w, i) => {
                const ctxOpen = openCtx === w._key
                return (
                  <React.Fragment key={w._key}>
                    <tr className={i % 2 === 0 ? 'vt-row-even' : ''}>
                      <td className="vt-ctx">
                        <button
                          className={`ctx-btn${ctxOpen ? ' ctx-btn--active' : ''}`}
                          onClick={() => handleCtxClick(w)}
                          title="Show in story context"
                        >❝</button>
                        <button
                          className={`para-btn${openParadigm === w._key ? ' para-btn--active' : ''}${!buildParadigm(w) ? ' para-btn--disabled' : ''}`}
                          onClick={() => buildParadigm(w) && toggleParadigm(w._key)}
                          title="Show paradigm table"
                          disabled={!buildParadigm(w)}
                        >Ω</button>
                      </td>
                      <td className="vt-img-col">
                        {wordImages(w).length > 0 && (
                          <button className="vt-thumb-btn" onClick={() => setFsWord(w)} aria-label="View image">
                            <img className="vt-thumb" src={`/vocab-images/${wordImages(w)[0]}`} alt="" />
                          </button>
                        )}
                      </td>
                      <td className="vt-greek greek">
                        <Highlight text={w.greek} query={query} isGreek />
                      </td>
                      {activeGroup && (
                        <td className="vt-3sg greek">
                          {w.thirdSingular
                            ? <span className="vt-3sg-form">{w.thirdSingular}</span>
                            : <span className="vt-3sg-missing">—</span>}
                        </td>
                      )}
                      <td className="vt-english">
                        {hideGloss
                          ? <span className="gloss-hidden-cell" onClick={() => setHideGloss(false)} title="Click to reveal">•••</span>
                          : <Highlight text={t(w.definition, w.translations, lang)} query={query} />
                        }
                      </td>
                      <td className="vt-pos">
                        <span className={`pos-tag pos-tag--${w.category}`}>
                          {ui(CATEGORIES.find(c => c.id === w.category)?.labelKey)}
                        </span>
                      </td>
                      <td className="vt-source">
                        <button
                          className="vt-source-btn"
                          onClick={() => onNavigate(w.unit, w.chapter, w.part)}
                          title={`Go to Chapter ${w.chapter}, Part ${w.part}`}
                        >
                          {w.source}
                        </button>
                      </td>
                    </tr>
                    {ctxOpen && (
                      <tr className="ctx-row">
                        <td colSpan={colCount}>
                          <ContextPanel
                            word={w}
                            stories={stories}
                            storiesLoading={storiesLoading}
                            onNavigate={onNavigate}
                          />
                        </td>
                      </tr>
                    )}
                    {openParadigm === w._key && (
                      <tr className="para-row">
                        <td colSpan={colCount}>
                          <ParadigmPanel paradigm={buildParadigm(w)} />
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                )
              })}
            </tbody>
          </table>
        </>
      )}
    </div>
  )
}

// ── Paradigm builder ──────────────────────────────────────────────────────────

function buildParadigm(word) {
  const pos = (word.partOfSpeech || '').toLowerCase()
  const lemma = word.greek.split(/[,\s]/)[0].trim()
  const s = stripAccents(lemma)

  if (/^noun/.test(pos)) {
    const is2nd = pos.includes('2nd decl')
    const is1st = pos.includes('1st decl')
    const is3rd = pos.includes('3rd decl')
    const isNeut = pos.includes('neut')

    if (is2nd && isNeut && s.endsWith('ον')) {
      const stem = lemma.slice(0, -2)
      return { title: '2nd Declension — Neuter', stem: stem + '-', type: '2col',
        headers: ['CASE', 'SINGULAR', 'PLURAL'],
        rows: [['NOM.', '-ον', '-α'], ['ACC.', '-ον', '-α'], ['GEN.', '-ου', '-ων'], ['DAT.', '-ῳ', '-οις']],
        articles: [['τό', 'τά'], ['τό', 'τά'], ['τοῦ', 'τῶν'], ['τῷ', 'τοῖς']],
      }
    }
    if (is2nd && s.endsWith('ος')) {
      const stem = lemma.slice(0, -2)
      return { title: '2nd Declension — Masculine', stem: stem + '-', type: '2col',
        headers: ['CASE', 'SINGULAR', 'PLURAL'],
        rows: [['NOM.', '-ος', '-οι'], ['ACC.', '-ον', '-ους'], ['GEN.', '-ου', '-ων'], ['DAT.', '-ῳ', '-οις']],
        articles: [['ὁ', 'οἱ'], ['τόν', 'τούς'], ['τοῦ', 'τῶν'], ['τῷ', 'τοῖς']],
      }
    }
    if (is1st && s.endsWith('η')) {
      const stem = lemma.slice(0, -1)
      return { title: '1st Declension — Feminine (η-stem)', stem: stem + '-', type: '2col',
        headers: ['CASE', 'SINGULAR', 'PLURAL'],
        rows: [['NOM.', '-η', '-αι'], ['ACC.', '-ην', '-ας'], ['GEN.', '-ης', '-ων'], ['DAT.', '-ῃ', '-αις']],
        articles: [['ἡ', 'αἱ'], ['τήν', 'τάς'], ['τῆς', 'τῶν'], ['τῇ', 'ταῖς']],
      }
    }
    if (is1st && s.endsWith('α')) {
      const stem = lemma.slice(0, -1)
      return { title: '1st Declension — Feminine (α-stem)', stem: stem + '-', type: '2col',
        headers: ['CASE', 'SINGULAR', 'PLURAL'],
        rows: [['NOM.', '-α', '-αι'], ['ACC.', '-αν', '-ας'], ['GEN.', '-ας', '-ων'], ['DAT.', '-ᾳ', '-αις']],
        articles: [['ἡ', 'αἱ'], ['τήν', 'τάς'], ['τῆς', 'τῶν'], ['τῇ', 'ταῖς']],
      }
    }
    if (is3rd) {
      const parts = word.greek.split(/,\s*/)
      const gen = parts[1]?.trim() || '—'
      return { title: '3rd Declension', type: '3rd', nom: lemma, gen,
        note: 'Stem from genitive. See grammar for full paradigm.' }
    }
  }

  if (/^verb/.test(pos)) {
    if (pos.includes('-έω') || s.endsWith('εω')) {
      const stem = lemma.slice(0, -2)
      return { type: 'verb-full', title: 'Present Active — ε-contract (-έω)', stem: stem + '-',
        indicative:  [['1ST', stem+'ῶ',  stem+'οῦμεν'], ['2ND', stem+'εῖς', stem+'εῖτε'], ['3RD', stem+'εῖ',  stem+'οῦσι(ν)']],
        subjunctive: [['1ST', stem+'ῶ',  stem+'ῶμεν'],  ['2ND', stem+'ῇς',  stem+'ῆτε'],  ['3RD', stem+'ῇ',   stem+'ῶσι(ν)']],
        imperative:  [['2ND', stem+'εῖ', stem+'εῖτε'],  ['3RD', stem+'είτω',stem+'είτωσαν']],
        infinitive: stem + 'εῖν',
        participle: { masc: stem+'ῶν', fem: stem+'οῦσα', neut: stem+'οῦν' },
      }
    }
    if (pos.includes('-άω') || s.endsWith('αω')) {
      const stem = lemma.slice(0, -2)
      return { type: 'verb-full', title: 'Present Active — α-contract (-άω)', stem: stem + '-',
        indicative:  [['1ST', stem+'ῶ',  stem+'ῶμεν'], ['2ND', stem+'ᾷς', stem+'ᾶτε'], ['3RD', stem+'ᾷ',  stem+'ῶσι(ν)']],
        subjunctive: [['1ST', stem+'ῶ',  stem+'ῶμεν'], ['2ND', stem+'ᾷς', stem+'ᾶτε'], ['3RD', stem+'ᾷ',  stem+'ῶσι(ν)']],
        imperative:  [['2ND', stem+'α',  stem+'ᾶτε'],  ['3RD', stem+'άτω',stem+'άτωσαν']],
        infinitive: stem + 'ᾶν',
        participle: { masc: stem+'ῶν', fem: stem+'ῶσα', neut: stem+'ῶν' },
        note: 'Present subjunctive forms are identical to indicative in α-contract verbs.',
      }
    }
    if (s.endsWith('ομαι')) {
      const stem = lemma.slice(0, -4)
      const isIrreg = /ἔρχ|γίν|δύν/.test(stem)
      return { type: 'verb-full', title: 'Present Middle — deponent (-ομαι)', stem: stem + '-',
        indicative:  [['1ST', stem+'ομαι', stem+'όμεθα'], ['2ND', stem+'ῃ',    stem+'εσθε'], ['3RD', stem+'εται',  stem+'ονται']],
        subjunctive: [['1ST', stem+'ωμαι', stem+'ώμεθα'], ['2ND', stem+'ῃ',    stem+'ησθε'], ['3RD', stem+'ηται',  stem+'ωνται']],
        imperative:  [['2ND', stem+'ου',   stem+'εσθε'],  ['3RD', stem+'έσθω', stem+'έσθωσαν']],
        infinitive: stem + 'εσθαι',
        participle: { masc: stem+'όμενος', fem: stem+'ομένη', neut: stem+'όμενον' },
        note: isIrreg ? 'Some forms of this verb are irregular — consult a full lexicon.' : null,
      }
    }
    if (s.endsWith('ω')) {
      const stem = lemma.slice(0, -1)
      return { type: 'verb-full', title: 'Present Active — regular -ω', stem: stem + '-',
        indicative:  [['1ST', stem+'ω',  stem+'ομεν'],     ['2ND', stem+'εις', stem+'ετε'],     ['3RD', stem+'ει',  stem+'ουσι(ν)']],
        subjunctive: [['1ST', stem+'ω',  stem+'ωμεν'],     ['2ND', stem+'ῃς',  stem+'ητε'],     ['3RD', stem+'ῃ',   stem+'ωσι(ν)']],
        imperative:  [['2ND', stem+'ε',  stem+'ετε'],      ['3RD', stem+'έτω', stem+'έτωσαν']],
        infinitive: stem + 'ειν',
        participle: { masc: stem+'ων', fem: stem+'ουσα', neut: stem+'ον' },
        note: '1st SG indicative and subjunctive are identical in form (both ' + stem + 'ω).',
      }
    }
  }

  if (/^adjective/.test(pos) && s.endsWith('ος')) {
    const stem = lemma.slice(0, -2)
    return { title: 'Adjective — 2–1–2 Declension', stem: stem + '-', type: '3col',
      headers: ['CASE', 'MASC.', 'FEM.', 'NEUT.'],
      rows: [
        ['NOM. SG.', '-ος', '-η / -α', '-ον'],
        ['ACC. SG.', '-ον', '-ην / -αν', '-ον'],
        ['GEN. SG.', '-ου', '-ης / -ας', '-ου'],
        ['DAT. SG.', '-ῳ', '-ῃ / -ᾳ', '-ῳ'],
        ['NOM. PL.', '-οι', '-αι', '-α'],
        ['ACC. PL.', '-ους', '-ας', '-α'],
        ['GEN. PL.', '-ων', '-ων', '-ων'],
        ['DAT. PL.', '-οις', '-αις', '-οις'],
      ]
    }
  }

  return null
}

function VerbMiniTable({ rows }) {
  return (
    <table className="para-table para-verb-mini">
      <thead>
        <tr><th></th><th>SG</th><th>PL</th></tr>
      </thead>
      <tbody>
        {rows.map((row, ri) => (
          <tr key={ri} className={ri % 2 === 0 ? 'para-row-even' : ''}>
            <td className="para-case-td">{row[0]}</td>
            <td className="para-form-td greek">{row[1]}</td>
            <td className="para-form-td greek">{row[2]}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function ParadigmPanel({ paradigm }) {
  if (!paradigm) return null

  if (paradigm.type === '3rd') {
    return (
      <div className="para-panel">
        <div className="para-header-row">
          <span className="para-title">{paradigm.title}</span>
        </div>
        <div className="para-3rd-row">
          <span className="para-3rd-cell"><span className="para-case-label">NOM.</span><span className="greek">{paradigm.nom}</span></span>
          <span className="para-3rd-cell"><span className="para-case-label">GEN.</span><span className="greek">{paradigm.gen}</span></span>
        </div>
        {paradigm.note && <div className="para-note">{paradigm.note}</div>}
      </div>
    )
  }

  if (paradigm.type === 'verb-full') {
    return (
      <div className="para-panel para-panel--verb">
        <div className="para-header-row">
          <span className="para-title">{paradigm.title}</span>
          {paradigm.stem && <span className="para-stem-label greek">stem: <strong>{paradigm.stem}</strong></span>}
        </div>
        <div className="para-verb-grid">
          <div className="para-verb-col">
            <div className="para-section-label">INDICATIVE</div>
            <VerbMiniTable rows={paradigm.indicative} />
          </div>
          <div className="para-verb-col">
            <div className="para-section-label">SUBJUNCTIVE</div>
            <VerbMiniTable rows={paradigm.subjunctive} />
          </div>
          <div className="para-verb-col">
            <div className="para-section-label">IMPERATIVE</div>
            <VerbMiniTable rows={paradigm.imperative} />
          </div>
        </div>
        <div className="para-verb-bottom">
          <div className="para-verb-inf-part">
            <span className="para-section-label">INFINITIVE</span>
            <span className="greek para-inf-form">{paradigm.infinitive}</span>
          </div>
          <div className="para-verb-inf-part">
            <span className="para-section-label">PARTICIPLE (NOM. SG.)</span>
            <span className="greek para-part-forms">
              <span><span className="para-part-label">M.</span>{paradigm.participle.masc}</span>
              <span><span className="para-part-label">F.</span>{paradigm.participle.fem}</span>
              <span><span className="para-part-label">N.</span>{paradigm.participle.neut}</span>
            </span>
          </div>
        </div>
        {paradigm.note && <div className="para-note">{paradigm.note}</div>}
      </div>
    )
  }

  const is3col = paradigm.type === '3col'

  return (
    <div className="para-panel">
      <div className="para-header-row">
        <span className="para-title">{paradigm.title}</span>
        {paradigm.stem && <span className="para-stem-label greek">stem: <strong>{paradigm.stem}</strong></span>}
      </div>
      <div className="para-table-scroll">
        <table className="para-table">
          <thead>
            <tr>
              {paradigm.headers.map((h, i) => <th key={i}>{h}</th>)}
              {paradigm.articles && <th>ARTICLE</th>}
            </tr>
          </thead>
          <tbody>
            {paradigm.rows.map((row, ri) => (
              <tr key={ri} className={ri % 2 === 0 ? 'para-row-even' : ''}>
                <td className="para-case-td">{row[0]}</td>
                {row.slice(1).map((cell, ci) => (
                  <td key={ci} className="para-form-td greek">
                    <>
                      <span className="para-stem-part">{paradigm.stem?.slice(0, -1)}</span>
                      <span className="para-end-part">{cell.replace(/^-/, '')}</span>
                    </>
                  </td>
                ))}
                {paradigm.articles && (
                  <td className="para-art-td greek">{paradigm.articles[ri]?.join(' / ')}</td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}



function Highlight({ text, query, isGreek }) {
  if (!query.trim()) return text
  const needle = isGreek ? stripAccents(query.trim()) : query.trim().toLowerCase()
  const haystack = isGreek ? stripAccents(text) : text.toLowerCase()
  const idx = haystack.indexOf(needle)
  if (idx === -1) return text
  return (
    <>
      {text.slice(0, idx)}
      <mark className="vt-highlight">{text.slice(idx, idx + needle.length)}</mark>
      {text.slice(idx + needle.length)}
    </>
  )
}

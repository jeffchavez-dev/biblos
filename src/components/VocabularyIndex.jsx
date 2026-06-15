import { useState, useEffect, useRef } from 'react'
import { useUI, useLanguage, t } from '../context/LanguageContext.jsx'
import FullscreenViewer from './FullscreenViewer.jsx'
import './VocabularyIndex.css'

function wordImages(w) { return w.images || (w.image ? [w.image] : []) }

// All vocab sources in lesson order
const SOURCES = [
  { file: () => import('../data/unit1/chapter1/vocabulary.json'), unit: 1, chapter: 1 },
  { file: () => import('../data/unit1/chapter2/vocabulary.json'), unit: 1, chapter: 2 },
  { file: () => import('../data/unit1/chapter3/vocabulary.json'), unit: 1, chapter: 3 },
  { file: () => import('../data/unit2/chapter4/vocabulary.json'), unit: 2, chapter: 4 },
  { file: () => import('../data/unit2/chapter5/vocabulary.json'), unit: 2, chapter: 5 },
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
    test: p => /verb.*-έω/.test(p),
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
    test: p => /verb.*-άω/.test(p),
    pattern: [
      { from: 'α + ει',  to: 'ᾷ',   example: 'ἀγαπάω → ἀγαπᾷ' },
      { from: 'α + ε',   to: 'ᾷ',   example: 'ἀγαπάω → ἀγαπᾷ' },
      { from: 'α + ο',   to: 'ῶ',   example: 'ἀγαπάω → ἀγαπῶ' },
      { from: 'α + ου',  to: 'ῶ',   example: 'ἀγαπάω → ἀγαπῶ' },
    ],
    tip: 'An α stem before any ο/ω sound gives ω; before ε/ει/η gives ᾳ (with iota subscript). The α always dominates!',
  },
]

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

export default function VocabularyIndex({ onNavigate, target }) {
  const ui = useUI()
  const { lang } = useLanguage()
  const [words, setWords] = useState([])
  const [sort, setSort] = useState('lesson')
  const [query, setQuery] = useState('')
  const [activeCats, setActiveCats] = useState(new Set()) // empty = all
  const [activeVerbGroup, setActiveVerbGroup] = useState(null)
  const [targetFilter, setTargetFilter] = useState(target || null)
  const [loading, setLoading] = useState(true)
  const [fsWord, setFsWord] = useState(null)
  const searchRef = useRef(null)
  const tableRef = useRef(null)

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
          }))
        )
        setWords(all)
        setLoading(false)
      })
  }, [])

  useEffect(() => {
    if (!loading) searchRef.current?.focus()
  }, [loading])

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
    setActiveCats(new Set())
  }

  // Count per category (from full unfiltered set)
  const catCounts = {}
  for (const cat of CATEGORIES) {
    catCounts[cat.id] = words.filter(w => w.category === cat.id).length
  }
  const verbGroupCounts = {}
  for (const g of VERB_GROUPS) {
    verbGroupCounts[g.id] = words.filter(w => w.verbGroup === g.id).length
  }

  const sorted = [...words].sort((a, b) =>
    sort === 'alpha'
      ? a.greek.localeCompare(b.greek, 'el')
      : a.lessonOrder - b.lessonOrder || a.id - b.id
  )

  const filtered = sorted.filter(w => {
    if (targetFilter) return w.chapter === targetFilter.chapterId && w.part === targetFilter.part && matches(w, query)
    if (activeVerbGroup) return w.verbGroup === activeVerbGroup && matches(w, query)
    return (activeCats.size === 0 || activeCats.has(w.category)) && matches(w, query)
  })

  const total = words.length
  const isFiltered = query.trim().length > 0 || activeCats.size > 0 || !!activeVerbGroup || !!targetFilter
  const activeGroup = VERB_GROUPS.find(g => g.id === activeVerbGroup)

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

        {/* Search */}
        <div className="vocab-search-row">
          <div className="vocab-search-box">
            <span className="vocab-search-icon">🔍</span>
            <input
              ref={searchRef}
              className="vocab-search-input"
              type="text"
              placeholder={ui('searchPlaceholder')}
              value={query}
              onChange={e => setQuery(e.target.value)}
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
          </div>
        </div>

        {/* POS filter chips */}
        <div className="pos-filter-row">
          {CATEGORIES.filter(c => catCounts[c.id] > 0).map(cat => (
            <button
              key={cat.id}
              className={`pos-chip pos-chip--${cat.id} ${activeCats.has(cat.id) ? 'pos-chip--active' : ''}`}
              onClick={() => toggleCat(cat.id)}
            >
              {ui(cat.labelKey)}
              <span className="pos-chip-count">{catCounts[cat.id]}</span>
            </button>
          ))}
          {(activeCats.size > 0 || activeVerbGroup) && (
            <button className="pos-chip-clear" onClick={() => { setActiveCats(new Set()); setActiveVerbGroup(null) }}>
              {ui('clearFilters')}
            </button>
          )}
        </div>

        {/* Verb sub-groups */}
        {VERB_GROUPS.some(g => verbGroupCounts[g.id] > 0) && (
          <div className="verb-group-section">
            <span className="verb-group-label">Contract Verbs</span>
            <div className="verb-group-chips">
              {VERB_GROUPS.filter(g => verbGroupCounts[g.id] > 0).map(g => (
                <button
                  key={g.id}
                  className={`verb-group-chip verb-group-chip--${g.id.replace('verb-','')} ${activeVerbGroup === g.id ? 'verb-group-chip--active' : ''}`}
                  onClick={() => selectVerbGroup(g.id)}
                >
                  {g.label}
                  <span className="pos-chip-count">{verbGroupCounts[g.id]}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Sort */}
        <div className="vocab-index-sort">
          <button
            className={`sort-btn ${sort === 'lesson' ? 'sort-btn--active' : ''}`}
            onClick={() => setSort('lesson')}
          >{ui('byLesson')}</button>
          <button
            className={`sort-btn ${sort === 'alpha' ? 'sort-btn--active' : ''}`}
            onClick={() => setSort('alpha')}
          >{ui('alphabetical')}</button>
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
            </div>
          )}

          <table className="vocab-table">
            <thead>
              <tr>
                <th className="vt-img-col"></th>
                <th className="vt-greek">{ui('colGreek')}</th>
                {activeGroup && <th className="vt-3sg">3sg</th>}
                <th className="vt-english">{ui('colEnglish')}</th>
                <th className="vt-pos">{ui('colType')}</th>
                <th className="vt-source">{ui('colLesson')}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((w, i) => (
                <tr key={`${w.chapter}-${w.id}`} className={i % 2 === 0 ? 'vt-row-even' : ''}>
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
                    <Highlight text={t(w.definition, w.translations, lang)} query={query} />
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
              ))}
            </tbody>
          </table>
        </>
      )}
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

import { useState, useEffect, useRef } from 'react'
import './VocabularyIndex.css'

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
  { id: 'noun',        label: 'Noun',        test: p => /^noun/.test(p) },
  { id: 'verb',        label: 'Verb',        test: p => /^verb/.test(p) },
  { id: 'adjective',   label: 'Adjective',   test: p => /^adjective/.test(p) },
  { id: 'adverb',      label: 'Adverb',      test: p => /^adverb/.test(p) },
  { id: 'preposition', label: 'Preposition', test: p => /^preposition/.test(p) },
  { id: 'conjunction', label: 'Conjunction', test: p => /conjunction/.test(p) },
  { id: 'pronoun',     label: 'Pronoun',     test: p => /^pronoun/.test(p) },
  { id: 'particle',    label: 'Particle',    test: p => /^particle/.test(p) },
  { id: 'other',       label: 'Other',       test: () => true },
]

function getCategory(partOfSpeech = '') {
  const pos = partOfSpeech.toLowerCase()
  for (const cat of CATEGORIES) {
    if (cat.test(pos)) return cat.id
  }
  return 'other'
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

export default function VocabularyIndex({ onNavigate }) {
  const [words, setWords] = useState([])
  const [sort, setSort] = useState('lesson')
  const [query, setQuery] = useState('')
  const [activeCats, setActiveCats] = useState(new Set()) // empty = all
  const [loading, setLoading] = useState(true)
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
  }

  // Count per category (from full unfiltered set)
  const catCounts = {}
  for (const cat of CATEGORIES) {
    catCounts[cat.id] = words.filter(w => w.category === cat.id).length
  }

  const sorted = [...words].sort((a, b) =>
    sort === 'alpha'
      ? a.greek.localeCompare(b.greek, 'el')
      : a.lessonOrder - b.lessonOrder || a.id - b.id
  )

  const filtered = sorted.filter(w =>
    (activeCats.size === 0 || activeCats.has(w.category)) &&
    matches(w, query)
  )

  const total = words.length
  const isFiltered = query.trim().length > 0 || activeCats.size > 0

  return (
    <div className="vocab-index">
      <div className="vocab-index-header">
        <div className="vocab-index-title-row">
          <h2 className="greek">Λεξικόν</h2>
          <span className="vocab-index-count">{total} words</span>
        </div>
        <p className="vocab-index-subtitle">All vocabulary · Units 1 & 2</p>

        {/* Search */}
        <div className="vocab-search-row">
          <div className="vocab-search-box">
            <span className="vocab-search-icon">🔍</span>
            <input
              ref={searchRef}
              className="vocab-search-input"
              type="text"
              placeholder="Search Greek or English…"
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
              {cat.label}
              <span className="pos-chip-count">{catCounts[cat.id]}</span>
            </button>
          ))}
          {activeCats.size > 0 && (
            <button className="pos-chip-clear" onClick={() => setActiveCats(new Set())}>
              Clear filters
            </button>
          )}
        </div>

        {/* Sort */}
        <div className="vocab-index-sort">
          <button
            className={`sort-btn ${sort === 'lesson' ? 'sort-btn--active' : ''}`}
            onClick={() => setSort('lesson')}
          >By Lesson</button>
          <button
            className={`sort-btn ${sort === 'alpha' ? 'sort-btn--active' : ''}`}
            onClick={() => setSort('alpha')}
          >Α–Ω Alphabetical</button>
        </div>
      </div>

      {loading ? (
        <div className="vocab-index-loading">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="vocab-index-empty">
          No words match your filters.
        </div>
      ) : (
        <>
          {isFiltered && (
            <p className="vocab-index-result-count">{filtered.length} of {total} words</p>
          )}
          <table className="vocab-table">
            <thead>
              <tr>
                <th className="vt-greek">Greek</th>
                <th className="vt-english">English</th>
                <th className="vt-pos">Type</th>
                <th className="vt-source">Lesson</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((w, i) => (
                <tr key={`${w.chapter}-${w.id}`} className={i % 2 === 0 ? 'vt-row-even' : ''}>
                  <td className="vt-greek greek">
                    <Highlight text={w.greek} query={query} isGreek />
                  </td>
                  <td className="vt-english">
                    <Highlight text={w.definition} query={query} />
                  </td>
                  <td className="vt-pos">
                    <span className={`pos-tag pos-tag--${w.category}`}>
                      {CATEGORIES.find(c => c.id === w.category)?.label}
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

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

function sourceLabel(chapter, part) {
  return `${chapter}.${part === 'A' ? 1 : 2}`
}

// Strip Greek diacritics for accent-insensitive matching
function stripAccents(str) {
  return str.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

function matches(word, query) {
  if (!query) return true
  const q = query.trim()
  if (!q) return true
  const qStripped = stripAccents(q)
  // Try Greek match (accent-insensitive on both sides)
  if (stripAccents(word.greek).includes(qStripped)) return true
  // Try English match
  if (word.definition.toLowerCase().includes(q.toLowerCase())) return true
  // Try transliteration
  if (word.transliteration && word.transliteration.toLowerCase().includes(q.toLowerCase())) return true
  return false
}

export default function VocabularyIndex({ onNavigate }) {
  const [words, setWords] = useState([])
  const [sort, setSort] = useState('lesson') // 'lesson' | 'alpha'
  const [query, setQuery] = useState('')
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
          }))
        )
        setWords(all)
        setLoading(false)
      })
  }, [])

  // Auto-focus search on mount
  useEffect(() => {
    if (!loading) searchRef.current?.focus()
  }, [loading])

  const sorted = [...words].sort((a, b) => {
    if (sort === 'alpha') return a.greek.localeCompare(b.greek, 'el')
    return a.lessonOrder - b.lessonOrder || a.id - b.id
  })

  const filtered = sorted.filter(w => matches(w, query))
  const total = words.length
  const isFiltered = query.trim().length > 0

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
              <button className="vocab-search-clear" onClick={() => { setQuery(''); searchRef.current?.focus() }} aria-label="Clear">✕</button>
            )}
          </div>
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
          No words match <span className="greek">"{query}"</span>
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

// Highlight matching substring in result text
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

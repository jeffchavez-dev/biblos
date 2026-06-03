import { useState, useEffect } from 'react'
import './VocabularyIndex.css'

// All vocab sources in lesson order, with their display label
const SOURCES = [
  { file: () => import('../data/unit1/chapter1/vocabulary.json'), unit: 1, chapter: 1 },
  { file: () => import('../data/unit1/chapter2/vocabulary.json'), unit: 1, chapter: 2 },
  { file: () => import('../data/unit1/chapter3/vocabulary.json'), unit: 1, chapter: 3 },
]

function sourceLabel(unit, chapter, part) {
  const partNum = part === 'A' ? 1 : 2
  return `${unit === 1 ? '' : unit}${chapter}.${partNum}`.replace(/^\./, '')
}

export default function VocabularyIndex({ onNavigate }) {
  const [words, setWords] = useState([])
  const [sort, setSort] = useState('lesson') // 'lesson' | 'alpha'
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all(SOURCES.map(s => s.file().then(m => ({ data: m.default, unit: s.unit, chapter: s.chapter }))))
      .then(results => {
        const all = results.flatMap(({ data, unit, chapter }) =>
          data.map(w => ({
            ...w,
            unit,
            chapter,
            source: sourceLabel(unit, chapter, w.part),
            // sort key for lesson order: chapter * 10 + (A=1, B=2)
            lessonOrder: chapter * 10 + (w.part === 'A' ? 1 : 2),
          }))
        )
        setWords(all)
        setLoading(false)
      })
  }, [])

  const sorted = [...words].sort((a, b) => {
    if (sort === 'alpha') {
      // Sort by Greek lemma, stripping accents for comparison
      return a.greek.localeCompare(b.greek, 'el')
    }
    // Lesson order, then original id within lesson
    return a.lessonOrder - b.lessonOrder || a.id - b.id
  })

  const total = words.length

  return (
    <div className="vocab-index">
      <div className="vocab-index-header">
        <div className="vocab-index-title-row">
          <h2 className="greek">Λεξικόν</h2>
          <span className="vocab-index-count">{total} words</span>
        </div>
        <p className="vocab-index-subtitle">All vocabulary in Biblos Unit 1</p>
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
      ) : (
        <table className="vocab-table">
          <thead>
            <tr>
              <th className="vt-greek">Greek</th>
              <th className="vt-english">English</th>
              <th className="vt-source">Lesson</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((w, i) => (
              <tr key={`${w.chapter}-${w.id}`} className={i % 2 === 0 ? 'vt-row-even' : ''}>
                <td className="vt-greek greek">{w.greek}</td>
                <td className="vt-english">{w.definition}</td>
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
      )}
    </div>
  )
}

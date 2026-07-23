import { useState, useEffect, useRef } from 'react'
import './GntReader.css'

// Morph code → human-readable label
function describeMorph(m) {
  if (!m) return null
  const parts = []
  // Part of speech (first segment before -)
  const pos = {
    'N': 'Noun', 'V': 'Verb', 'A': 'Adj', 'ADV': 'Adv',
    'PREP': 'Prep', 'CONJ': 'Conj', 'ART': 'Art', 'T': 'Art',
    'PRON': 'Pron', 'P': 'Pron', 'INJ': 'Intj', 'PART': 'Part',
    'X': 'Indef', 'NEG': 'Neg',
  }
  const segs = m.split('-')
  const posLabel = pos[segs[0]] || segs[0]
  parts.push(posLabel)
  // Tense/Voice/Mood for verbs: V-PAI-3S
  if (segs[0] === 'V' && segs[1]) {
    const tvm = segs[1]
    const tense = { P:'Pres',I:'Impf',F:'Fut',A:'Aor',X:'Pf',Y:'Plpf' }[tvm[0]] || tvm[0]
    const voice = { A:'Act',M:'Mid',P:'Pass',D:'Dep',E:'M/P' }[tvm[1]] || tvm[1]
    const mood  = { I:'Ind',S:'Subj',O:'Opt',M:'Imp',N:'Inf',P:'Ptc' }[tvm[2]] || tvm[2]
    if (tense) parts.push(tense)
    if (voice) parts.push(voice)
    if (mood) parts.push(mood)
  }
  // Case/Number for nouns/adj: N-NSM, A-GSF
  if ((segs[0] === 'N' || segs[0] === 'A' || segs[0] === 'T') && segs[1]) {
    const cn = segs[1]
    const caseL = { N:'Nom',G:'Gen',D:'Dat',A:'Acc',V:'Voc' }[cn[0]] || cn[0]
    const num   = { S:'Sg',P:'Pl' }[cn[1]] || cn[1]
    const gen   = { M:'M',F:'F',N:'N' }[cn[2]] || cn[2]
    if (caseL) parts.push(caseL)
    if (num) parts.push(num)
    if (gen) parts.push(gen)
  }
  return parts.join(' · ')
}

// Shared refs.json cache — loaded once, shared across mounts
let biblosStrongsCache = null   // Set<strongsNum>
let biblosImageCache = null     // Map<strongsNum, imageFilename>
let biblosStrongsLoading = false
let biblosStrongsCallbacks = []

function loadBiblosStrongs(cb) {
  if (biblosStrongsCache) { cb(biblosStrongsCache, biblosImageCache); return }
  biblosStrongsCallbacks.push(cb)
  if (biblosStrongsLoading) return
  biblosStrongsLoading = true
  fetch('/refs.json')
    .then(r => r.json())
    .then(data => {
      biblosStrongsCache = new Set(Object.keys(data))
      biblosImageCache = new Map(
        Object.entries(data).filter(([, v]) => v.image).map(([k, v]) => [k, v.image])
      )
      biblosStrongsCallbacks.forEach(fn => fn(biblosStrongsCache, biblosImageCache))
      biblosStrongsCallbacks = []
    })
    .catch(() => {
      biblosStrongsCallbacks = []
    })
}

const NT_BOOKS = [
  { abbr: 'Mat', name: 'Matthew',         ch: 28, group: 'Gospels' },
  { abbr: 'Mrk', name: 'Mark',            ch: 16, group: 'Gospels' },
  { abbr: 'Luk', name: 'Luke',            ch: 24, group: 'Gospels' },
  { abbr: 'Jhn', name: 'John',            ch: 21, group: 'Gospels' },
  { abbr: 'Act', name: 'Acts',            ch: 28, group: 'Acts' },
  { abbr: 'Rom', name: 'Romans',          ch: 16, group: 'Letters' },
  { abbr: '1Co', name: '1 Corinthians',   ch: 16, group: 'Letters' },
  { abbr: '2Co', name: '2 Corinthians',   ch: 13, group: 'Letters' },
  { abbr: 'Gal', name: 'Galatians',       ch:  6, group: 'Letters' },
  { abbr: 'Eph', name: 'Ephesians',       ch:  6, group: 'Letters' },
  { abbr: 'Php', name: 'Philippians',     ch:  4, group: 'Letters' },
  { abbr: 'Col', name: 'Colossians',      ch:  4, group: 'Letters' },
  { abbr: '1Th', name: '1 Thessalonians', ch:  5, group: 'Letters' },
  { abbr: '2Th', name: '2 Thessalonians', ch:  3, group: 'Letters' },
  { abbr: '1Ti', name: '1 Timothy',       ch:  6, group: 'Letters' },
  { abbr: '2Ti', name: '2 Timothy',       ch:  4, group: 'Letters' },
  { abbr: 'Tit', name: 'Titus',           ch:  3, group: 'Letters' },
  { abbr: 'Phm', name: 'Philemon',        ch:  1, group: 'Letters' },
  { abbr: 'Heb', name: 'Hebrews',         ch: 13, group: 'Letters' },
  { abbr: 'Jas', name: 'James',           ch:  5, group: 'General' },
  { abbr: '1Pe', name: '1 Peter',         ch:  5, group: 'General' },
  { abbr: '2Pe', name: '2 Peter',         ch:  3, group: 'General' },
  { abbr: '1Jn', name: '1 John',          ch:  5, group: 'General' },
  { abbr: '2Jn', name: '2 John',          ch:  1, group: 'General' },
  { abbr: '3Jn', name: '3 John',          ch:  1, group: 'General' },
  { abbr: 'Jud', name: 'Jude',            ch:  1, group: 'General' },
  { abbr: 'Rev', name: 'Revelation',      ch: 22, group: 'General' },
]

export default function GntReader({ book, chapter, highlightVerse, onOpenLexicon, onClose, onNavigate }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [popup, setPopup] = useState(null) // { word, anchorRect }
  const [showGloss, setShowGloss] = useState(false)
  const [showBiblos, setShowBiblos] = useState(false)
  const [navOpen, setNavOpen] = useState(true)
  const [expandedBook, setExpandedBook] = useState(book)
  const [biblosStrongs, setBiblosStrongs] = useState(biblosStrongsCache)
  const [biblosImages, setBiblosImages] = useState(biblosImageCache)
  const popupRef = useRef(null)
  const highlightRef = useRef(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    setData(null)
    setPopup(null)
    fetch(`/nt/${book}.${chapter}.json`)
      .then(r => { if (!r.ok) throw new Error(`${r.status}`); return r.json() })
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [book, chapter])

  // Load Biblos Strong's set + image map once
  useEffect(() => {
    if (!biblosStrongsCache) loadBiblosStrongs((strongs, images) => {
      setBiblosStrongs(strongs)
      setBiblosImages(images)
    })
  }, [])

  // Scroll to highlighted verse after data loads
  useEffect(() => {
    if (!highlightVerse || !data) return
    // Small delay to allow DOM to paint
    const timer = setTimeout(() => {
      highlightRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 120)
    return () => clearTimeout(timer)
  }, [data, highlightVerse])

  // Close popup on outside click
  useEffect(() => {
    if (!popup) return
    function handler(e) {
      if (popupRef.current && !popupRef.current.contains(e.target)) setPopup(null)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [popup])

  // Close popup on Escape
  useEffect(() => {
    function handler(e) { if (e.key === 'Escape') { if (popup) setPopup(null); else onClose?.() } }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [popup, onClose])

  function handleWordClick(wordObj, e) {
    const rect = e.currentTarget.getBoundingClientRect()
    const isBiblos = biblosStrongs && wordObj.s && biblosStrongs.has(wordObj.s)
    const image = isBiblos && biblosImages ? biblosImages.get(wordObj.s) : null
    setPopup({ word: wordObj, anchorRect: rect, isBiblos, image })
  }

  const BOOK_NAMES = {
    Mat:'Matthew', Mrk:'Mark', Luk:'Luke', Jhn:'John', Act:'Acts',
    Rom:'Romans', '1Co':'1 Corinthians', '2Co':'2 Corinthians',
    Gal:'Galatians', Eph:'Ephesians', Php:'Philippians', Col:'Colossians',
    '1Th':'1 Thessalonians', '2Th':'2 Thessalonians',
    '1Ti':'1 Timothy', '2Ti':'2 Timothy', Tit:'Titus', Phm:'Philemon',
    Heb:'Hebrews', Jas:'James', '1Pe':'1 Peter', '2Pe':'2 Peter',
    '1Jn':'1 John', '2Jn':'2 John', '3Jn':'3 John', Jud:'Jude', Rev:'Revelation',
  }

  function navigate(newBook, newCh) {
    if (onNavigate) onNavigate(newBook, newCh)
  }

  const groups = [...new Set(NT_BOOKS.map(b => b.group))]

  return (
    <div className="gnt-reader">
      <div className="gnt-reader-header">
        <button className="gnt-nav-toggle" onClick={() => setNavOpen(v => !v)} aria-label="Toggle book list" title="Books">
          ☰
        </button>
        <span className="gnt-reader-title greek">
          {BOOK_NAMES[book] || book} {chapter}
        </span>
        <button
          className={`gnt-gloss-toggle ${showBiblos ? 'gnt-gloss-toggle--on' : ''}`}
          onClick={() => setShowBiblos(v => !v)}
          title="Highlight words in Biblos vocabulary"
        >
          Biblos words
        </button>
        <button
          className={`gnt-gloss-toggle ${showGloss ? 'gnt-gloss-toggle--on' : ''}`}
          onClick={() => setShowGloss(v => !v)}
          title={showGloss ? 'Hide glosses' : 'Show glosses'}
        >
          {showGloss ? 'Hide gloss' : 'Show gloss'}
        </button>
      </div>

      <div className="gnt-reader-main">
        {navOpen && (
          <nav className="gnt-nav-panel">
            {groups.map(group => (
              <div key={group} className="gnt-nav-group">
                <div className="gnt-nav-group-label">{group}</div>
                {NT_BOOKS.filter(b => b.group === group).map(b => (
                  <div key={b.abbr}>
                    <button
                      className={`gnt-nav-book ${b.abbr === book ? 'gnt-nav-book--active' : ''}`}
                      onClick={() => setExpandedBook(expandedBook === b.abbr ? null : b.abbr)}
                    >
                      {b.name}
                      <span className="gnt-nav-chevron">{expandedBook === b.abbr ? '▾' : '›'}</span>
                    </button>
                    {expandedBook === b.abbr && (
                      <div className="gnt-nav-chapters">
                        {Array.from({ length: b.ch }, (_, i) => i + 1).map(ch => (
                          <button
                            key={ch}
                            className={`gnt-nav-ch ${b.abbr === book && ch === chapter ? 'gnt-nav-ch--active' : ''}`}
                            onClick={() => navigate(b.abbr, ch)}
                          >
                            {ch}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </nav>
        )}
        <div className="gnt-reader-body">
        {loading && <div className="gnt-loading">Loading…</div>}
        {error && <div className="gnt-error">Could not load chapter ({error})</div>}
        {data && data.verses.map(vObj => {
          const isHighlighted = highlightVerse && vObj.verse === highlightVerse
          return (
            <div
              key={vObj.verse}
              ref={isHighlighted ? highlightRef : null}
              className={`gnt-verse${isHighlighted ? ' gnt-verse--highlight' : ''}`}
            >
              <span className="gnt-verse-num">{vObj.verse}</span>
              <span className="gnt-words">
                {vObj.words.map((w, wi) => {
                  const isBiblos = biblosStrongs && w.s && biblosStrongs.has(w.s)
                  return (
                    <button
                      key={wi}
                      className={`gnt-word${showBiblos && isBiblos ? ' gnt-word--biblos' : ''}`}
                      onClick={e => handleWordClick({ ...w, verse: vObj.verse }, e)}
                      title={isBiblos ? 'In Biblos vocabulary' : undefined}
                    >
                      <span className="gnt-word-greek greek">{w.w}</span>
                      {showGloss && w.g && (
                        <span className="gnt-word-gloss">{w.g.replace(/[<>\[\]]/g, '').replace(/[.,;]+$/, '')}</span>
                      )}
                    </button>
                  )
                })}
              </span>
            </div>
          )
        })}
        </div>
      </div>

      {popup && (
        <WordPopup
          ref={popupRef}
          word={popup.word}
          anchor={popup.anchorRect}
          book={book}
          chapter={chapter}
          onClose={() => setPopup(null)}
          isBiblos={popup.isBiblos}
          image={popup.image}
          onOpenLexicon={onOpenLexicon}
        />
      )}
    </div>
  )
}

import { forwardRef } from 'react'
const WordPopup = forwardRef(function WordPopup({ word, anchor, book, chapter, onClose, isBiblos, image, onOpenLexicon }, ref) {
  const morphDesc = describeMorph(word.m)

  // Position popup below the word tile, clamped to viewport
  const style = {}
  if (anchor) {
    const popupW = 260
    const popupH = image ? 360 : 200 // approx height for clamping
    let top = anchor.bottom + 6
    let left = anchor.left
    // Flip above word if too close to bottom
    if (top + popupH > window.innerHeight - 8) top = anchor.top - popupH - 6
    if (top < 8) top = 8
    // Clamp horizontal
    if (left + popupW > window.innerWidth - 12) left = window.innerWidth - popupW - 12
    if (left < 8) left = 8
    style.top = top
    style.left = left
  }

  return (
    <div ref={ref} className="gnt-word-popup" style={style}>
      <div className="gnt-wp-header">
        <span className="gnt-wp-lemma greek">{word.l || word.w}</span>
        {word.s && <span className="gnt-wp-strongs">{word.s}</span>}
        <button className="gnt-wp-close" onClick={onClose}>✕</button>
      </div>
      {image && (
        <img
          className="gnt-wp-image"
          src={`/vocab-images/${image}`}
          alt=""
        />
      )}
      {morphDesc && <div className="gnt-wp-morph">{morphDesc}</div>}
      {word.g && <div className="gnt-wp-gloss">{word.g.replace(/[<>\[\].,;]+$/g, '')}</div>}
      <div className="gnt-wp-ref">
        {book} {chapter}:{word.verse}
      </div>
      {onOpenLexicon && word.s && isBiblos && (
        <button
          className="gnt-wp-lexicon-btn"
          onClick={() => { onOpenLexicon(word.s); onClose() }}
        >
          Open in Lexicon →
        </button>
      )}
    </div>
  )
})

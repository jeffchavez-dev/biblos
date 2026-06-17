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
let biblosStrongsCache = null
let biblosStrongsLoading = false
let biblosStrongsCallbacks = []

function loadBiblosStrongs(cb) {
  if (biblosStrongsCache) { cb(biblosStrongsCache); return }
  biblosStrongsCallbacks.push(cb)
  if (biblosStrongsLoading) return
  biblosStrongsLoading = true
  fetch('/refs.json')
    .then(r => r.json())
    .then(data => {
      biblosStrongsCache = new Set(Object.keys(data))
      biblosStrongsCallbacks.forEach(fn => fn(biblosStrongsCache))
      biblosStrongsCallbacks = []
    })
    .catch(() => {
      biblosStrongsCallbacks = []
    })
}

export default function GntReader({ book, chapter, highlightVerse, onOpenLexicon, onClose }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [popup, setPopup] = useState(null) // { word, anchorRect }
  const [showGloss, setShowGloss] = useState(false)
  const [showBiblos, setShowBiblos] = useState(false)
  const [biblosStrongs, setBiblosStrongs] = useState(biblosStrongsCache)
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

  // Load Biblos Strong's set once
  useEffect(() => {
    if (!biblosStrongsCache) loadBiblosStrongs(setBiblosStrongs)
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
    setPopup({ word: wordObj, anchorRect: rect, isBiblos })
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

  return (
    <div className="gnt-reader">
      <div className="gnt-reader-header">
        <button className="gnt-back-btn" onClick={onClose} aria-label="Back">←</button>
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

      {popup && (
        <WordPopup
          ref={popupRef}
          word={popup.word}
          anchor={popup.anchorRect}
          book={book}
          chapter={chapter}
          onClose={() => setPopup(null)}
          isBiblos={popup.isBiblos}
          onOpenLexicon={onOpenLexicon}
        />
      )}
    </div>
  )
}

import { forwardRef } from 'react'
const WordPopup = forwardRef(function WordPopup({ word, anchor, book, chapter, onClose, isBiblos, onOpenLexicon }, ref) {
  const morphDesc = describeMorph(word.m)

  // Position popup below the word tile, clamped to viewport
  const style = {}
  if (anchor) {
    const popupW = 260
    const popupH = 200 // approx height for clamping
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

import { useState } from 'react'
import './GreekKeyboard.css'

const GREEK_ROWS = [
  ['ς','ε','ρ','τ','υ','θ','ι','ο','π'],
  ['α','σ','δ','φ','γ','η','ξ','κ','λ'],
  ['ζ','χ','ψ','ω','β','ν','μ','⌫','·'],
]

const DIACRITIC_KEYS = [
  { label: '᾿', id: 'smooth',    mark: '̓' },
  { label: '῾', id: 'rough',     mark: '̔' },
  { label: '΄', id: 'acute',     mark: '́' },
  { label: '`', id: 'grave',     mark: '̀' },
  { label: '῀', id: 'circum',    mark: '͂' },
  { label: '¨', id: 'diaer',     mark: '̈' },
  { label: 'ͅ', id: 'subscript', mark: 'ͅ' },
]

const VOWELS = new Set('αεηιουωΑΕΗΙΟΥΩ')

export default function GreekKeyboard({ onKey }) {
  const [pending, setPending] = useState(new Set())

  function toggleDiacritic(id) {
    setPending(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function handleKey(k) {
    if (k === '⌫') {
      if (pending.size > 0) { setPending(new Set()); return }
      onKey('⌫')
      return
    }
    if (pending.size > 0 && VOWELS.has(k)) {
      const marks = DIACRITIC_KEYS.filter(d => pending.has(d.id)).map(d => d.mark).join('')
      onKey((k + marks).normalize('NFC'))
      setPending(new Set())
    } else {
      if (pending.size > 0) setPending(new Set())
      onKey(k)
    }
  }

  return (
    <div className="greek-kb">
      <div className="greek-kb-row greek-kb-diacritics">
        {DIACRITIC_KEYS.map(d => (
          <button
            key={d.id}
            type="button"
            className={`greek-kb-key greek-kb-key--diacritic${pending.has(d.id) ? ' greek-kb-key--active' : ''}`}
            onMouseDown={e => { e.preventDefault(); toggleDiacritic(d.id) }}
          >
            {d.label}
          </button>
        ))}
      </div>
      {GREEK_ROWS.map((row, ri) => (
        <div key={ri} className="greek-kb-row">
          {row.map(k => (
            <button
              key={k}
              type="button"
              className={`greek-kb-key${k === '⌫' ? ' greek-kb-key--wide' : ''}`}
              onMouseDown={e => { e.preventDefault(); handleKey(k) }}
            >
              {k}
            </button>
          ))}
        </div>
      ))}
    </div>
  )
}

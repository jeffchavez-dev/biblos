import { useState } from 'react'
import { useLanguage, t } from '../../context/LanguageContext.jsx'
import './GrammarTab.css'

// Master list of Greek grammar terms → English equivalents
const GRAMMAR_TERMS = [
  // Cases
  { greek: 'ἡ πτῶσις',       en: 'case' },
  { greek: 'ὀνομαστική',     en: 'nominative' },
  { greek: 'αἰτιατική',      en: 'accusative' },
  { greek: 'γενική',         en: 'genitive' },
  { greek: 'δοτική',         en: 'dative' },
  { greek: 'κλητική',        en: 'vocative' },
  // Tense
  { greek: 'ὁ χρόνος',       en: 'tense' },
  { greek: 'ἐνεστώς',        en: 'present' },
  { greek: 'παρατατικός',    en: 'imperfect' },
  { greek: 'ἀόριστος',       en: 'aorist' },
  { greek: 'μέλλων',         en: 'future' },
  { greek: 'παρακείμενος',   en: 'perfect' },
  // Voice
  { greek: 'ἡ διάθεσις',     en: 'voice' },
  { greek: 'ἐνεργετική',     en: 'active' },
  { greek: 'μέση',           en: 'middle' },
  { greek: 'παθητική',       en: 'passive' },
  // Mood
  { greek: 'ἡ ἔγκλισις',     en: 'mood' },
  { greek: 'ὁριστική',       en: 'indicative' },
  { greek: 'προστακτική',    en: 'imperative' },
  { greek: 'ὑποτακτική',     en: 'subjunctive' },
  { greek: 'εὐκτική',        en: 'optative' },
  { greek: 'μετοχή',         en: 'participle' },
  { greek: 'ἀπαρέμφατος',    en: 'infinitive' },
  // Number
  { greek: 'ὁ ἀριθμός',      en: 'number' },
  { greek: 'ἑνικόν',         en: 'singular' },
  { greek: 'πληθυντικός',    en: 'plural' },
  // Person
  { greek: 'τὸ πρόσωπον',    en: 'person' },
  { greek: 'πρῶτον πρόσωπον',   en: '1st person' },
  { greek: 'δεύτερον πρόσωπον', en: '2nd person' },
  { greek: 'τρίτον πρόσωπον',   en: '3rd person' },
  // Gender
  { greek: 'τὸ γένος',       en: 'gender' },
  { greek: 'ἀρσενικόν',      en: 'masculine' },
  { greek: 'θηλυκόν',        en: 'feminine' },
  { greek: 'οὐδέτερον',      en: 'neuter' },
  // Parts of speech
  { greek: 'τὸ ῥῆμα',        en: 'verb' },
  { greek: 'τὸ ὄνομα',       en: 'noun' },
  { greek: 'τὸ ἐπίθετον',    en: 'adjective' },
  { greek: 'τὸ ἀντώνυμον',   en: 'pronoun' },
  { greek: 'τὸ ἐπίρρημα',    en: 'adverb' },
  { greek: 'ὁ συνδεσμός',    en: 'conjunction' },
  { greek: 'τὸ ἄρθρον',      en: 'article' },
  { greek: 'ἡ προθέσις',     en: 'preposition' },
  // Table column headers
  { greek: 'ὁ τύπος',        en: 'form / type' },
  { greek: 'ἡ χρεία',        en: 'function / use' },
  { greek: 'σημαίνει',       en: 'means / definition' },
]

function extractSectionText(sections) {
  const parts = []
  for (const s of sections) {
    if (s.heading) parts.push(s.heading)
    if (s.table) {
      if (s.table.caption) parts.push(s.table.caption)
      parts.push(...(s.table.headers ?? []))
      for (const row of s.table.rows ?? []) parts.push(row[0] ?? '')
    }
    for (const tbl of s.tables ?? []) {
      if (tbl.caption) parts.push(tbl.caption)
      parts.push(...(tbl.headers ?? []))
      for (const row of tbl.rows ?? []) parts.push(row[0] ?? '')
    }
  }
  return parts.join(' ')
}

function GrammarTermsRef({ sections }) {
  const [open, setOpen] = useState(false)
  const text = extractSectionText(sections)
  const matched = GRAMMAR_TERMS.filter(({ greek }) => text.includes(greek))
  if (matched.length === 0) return null

  return (
    <div className="grammar-terms-ref">
      <button className="grammar-terms-toggle" onClick={() => setOpen(v => !v)}>
        <span className="greek">Γλωσσάριον Γραμματικῆς</span>
        <span className="grammar-terms-sub">Grammar Terms</span>
        <span className="grammar-terms-chevron">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="grammar-terms-grid">
          {matched.map(({ greek, en }) => (
            <div key={greek} className="grammar-term-row">
              <span className="grammar-term-greek greek">{greek}</span>
              <span className="grammar-term-en">{en}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function GrammarTab({ grammar, words, activePart }) {
  const { lang } = useLanguage()
  const vocabList = words ? words.filter(w => !w.part || w.part === activePart) : []

  if (!grammar) {
    return <div className="empty-tab">📐 Grammar for this chapter has not been added yet.</div>
  }

  function renderVocabList() {
    if (vocabList.length === 0) return null

    const POS_GROUPS = [
      { label: 'Nouns',       test: p => p.startsWith('noun') },
      { label: 'Verbs',       test: p => p.startsWith('verb') },
      { label: 'Adjectives',  test: p => p.startsWith('adjective') },
      { label: 'Particles & Conjunctions', test: () => true },
    ]

    // Assign each word to its first matching group
    const groups = POS_GROUPS.map(g => ({ ...g, words: [] }))
    vocabList.forEach(w => {
      const pos = (w.partOfSpeech ?? '').toLowerCase()
      const g = groups.find(g => g.test(pos))
      if (g) g.words.push(w)
    })

    return (
      <div className="grammar-vocab-section">
        <h3 className="grammar-vocab-heading">Vocabulary</h3>
        {groups.filter(g => g.words.length > 0).map(g => (
          <div key={g.label} className="grammar-vocab-group">
            <h4 className="grammar-vocab-group-heading">{g.label}</h4>
            <div className="grammar-vocab-list">
              {g.words.map((w, i) => (
                <div key={w.id} className="grammar-vocab-row">
                  <span className="grammar-vocab-num">{i + 1}</span>
                  <span className="grammar-vocab-greek greek">{w.greek}</span>
                  <span className="grammar-vocab-def">{t(w.definition, w.translations, lang)}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    )
  }

  const allParts = grammar.parts ?? [{ label: null, sections: grammar.sections ?? [] }]
  const partIndex = activePart === 'B' ? 1 : 0
  const parts = [allParts[partIndex]].filter(Boolean)

  function tRow(tbl, ri, cell) {
    const rowTrans = tbl.rowTranslations?.[String(ri)]
    return t(cell, rowTrans, lang)
  }

  return (
    <div className="grammar-tab">
      <h2>{grammar.title}</h2>

      {parts.map((part, pi) => (
        <div key={pi} className="grammar-part">
          {part.label && (
            <div className="grammar-part-divider">
              <span className="grammar-part-label greek">{part.label}</span>
            </div>
          )}

          {part.sections.map(section => (
            <div key={section.id} className="grammar-section">
              <h3 className="grammar-heading">
                {t(section.heading, section.headingTranslations, lang)}
              </h3>
              {section.content && (
                <p className="grammar-content">
                  {t(section.content, section.contentTranslations, lang)}
                </p>
              )}

              {section.table && (
                <div className="grammar-table-wrap">
                  {section.table.caption && (
                    <div className="table-caption">
                      {t(section.table.caption, section.table.captionTranslations, lang)}
                    </div>
                  )}
                  <table className="grammar-table">
                    <thead>
                      <tr>
                        {section.table.headers.map((h, i) => (
                          <th key={i}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {section.table.rows.map((row, ri) => (
                        <tr key={ri}>
                          {row.map((cell, ci) => (
                            ci === 0
                              ? <th key={ci} className="row-header greek">{cell}</th>
                              : ci === 1
                                ? <td key={ci} className="greek">{cell}</td>
                                : <td key={ci}>{tRow(section.table, ri, cell)}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {section.tables && section.tables.map((tbl, ti) => (
                <div key={ti} className="grammar-table-wrap">
                  {tbl.caption && (
                    <div className="table-caption">
                      {t(tbl.caption, tbl.captionTranslations, lang)}
                    </div>
                  )}
                  <table className="grammar-table">
                    <thead>
                      <tr>{tbl.headers.map((h, i) => <th key={i}>{h}</th>)}</tr>
                    </thead>
                    <tbody>
                      {tbl.rows.map((row, ri) => (
                        <tr key={ri}>
                          {row.map((cell, ci) => (
                            ci === 0
                              ? <th key={ci} className="row-header greek">{cell}</th>
                              : ci === 1
                                ? <td key={ci} className="greek">{cell}</td>
                                : <td key={ci}>{tRow(tbl, ri, cell)}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}

              {section.examples && (
                <div className="grammar-examples">
                  {section.examples.map((ex, i) => (
                    <div key={i} className="grammar-example">
                      <span className="greek example-greek">{ex.greek}</span>
                      <span className="example-note">
                        {t(ex.note, ex.noteTranslations, lang)}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {section.list && (
                <div className="grammar-list">
                  {section.list.map((item, i) => (
                    <div key={i} className="grammar-list-item">
                      <span className="list-term">{item.term}</span>
                      <span className="list-def">
                        {t(item.definition, item.definitionTranslations, lang)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      ))}

      <GrammarTermsRef sections={parts.flatMap(p => p?.sections ?? [])} />

      {renderVocabList()}
    </div>
  )
}

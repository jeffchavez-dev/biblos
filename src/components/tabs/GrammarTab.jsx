import { useLanguage, t } from '../../context/LanguageContext.jsx'
import './GrammarTab.css'

export default function GrammarTab({ grammar, words, activePart }) {
  const { lang } = useLanguage()
  const vocabList = words ? words.filter(w => !w.part || w.part === activePart) : []

  if (!grammar) {
    return <div className="empty-tab">📐 Grammar for this chapter has not been added yet.</div>
  }

  function renderVocabList() {
    if (vocabList.length === 0) return null
    return (
      <div className="grammar-vocab-section">
        <h3 className="grammar-vocab-heading">Vocabulary</h3>
        <div className="grammar-vocab-list">
          {vocabList.map((w, i) => (
            <div key={w.id} className="grammar-vocab-row">
              <span className="grammar-vocab-num">{i + 1}</span>
              <span className="grammar-vocab-greek greek">{w.greek}</span>
              <span className="grammar-vocab-def">{t(w.definition, w.translations, lang)}</span>
            </div>
          ))}
        </div>
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
                              ? <th key={ci} className="row-header">{cell}</th>
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
                              ? <th key={ci} className="row-header">{cell}</th>
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

      {renderVocabList()}
    </div>
  )
}

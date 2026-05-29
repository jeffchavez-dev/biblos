import './GrammarTab.css'

export default function GrammarTab({ grammar }) {
  if (!grammar) {
    return <div className="empty-tab">📐 Grammar for this chapter has not been added yet.</div>
  }

  return (
    <div className="grammar-tab">
      <h2>{grammar.title}</h2>

      {grammar.sections.map(section => (
        <div key={section.id} className="grammar-section">
          <h3 className="grammar-heading">{section.heading}</h3>
          <p className="grammar-content">{section.content}</p>

          {section.table && (
            <div className="grammar-table-wrap">
              {section.table.caption && (
                <div className="table-caption">{section.table.caption}</div>
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
                          : <td key={ci} className="greek">{cell}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {section.examples && (
            <div className="grammar-examples">
              {section.examples.map((ex, i) => (
                <div key={i} className="grammar-example">
                  <span className="greek example-greek">{ex.greek}</span>
                  <span className="example-note">{ex.note}</span>
                </div>
              ))}
            </div>
          )}

          {section.list && (
            <div className="grammar-list">
              {section.list.map((item, i) => (
                <div key={i} className="grammar-list-item">
                  <span className="list-term">{item.term}</span>
                  <span className="list-def">{item.definition}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

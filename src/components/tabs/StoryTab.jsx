import { useState } from 'react'
import './StoryTab.css'

export default function StoryTab({ story }) {
  const [showTranslation, setShowTranslation] = useState(false)
  const [activeWord, setActiveWord] = useState(null)

  if (!story) {
    return <div className="empty-tab">📖 Story text for this chapter has not been added yet.</div>
  }

  function handleWordClick(word, paragraphId, wordIdx) {
    const key = `${paragraphId}-${wordIdx}`
    setActiveWord(prev => prev?.key === key ? null : { ...word, key })
  }

  return (
    <div className="story-tab">
      <div className="story-header">
        <h2 className="greek story-title">{story.title}</h2>
        <p className="story-title-en">{story.titleTranslation}</p>
      </div>

      {activeWord && (
        <div className="word-tooltip">
          <span className="tooltip-greek greek">{activeWord.greek}</span>
          <span className="tooltip-arrow">→</span>
          <span className="tooltip-def">{activeWord.definition}</span>
          <button className="tooltip-close" onClick={() => setActiveWord(null)}>✕</button>
        </div>
      )}

      <div className="story-instruction">Tap any word to see its meaning.</div>

      {story.paragraphs.map(para => (
        <div key={para.id}>
          {para.label && (
            <div className="part-divider">
              <span className="part-label greek">{para.label}</span>
            </div>
          )}
          <div className="story-paragraph">
            <p className="para-greek greek">
              {para.words.map((word, wi) => (
                <span
                  key={wi}
                  className={`story-word ${activeWord?.key === `${para.id}-${wi}` ? 'story-word--active' : ''}`}
                  onClick={() => handleWordClick(word, para.id, wi)}
                >
                  {word.greek}{wi < para.words.length - 1 ? ' ' : ''}
                </span>
              ))}
            </p>
          </div>
        </div>
      ))}

      <div className="story-translation-section">
        <button
          className="translation-toggle-full"
          onClick={() => setShowTranslation(v => !v)}
        >
          {showTranslation ? 'Hide Translation' : 'Show Translation'}
        </button>

        {showTranslation && (
          <div className="full-translation">
            {story.paragraphs.map(para => (
              <div key={para.id} className="translation-block">
                {para.label && (
                  <p className="translation-part-label">{para.label}</p>
                )}
                {para.translation && (
                  <p className="translation-para">{para.translation}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

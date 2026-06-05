import { createContext, useContext, useState } from 'react'

export const LANGUAGES = [
  { code: 'en', label: 'EN', name: 'English' },
  { code: 'es', label: 'ES', name: 'Español' },
  { code: 'pl', label: 'PL', name: 'Polski' },
]

const LanguageContext = createContext({ lang: 'en', setLang: () => {} })

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState('en')
  return (
    <LanguageContext.Provider value={{ lang, setLang }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  return useContext(LanguageContext)
}

/** Returns the best translation for a string field given current lang.
 *  Falls back to English if translation is missing. */
export function t(englishValue, translations, lang) {
  if (lang === 'en' || !translations) return englishValue
  return translations[lang] || englishValue
}

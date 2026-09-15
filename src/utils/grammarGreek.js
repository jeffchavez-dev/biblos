// Maps parsing abbreviation tokens to Greek grammatical terms

const CASE_MAP  = { gen: 'γενική', acc: 'αἰτιατική', dat: 'δοτική', nom: 'ὀνομαστική', voc: 'κλητική' }
const GENDER_MAP = { m: 'ἀρσενικόν', f: 'θηλυκόν', n: 'οὐδέτερον', neut: 'οὐδέτερον' }
const NUMBER_MAP = { sg: 'ἑνικός', pl: 'πληθυντικός' }
const MOOD_MAP   = { ptc: 'μετοχή', inf: 'ἀπαρέμφατος', subj: 'ὑποτακτική', impv: 'προστακτική' }
const VOICE_MAP  = { pass: 'παθητική', mid: 'μέση', act: 'ἐνεργητική' }
const MISC_MAP   = { adv: 'ἐπίρρημα', rel: 'ἀντώνυμον' }
const PERSON_PREFIX = { '1': 'αʹ', '2': 'βʹ', '3': 'γʹ' }

// Maps a single token (after splitting on '.') to a Greek term or null
function mapToken(tok) {
  // Person+number combo: 1sg, 3pl, etc.
  const pn = tok.match(/^([123])(sg|pl)$/)
  if (pn) {
    const p = PERSON_PREFIX[pn[1]] + ' πρ.'
    const n = NUMBER_MAP[pn[2]]
    return [p, n].filter(Boolean).join(' · ')
  }

  // Slash-alternation within a token (e.g. m/n, gen/acc, nom/acc)
  if (tok.includes('/')) {
    const parts = tok.split('/').map(t => mapSingle(t)).filter(Boolean)
    return parts.length ? parts.join('/') : null
  }

  return mapSingle(tok)
}

function mapSingle(tok) {
  return CASE_MAP[tok] || GENDER_MAP[tok] || NUMBER_MAP[tok] ||
         MOOD_MAP[tok]  || VOICE_MAP[tok]  || MISC_MAP[tok]  || null
}

/**
 * Given a raw definition string like "of the (gen.m./n.sg.)"
 * returns { gloss: "of the", chips: ["γενική", "ἀρσενικόν/οὐδέτερον", "ἑνικός"] }
 * Returns null if the definition has no parseable parenthetical.
 */
export function parseDefinition(definition) {
  if (!definition) return null

  const match = definition.match(/^(.*?)\(([^)]+)\)\s*$/)
  if (!match) return null

  const gloss   = match[1].trim()
  const parsing = match[2].trim()

  // Skip purely phonological or language notes
  if (
    parsing.includes(':') ||          // "Aramaic: Father"
    parsing === 'before vowel' ||
    parsing === 'person'
  ) return null

  // Preposition + case patterns
  const prepCaseMap = {
    '+ acc'              : '+ αἰτιατική',
    '+ dat'              : '+ δοτική',
    '+ gen'              : '+ γενική',
    '+ dat./acc./gen'    : '+ δοτική / αἰτιατική / γενική',
    '+ dat./acc./gen.'   : '+ δοτική / αἰτιατική / γενική',
    '+ subj'             : '+ ὑποτακτική',
    'with subj./inf'     : 'μετὰ ὑποτ./ἀπαρ.',
    'with subj./inf.'    : 'μετὰ ὑποτ./ἀπαρ.',
  }
  const stripped = parsing.replace(/\.$/, '')
  if (prepCaseMap[stripped] || prepCaseMap[parsing]) {
    return { gloss, chips: [prepCaseMap[stripped] || prepCaseMap[parsing]] }
  }

  // Normalize slash-between-abbreviations: "m./n." → "m/n."
  // Regex: word chars, dot, slash, word chars → collapse the dot before slash
  const normalized = parsing.replace(/(\w+)\.\//g, '$1/')

  // Split on '.' to get tokens, filter empty strings
  const tokens = normalized.split('.').map(t => t.trim()).filter(Boolean)

  const chips = []
  for (const tok of tokens) {
    const mapped = mapToken(tok)
    if (mapped) chips.push(mapped)
  }

  return chips.length ? { gloss, chips } : null
}

// Greek labels for grammar-term subcategories (for the Lexicon)
export const SUBCATEGORY_GREEK = {
  'case'          : 'πτῶσις',
  'gender'        : 'γένος',
  'tense'         : 'χρόνος',
  'number'        : 'ἀριθμός',
  'voice'         : 'διάθεσις',
  'person'        : 'πρόσωπον',
  'mood'          : 'ἔγκλισις',
  'parts of speech': 'μέρη λόγου',
  'interrogative' : 'ἐρωτηματικός',
}

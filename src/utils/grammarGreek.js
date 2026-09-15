// Maps parsing abbreviation tokens to Greek grammatical terms

const CASE_MAP   = { gen: 'γενική', acc: 'αἰτιατική', dat: 'δοτική', nom: 'ὀνομαστική', voc: 'κλητική' }
const GENDER_MAP = { m: 'ἀρσενικόν', f: 'θηλυκόν', n: 'οὐδέτερον', neut: 'οὐδέτερον' }
const NUMBER_MAP = { sg: 'ἑνικός', pl: 'πληθυντικός' }
const MOOD_MAP   = { ptc: 'μετοχή', inf: 'ἀπαρέμφατος', subj: 'ὑποτακτική', impv: 'προστακτική' }
const VOICE_MAP  = { pass: 'παθητική', mid: 'μέση', act: 'ἐνεργητική' }
const TENSE_MAP  = { pres: 'ἐνεστώς', aor: 'ἀόριστος', fut: 'μέλλων', impf: 'παρατατικός', perf: 'παρακείμενος', plpf: 'ὑπερσυντέλικος' }
const MISC_MAP   = { adv: 'ἐπίρρημα', rel: 'ἀντώνυμον' }
const PERSON_MAP = { '1': 'πρῶτον πρόσωπον', '2': 'δεύτερον πρόσωπον', '3': 'τρίτον πρόσωπον' }

// Classify a single abbreviation string into a category bucket
// Returns { cat, value } or null
function classifyToken(tok) {
  if (CASE_MAP[tok])   return { cat: 'case',   value: CASE_MAP[tok] }
  if (GENDER_MAP[tok]) return { cat: 'gender', value: GENDER_MAP[tok] }
  if (NUMBER_MAP[tok]) return { cat: 'number', value: NUMBER_MAP[tok] }
  if (MOOD_MAP[tok])   return { cat: 'mood',   value: MOOD_MAP[tok] }
  if (VOICE_MAP[tok])  return { cat: 'voice',  value: VOICE_MAP[tok] }
  if (TENSE_MAP[tok])  return { cat: 'tense',  value: TENSE_MAP[tok] }
  if (MISC_MAP[tok])   return { cat: 'misc',   value: MISC_MAP[tok] }
  return null
}

// Classify a token that may contain slash-alternation (e.g. "m/n", "gen/acc")
function classifyMaybeSlash(tok) {
  if (!tok.includes('/')) return classifyToken(tok)
  const parts = tok.split('/').map(t => classifyToken(t)).filter(Boolean)
  if (!parts.length) return null
  // All parts should share the same category
  return { cat: parts[0].cat, value: parts.map(p => p.value).join('/') }
}

/**
 * Given a raw definition string like "of the (gen.m./n.sg.)"
 * returns { gloss: "of the", chips: ["ἀρσενικόν/οὐδέτερον", "ἑνικός", "γενική"] }
 * with chips in canonical Greek grammatical order:
 *   Noun:       γένος · ἀριθμός · πτῶσις
 *   Participle: χρόνος · διάθεσις · γένος · ἀριθμός · πτῶσις
 *   Finite verb: χρόνος · διάθεσις · ἔγκλισις · πρόσωπον · ἀριθμός
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
    parsing.includes(':') ||
    parsing === 'before vowel' ||
    parsing === 'person'
  ) return null

  // Preposition + case patterns
  const prepCaseMap = {
    '+ acc'             : '+ αἰτιατική',
    '+ dat'             : '+ δοτική',
    '+ gen'             : '+ γενική',
    '+ dat./acc./gen'   : '+ δοτική / αἰτιατική / γενική',
    '+ dat./acc./gen.'  : '+ δοτική / αἰτιατική / γενική',
    '+ subj'            : '+ ὑποτακτική',
    'with subj./inf'    : 'μετὰ ὑποτ./ἀπαρ.',
    'with subj./inf.'   : 'μετὰ ὑποτ./ἀπαρ.',
  }
  const stripped = parsing.replace(/\.$/, '')
  if (prepCaseMap[stripped] || prepCaseMap[parsing]) {
    return { gloss, chips: [prepCaseMap[stripped] || prepCaseMap[parsing]] }
  }

  // Normalize slash-between-abbreviations: "m./n." → "m/n."
  const normalized = parsing.replace(/(\w+)\.\//g, '$1/')

  // Split on '.' to get tokens, filter empty strings
  const rawTokens = normalized.split('.').map(t => t.trim()).filter(Boolean)

  // Buckets for each grammatical category
  const buckets = { tense: null, voice: null, mood: null, person: null, number: null, gender: null, case: null, misc: [] }

  for (const tok of rawTokens) {
    // Person+number combo: 1sg, 3pl, etc.
    const pn = tok.match(/^([123])(sg|pl)$/)
    if (pn) {
      buckets.person = PERSON_MAP[pn[1]]
      buckets.number = NUMBER_MAP[pn[2]]
      continue
    }
    const classified = classifyMaybeSlash(tok)
    if (!classified) continue
    if (classified.cat === 'misc') {
      buckets.misc.push(classified.value)
    } else {
      buckets[classified.cat] = classified.value
    }
  }

  // Determine form type and emit chips in canonical order
  const isParticiple  = buckets.mood === 'μετοχή'
  const isFiniteVerb  = buckets.person !== null
  const isInfinitive  = buckets.mood === 'ἀπαρέμφατος'

  let chips = []

  if (isParticiple) {
    // Participle: χρόνος · διάθεσις · γένος · ἀριθμός · πτῶσις
    if (buckets.tense)  chips.push(buckets.tense)
    if (buckets.voice)  chips.push(buckets.voice)
    chips.push('μετοχή')
    if (buckets.gender) chips.push(buckets.gender)
    if (buckets.number) chips.push(buckets.number)
    if (buckets.case)   chips.push(buckets.case)
  } else if (isFiniteVerb) {
    // Finite verb: χρόνος · διάθεσις · ἔγκλισις · πρόσωπον · ἀριθμός
    if (buckets.tense)  chips.push(buckets.tense)
    if (buckets.voice)  chips.push(buckets.voice)
    if (buckets.mood)   chips.push(buckets.mood)
    if (buckets.person) chips.push(buckets.person)
    if (buckets.number) chips.push(buckets.number)
  } else if (isInfinitive) {
    if (buckets.tense)  chips.push(buckets.tense)
    if (buckets.voice)  chips.push(buckets.voice)
    chips.push('ἀπαρέμφατος')
  } else if (buckets.gender || buckets.case) {
    // Noun/adjective: γένος · ἀριθμός · πτῶσις
    if (buckets.gender) chips.push(buckets.gender)
    if (buckets.number) chips.push(buckets.number)
    if (buckets.case)   chips.push(buckets.case)
  } else {
    // Misc (adverbs, pronouns, etc.)
    if (buckets.number) chips.push(buckets.number)
    chips.push(...buckets.misc)
  }

  // Append any leftover misc (preps, etc.)
  if (!isParticiple && !isFiniteVerb && !isInfinitive && !(buckets.gender || buckets.case)) {
    // already handled above
  } else {
    chips.push(...buckets.misc)
  }

  return chips.length ? { gloss, chips } : null
}

// Subject-pronoun → person + number inference for verb glosses that lack parenthetical parsing
const GLOSS_PERSON = [
  { pattern: /^i\s/i,              person: 'πρῶτον πρόσωπον',  number: 'ἑνικός' },
  { pattern: /^you\s/i,            person: 'δεύτερον πρόσωπον', number: 'ἑνικός' },
  { pattern: /^he\s|^she\s|^it\s/i, person: 'τρίτον πρόσωπον',  number: 'ἑνικός' },
  { pattern: /^we\s/i,             person: 'πρῶτον πρόσωπον',  number: 'πληθυντικός' },
  { pattern: /^they\s/i,           person: 'τρίτον πρόσωπον',  number: 'πληθυντικός' },
]

/**
 * For verb glosses with no parenthetical (e.g. "they see"), infers person and number
 * from the English subject pronoun.
 * Returns { gloss, chips, inferred: true } or null.
 */
export function inferVerbChips(definition) {
  if (!definition) return null
  // Skip if there's already a parenthetical — parseDefinition handles those
  if (/\([^)]+\)\s*$/.test(definition)) return null

  const def = definition.trim()
  for (const { pattern, person, number } of GLOSS_PERSON) {
    if (pattern.test(def)) {
      return { gloss: def, chips: [person, number], inferred: true }
    }
  }
  return null
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

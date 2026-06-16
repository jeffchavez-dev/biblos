#!/usr/bin/env node
/**
 * build-refs.js
 *
 * Builds public/refs.json — a Strong's-number-keyed index of NT scripture
 * references for every vocabulary word in Biblos.
 *
 * Data sources (CC BY 4.0):
 *   TBESG — Translators Brief lexicon of Extended Strongs for Greek
 *   TAGNT — Translators Amalgamated Greek New Testament (Mat-Jhn, Act-Rev)
 *   Both from https://github.com/STEPBible/STEPBible-Data
 *
 * Usage:
 *   node scripts/build-refs.js
 *
 * The script downloads source files on first run and caches them in
 * scripts/data/. Re-run any time to regenerate public/refs.json.
 */

import fs from 'fs'
import path from 'path'
import https from 'https'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const DATA_DIR = path.join(__dirname, 'data')
const OUT_FILE = path.join(ROOT, 'public', 'refs.json')
const MAX_REFS_PER_WORD = 30  // cap to keep file size reasonable

const TBESG_URL =
  'https://raw.githubusercontent.com/STEPBible/STEPBible-Data/master/Lexicons/TBESG%20-%20Translators%20Brief%20lexicon%20of%20Extended%20Strongs%20for%20Greek%20-%20STEPBible.org%20CC%20BY.txt'

const TAGNT_URLS = [
  'https://raw.githubusercontent.com/STEPBible/STEPBible-Data/master/Translators%20Amalgamated%20OT%2BNT/TAGNT%20Mat-Jhn%20-%20Translators%20Amalgamated%20Greek%20NT%20-%20STEPBible.org%20CC-BY.txt',
  'https://raw.githubusercontent.com/STEPBible/STEPBible-Data/master/Translators%20Amalgamated%20OT%2BNT/TAGNT%20Act-Rev%20-%20Translators%20Amalgamated%20Greek%20NT%20-%20STEPBible.org%20CC-BY.txt',
]

// ── helpers ────────────────────────────────────────────────────────────────

function download(url, dest) {
  return new Promise((resolve, reject) => {
    if (fs.existsSync(dest)) { console.log(`  cached: ${path.basename(dest)}`); resolve(); return }
    console.log(`  downloading: ${path.basename(dest)} …`)
    const file = fs.createWriteStream(dest)
    https.get(url, res => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        file.close(); fs.unlinkSync(dest)
        download(res.headers.location, dest).then(resolve).catch(reject)
        return
      }
      if (res.statusCode !== 200) { reject(new Error(`HTTP ${res.statusCode} for ${url}`)); return }
      res.pipe(file)
      file.on('finish', () => { file.close(); resolve() })
    }).on('error', err => { fs.unlinkSync(dest); reject(err) })
  })
}

// Strip NFC and apply Unicode normalization so accented forms match
function normalize(str) {
  return (str || '').normalize('NFC').trim()
}

// Extract base Strong's number: "G2424G" → "G2424", "G1080_A" → "G1080"
function baseStrongs(s) {
  if (!s) return null
  // Remove trailing disambiguation letters (uppercase after digits) and instance suffixes
  return s.replace(/=.*$/, '').replace(/[A-Z]+$/, '').replace(/_[A-Za-z]+$/, '').trim()
}

// Extract the citation lemma from a Greek dictionary entry like "ἄνθρωπος, -ου, ὁ"
function citationLemma(greekField) {
  return normalize(greekField.split(',')[0].trim())
}

// ── Step 1: collect all Biblos vocabulary lemmas ───────────────────────────

function collectVocabLemmas() {
  const lemmas = new Map() // lemma → { greek, definition, chapters[] }
  const dataDir = path.join(ROOT, 'src', 'data')

  for (const unit of fs.readdirSync(dataDir)) {
    const unitPath = path.join(dataDir, unit)
    if (!fs.statSync(unitPath).isDirectory()) continue
    for (const chapter of fs.readdirSync(unitPath)) {
      const vocabFile = path.join(unitPath, chapter, 'vocabulary.json')
      if (!fs.existsSync(vocabFile)) continue
      const words = JSON.parse(fs.readFileSync(vocabFile, 'utf8'))
      for (const w of words) {
        const lemma = citationLemma(w.greek || '')
        if (!lemma) continue
        if (!lemmas.has(lemma)) {
          lemmas.set(lemma, { greek: w.greek, definition: w.definition, chapters: [] })
        }
        lemmas.get(lemma).chapters.push(`${unit}/${chapter}`)
      }
    }
  }
  return lemmas
}

// ── Step 2: parse TBESG → lemma-to-Strongs map ────────────────────────────

function parseTBESG(filePath) {
  // Returns Map<normalizedLemma, baseStrongsNum>
  const map = new Map()
  const lines = fs.readFileSync(filePath, 'utf8').split('\n')
  let inData = false

  for (const raw of lines) {
    const line = raw.replace(/^﻿/, '') // strip BOM
    if (line.startsWith('eStrong\t')) { inData = true; continue }
    if (!inData) continue
    if (!line.trim() || line.startsWith('=')) continue

    const cols = line.split('\t')
    if (cols.length < 4) continue

    const eStrong = cols[0].trim()  // e.g. G0444
    const greekField = cols[3].trim() // e.g. "ἄνθρωπος" or "α, Ἀλφα"
    if (!eStrong.match(/^G\d+/) || !greekField) continue

    const base = baseStrongs(eStrong)

    // TBESG sometimes has multiple Greek forms separated by commas or semicolons
    // Register each form
    for (const part of greekField.split(/[,;]/)) {
      const lemma = normalize(part)
      if (lemma && !map.has(lemma)) {
        map.set(lemma, base)
      }
    }
  }
  return map
}

// ── Step 3: map Biblos lemmas → Strong's numbers ──────────────────────────

// Manual overrides for entries that can't be auto-matched
// (deponents listed with active stem in TBESG, phrases, case-annotated prepositions)
const MANUAL_STRONGS = {
  'πορεύομαι':  'G4198',  // πορεύω in TBESG
  'ἀποκρίνομαι': 'G0611', // ἀποκρίνω
  'ἀναπαύομαι': 'G0373',  // ἀναπαύω
  'ἀμφότεροι':  'G0297',  // ἀμφότερος
  'ἀλλήλους':   'G0240',  // ἀλλήλων
  'ἑαυτούς':    'G1438',  // ἑαυτοῦ
  'δείκνυμι':   'G1166',  // δεικνύω
  'ῥᾴδιος':     'G4642',  // search fallback
  'πλέον':      'G4119',  // πλείων
  'οὕτω(ς)':   'G3779',  // οὕτως
  'οὐ / οὐκ':  'G3756',  // οὐ
  'οὐχί / οὐχ': 'G3780', // οὐχί
  'μέν … δέ':  'G3303',  // μέν
  'τίς; τί;':  'G5101',  // τίς
  'ποῦ;':       'G4226',  // ποῦ
  'ἐν (+ dat.)': 'G1722', // ἐν
  'εἰς (+ acc.)': 'G1519', // εἰς
  'ἐκ / ἐξ (+ gen.)': 'G1537', // ἐκ
  'ἀπό (+ gen.)': 'G0575', // ἀπό
  'πρός (+ acc.)': 'G4314', // πρός
  'ἐπί (+ dat.)': 'G1909', // ἐπί
  'ὑπό (+ dat.)': 'G5259', // ὑπό
  'ἔξω (+ gen.)': 'G1854', // ἔξω
  'ἐγγύς (+ gen.)': 'G1451', // ἐγγύς
  'πέραν (+ gen.)': 'G4008', // πέραν
  'διὰ τοῦτο':  'G1223',  // διά
  'καθ᾽ ἡμέραν': 'G2596', // κατά
  'εἰς τὸν αἰῶνα': 'G1519', // εἰς
}

function stripDiacritics(s) {
  return s.normalize('NFD').replace(/[̀-ͯ҃-ԯ]/g, '')
}

function mapLemmasToStrongs(vocabLemmas, tbesgMap) {
  const mapped = new Map()   // baseStrongsNum → { greek, definition }
  const unmapped = []

  for (const [lemma, info] of vocabLemmas) {
    let strongs = tbesgMap.get(lemma)
      || MANUAL_STRONGS[lemma]

    // Fallback: try stripping diacritics
    if (!strongs) {
      const stripped = stripDiacritics(lemma)
      for (const [tLemma, tStrongs] of tbesgMap) {
        if (stripDiacritics(tLemma) === stripped) { strongs = tStrongs; break }
      }
    }

    // Fallback: deponent — try replacing -ομαι with -ω
    if (!strongs && lemma.endsWith('ομαι')) {
      const activeForm = lemma.slice(0, -4) + 'ω'
      strongs = tbesgMap.get(activeForm)
    }

    if (strongs) {
      mapped.set(strongs, { greek: info.greek, definition: info.definition, lemma })
    } else {
      unmapped.push({ lemma, greek: info.greek })
    }
  }

  return { mapped, unmapped }
}

// ── Step 4: parse TAGNT → build refs index + verse text ──────────────────

function parseTAGNT(filePaths, targetStrongs) {
  // Pass 1: collect every word in the NT grouped by verse ref
  // Pass 2 (same loop): build refs index for target Strong's numbers
  //
  // Returns { index: Map<strongs, [{ref,word,gloss}]>, verses: Map<ref, string> }

  const index = new Map()
  for (const s of targetStrongs) index.set(s, [])

  // verseWords: ref → [{word, strongs}] — used to build verse text and find
  // which refs we actually need
  const verseWords = new Map()

  for (const filePath of filePaths) {
    console.log(`  parsing ${path.basename(filePath)} …`)
    const lines = fs.readFileSync(filePath, 'utf8').split('\n')

    for (const raw of lines) {
      const line = raw.replace(/^﻿/, '')
      if (!line.trim()) continue

      const cols = line.split('\t')
      if (cols.length < 4) continue

      // Col 0: "Mat.1.1#01=NKO" — extract reference
      const refCol = cols[0].trim()
      const refMatch = refCol.match(/^(\d?[A-Z][a-z]+\.\d+\.\d+)/)
      if (!refMatch) continue
      const ref = refMatch[1]

      // Col 1: Greek surface form (keep punctuation for verse text)
      const greekCol = cols[1].trim()
      const wordRaw = greekCol.replace(/\s*\(.*\)/, '').trim()
      const wordClean = wordRaw.replace(/[.,;·!?¶'"»«]+$/, '').trim()

      // Col 3: dStrong
      const strongsCol = cols[3].trim()
      const dStrong = strongsCol.split('=')[0]
      const base = baseStrongs(dStrong)

      // Col 4: "βίβλος=book" — dict form (lemma) = gloss
      const dictCol = (cols[4] || '').trim()
      const lemmaRaw = dictCol.split('=')[0].trim()
      const lemma = lemmaRaw || null

      // Col 3 morph: "G0976=N-NSF" → morph = "N-NSF"
      const morph = strongsCol.includes('=') ? strongsCol.split('=')[1].trim() : null

      // Accumulate verse words (all words, not just target)
      if (!verseWords.has(ref)) verseWords.set(ref, [])
      verseWords.get(ref).push({ word: wordRaw, base, gloss: cols[2]?.trim() || null, lemma, morph })

      // Col 2: English gloss
      const gloss = (cols[2] || '').replace(/[<>\[\]]/g, '').trim()

      if (base && index.has(base)) {
        const arr = index.get(base)
        if (arr.length < MAX_REFS_PER_WORD) {
          arr.push({ ref, word: wordClean, gloss })
        }
      }
    }
  }

  // Collect only the refs we actually indexed (to keep verses.json small)
  const neededRefs = new Set()
  for (const arr of index.values()) {
    for (const r of arr) neededRefs.add(r.ref)
  }

  // Build verse text strings for needed refs only
  const verses = new Map()
  for (const ref of neededRefs) {
    const words = verseWords.get(ref)
    if (!words) continue
    verses.set(ref, words.map(w => w.word).join(' '))
  }

  // Build chapter data: Map<"Book.ch", [{verse, words:[{w,g,s,l,m}]}]>
  // w=surface word, g=gloss, s=base strongs, l=lemma, m=morph
  const chapters = new Map()
  for (const [ref, words] of verseWords) {
    const [book, ch, vStr] = ref.split('.')
    const chKey = `${book}.${ch}`
    if (!chapters.has(chKey)) chapters.set(chKey, [])
    const verse = parseInt(vStr, 10)
    chapters.get(chKey).push({ verse, words: words.map(w => {
      const o = { w: w.word.replace(/[.,;·!?¶'"»«]+$/, '').trim() }
      if (w.gloss) o.g = w.gloss.replace(/[<>\[\]]/g, '').trim()
      if (w.base) o.s = w.base
      if (w.lemma) o.l = w.lemma
      if (w.morph) o.m = w.morph
      return o
    }) })
  }

  return { index, verses, chapters }
}

// ── Step 5: annotate vocabulary JSONs with strongsNum ─────────────────────

function annotateVocabularyFiles(tbesgMap) {
  const dataDir = path.join(ROOT, 'src', 'data')
  let totalAnnotated = 0

  for (const unit of fs.readdirSync(dataDir)) {
    const unitPath = path.join(dataDir, unit)
    if (!fs.statSync(unitPath).isDirectory()) continue
    for (const chapter of fs.readdirSync(unitPath)) {
      const vocabFile = path.join(unitPath, chapter, 'vocabulary.json')
      if (!fs.existsSync(vocabFile)) continue

      const words = JSON.parse(fs.readFileSync(vocabFile, 'utf8'))
      let changed = false

      for (const w of words) {
        if (w.strongsNum) continue  // already annotated
        const lemma = citationLemma(w.greek || '')
        let strongs = tbesgMap.get(lemma)

        if (!strongs) strongs = MANUAL_STRONGS[lemma]
        if (!strongs) {
          const stripped = stripDiacritics(lemma)
          for (const [tLemma, tStrongs] of tbesgMap) {
            if (stripDiacritics(tLemma) === stripped) { strongs = tStrongs; break }
          }
        }
        if (!strongs && lemma.endsWith('ομαι')) {
          strongs = tbesgMap.get(lemma.slice(0, -4) + 'ω')
        }

        if (strongs) { w.strongsNum = strongs; changed = true; totalAnnotated++ }
      }

      if (changed) {
        fs.writeFileSync(vocabFile, JSON.stringify(words, null, 2), 'utf8')
      }
    }
  }
  return totalAnnotated
}

// ── main ──────────────────────────────────────────────────────────────────

async function main() {
  fs.mkdirSync(DATA_DIR, { recursive: true })

  const tbesgFile = path.join(DATA_DIR, 'TBESG.txt')
  const tagntFiles = [
    path.join(DATA_DIR, 'TAGNT-Mat-Jhn.txt'),
    path.join(DATA_DIR, 'TAGNT-Act-Rev.txt'),
  ]

  console.log('\n1. Downloading source files …')
  await download(TBESG_URL, tbesgFile)
  for (let i = 0; i < TAGNT_URLS.length; i++) {
    await download(TAGNT_URLS[i], tagntFiles[i])
  }

  console.log('\n2. Parsing TBESG …')
  const tbesgMap = parseTBESG(tbesgFile)
  console.log(`   ${tbesgMap.size} lemma entries loaded`)

  console.log('\n3. Collecting Biblos vocabulary …')
  const vocabLemmas = collectVocabLemmas()
  console.log(`   ${vocabLemmas.size} unique lemmas`)

  console.log('\n4. Mapping lemmas to Strong\'s numbers …')
  const { mapped, unmapped } = mapLemmasToStrongs(vocabLemmas, tbesgMap)
  console.log(`   mapped: ${mapped.size}`)
  if (unmapped.length > 0) {
    console.log(`   unmapped (${unmapped.length}) — add strongsNum manually to vocabulary.json:`)
    for (const { lemma, greek } of unmapped) {
      console.log(`     ${lemma}  (from: ${greek})`)
    }
  }

  console.log('\n5. Annotating vocabulary.json files with strongsNum …')
  const annotated = annotateVocabularyFiles(tbesgMap)
  console.log(`   annotated ${annotated} words`)

  console.log('\n6. Building scripture reference index + verse text + chapter files from TAGNT …')
  const { index: refIndex, verses, chapters } = parseTAGNT(tagntFiles, new Set(mapped.keys()))

  // Build refs.json: { G0444: { lemma, definition, refs: [{ref,word,gloss}] } }
  const output = {}
  for (const [strongs, info] of mapped) {
    const refs = refIndex.get(strongs) || []
    output[strongs] = {
      lemma: info.lemma,
      definition: info.definition,
      refs,
    }
  }

  fs.writeFileSync(OUT_FILE, JSON.stringify(output), 'utf8')
  const refsKB = (fs.statSync(OUT_FILE).size / 1024).toFixed(1)
  console.log(`\n✓ Written: public/refs.json (${refsKB} KB)`)
  console.log(`  ${Object.keys(output).length} words indexed`)
  console.log(`  ${Object.values(output).reduce((n, v) => n + v.refs.length, 0)} total references`)

  // Build nt-verses.json: { "Mat.4.4": "Ὁ δὲ ἀποκριθεὶς εἶπεν…" }
  const versesOut = {}
  for (const [ref, text] of verses) versesOut[ref] = text
  const versesFile = path.join(ROOT, 'public', 'nt-verses.json')
  fs.writeFileSync(versesFile, JSON.stringify(versesOut), 'utf8')
  const versesKB = (fs.statSync(versesFile).size / 1024).toFixed(1)
  console.log(`✓ Written: public/nt-verses.json (${versesKB} KB)`)
  console.log(`  ${Object.keys(versesOut).length} unique verses`)

  // Build per-chapter files: public/nt/Mat.1.json … (all 260 NT chapters)
  const ntDir = path.join(ROOT, 'public', 'nt')
  fs.mkdirSync(ntDir, { recursive: true })
  let chapCount = 0, totalBytes = 0
  for (const [chKey, verseArr] of chapters) {
    // Sort verses in order, deduplicate (same verse can appear from multiple editions)
    const seen = new Set()
    const sorted = verseArr
      .filter(v => { if (seen.has(v.verse)) return false; seen.add(v.verse); return true })
      .sort((a, b) => a.verse - b.verse)
    const [book, ch] = chKey.split('.')
    const payload = JSON.stringify({ b: book, c: parseInt(ch, 10), verses: sorted })
    const outPath = path.join(ntDir, `${chKey}.json`)
    fs.writeFileSync(outPath, payload, 'utf8')
    totalBytes += payload.length
    chapCount++
  }
  console.log(`✓ Written: public/nt/ (${chapCount} chapter files, ${(totalBytes / 1024).toFixed(0)} KB total)`)
}

main().catch(e => { console.error(e); process.exit(1) })

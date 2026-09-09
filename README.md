# Βίβλος

A Koine Greek language-learning web app built around a narrative curriculum. Students read original Greek stories chapter by chapter, with interactive word-click definitions, vocabulary flashcards, grammar notes, and exercises.

**Live:** [biblos.app](https://biblos.app) · **Repo:** [github.com/jeffchavez-dev/biblos](https://github.com/jeffchavez-dev/biblos)

---

## Features

- **Story reader** — tokenized Greek text with per-word tap-to-define definitions
- **Vocabulary flashcards** — 413 entries with images, part-of-speech tags, and Strongs numbers
- **Λεξικόν (Lexicon)** — searchable index across all chapters; filter by part of speech, lesson, or declension group; hide-gloss mode; paradigm tables; NT scripture references; in-story context sentences
- **Grammar terms** — 63 Greek grammar terms (cases, tenses, moods, voices, etc.) tagged and searchable in the Lexicon
- **Greek Alphabet module (Βίβλος Kids)** — 5 rounds covering all 24 Greek letters; letter intro cards + two-pass quiz (letter → name, name → letter); sound effects and confetti
- **Greek NT reader** — read the New Testament in Greek (NA28) with vocabulary-linked word definitions and open-in-Lexicon
- **Multi-language UI** — English, Spanish, Polish, Filipino
- **Guest + admin access** — guest sees all content; admin sees login activity log

---

## Stack

| Layer | Tool |
|---|---|
| Frontend | React 18 + Vite |
| Styling | Plain CSS (CSS variables) |
| Icons | Tabler Icons (outline only) |
| Fonts | Gentium Plus (Greek), Crimson Pro, Inter |
| Auth | localStorage (guest / admin) |
| Hosting | Vercel (auto-deploy from `main`) |

---

## Content

**Units and chapters** (`src/data/units.json`):

| Unit | Chapters | Theme |
|---|---|---|
| Unit 1 — Ὁ Γεωργός | Ch1–Ch3 | The Farmer |
| Unit 2 — Ὁ Φίλος | Ch4–Ch6 | The Friend |
| Unit 3 — Τὸ Πνεῦμα | Ch7–Ch8 | The Holy Spirit |

Each chapter has two parts (A and B) with:
- **Story** — tokenized Greek text with per-word definitions
- **Vocabulary** — image flashcards (350 words across Ch1–Ch6)
- **Grammar** — grammar notes
- **Exercises** — multiple choice, true/false, fill-in-the-blank, verb drills, conversation questions
- **Visual Story** — illustrated panels with Greek captions

**Vocabulary counts:**

| Ch | A | B | Total |
|---|---|---|---|
| 1 | 36 | 24 | 60 |
| 2 | 27 | 24 | 51 |
| 3 | 28 | 28 | 56 |
| 4 | 36 | 35 | 71 |
| 5 | 36 | 32 | 68 |
| 6 | 44 | — | 44 |
| **Total** | | | **350** |

---

## Dev setup

```bash
npm install
npm run dev        # http://localhost:5173
```

> **Git:** commits and pushes are handled manually — Claude Code makes file changes only.

---

## Project structure

```
src/
  components/       # React components (ChapterView, Sidebar, BiblosKids, tabs/*)
  context/          # LanguageContext (EN/ES/PL/FIL UI strings)
  data/             # JSON content (story, vocabulary, exercises, grammar, visualstory)
    grammar-terms.json  # 63 Greek grammar terms for the Lexicon
  auth.js           # Session management (localStorage)
public/
  vocab-images/         # Vocabulary flashcard images
  story-images/         # Visual story panel images
  biblos-kids-images/   # Greek alphabet module images (letter, name, uppercase, lowercase)
  sounds/               # Quiz feedback sounds (correct, wrong, congrats)
scripts/            # Helper scripts (tokenizer, icon generator, translations)
```

---

## Adding a chapter

1. Create `src/data/unit{N}/chapter{N}/`
2. Add `story.json`, `vocabulary.json`, `exercises.json`, `grammar.json`, `visualstory.json`
3. Register the chapter in `src/data/units.json`
4. Add a `VOCAB_SOURCES` entry in `src/App.jsx`
5. Copy images to `public/vocab-images/` (naming: `c{N}{part}-{type}-{n}.jpeg`)

# Βίβλος

A Koine Greek language-learning web app built around a narrative curriculum. Students read original Greek stories chapter by chapter, with interactive word-click definitions, vocabulary flashcards, grammar notes, and exercises.

**Live:** [biblos.app](https://biblos.app) · **Repo:** [github.com/jeffchavez-dev/biblos](https://github.com/jeffchavez-dev/biblos)

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
- **Vocabulary** — image flashcards
- **Grammar** — grammar notes
- **Exercises** — multiple choice, true/false, fill-in-the-blank, verb drills, conversation questions
- **Visual Story** — illustrated panels with Greek captions
- **Lexicon** — searchable index of all vocabulary across all chapters

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
  components/       # React components (ChapterView, Sidebar, tabs/*)
  context/          # LanguageContext (EN/ES/PL/FIL UI strings)
  data/             # JSON content (story, vocabulary, exercises, grammar, visualstory)
  auth.js           # Session management (localStorage)
public/
  vocab-images/     # Vocabulary flashcard images
  story-images/     # Visual story panel images
scripts/            # Helper scripts (tokenizer, icon generator, translations)
```

---

## Adding a chapter

1. Create `src/data/unit{N}/chapter{N}/`
2. Add `story.json`, `vocabulary.json`, `exercises.json`, `grammar.json`, `visualstory.json`
3. Register the chapter in `src/data/units.json`
4. Add a `VOCAB_SOURCES` entry in `src/App.jsx`
5. Copy images to `public/vocab-images/` (naming: `c{N}{part}-{type}-{n}.jpeg`)

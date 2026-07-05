# Βίβλος — Claude Code Project Guide

This file is loaded automatically at the start of every Claude Code session.
Update it whenever a significant feature is added, changed, or removed.

---

## Project Overview

**Βίβλος** is a Koine Greek language-learning web app — a React + Vite SPA built around a narrative curriculum. Students read original Greek stories chapter by chapter, with interactive word-click definitions, vocabulary flashcards, and grammar notes.

Live repo: `https://github.com/jeffchavez-dev/biblos`

---

## Tech Stack

| Layer | Tool |
|---|---|
| Frontend | React 18 + Vite |
| Styling | Plain CSS (CSS variables in `src/index.css`) |
| Icons | Tabler Icons webfont (outline only — no `-filled` suffixes) |
| Fonts | Gentium Plus (Greek), Crimson Pro, Inter |
| Auth | localStorage (`biblos_session` = `'guest'` \| `'admin'` \| null) |
| Login log | localStorage (`biblos_login_log`, JSON array, max 200 events) |
| Content | JSON files under `src/data/` |
| Images | `public/vocab-images/` |

---

## Content Structure

### Units and Chapters (`src/data/units.json`)

| Unit | Chapters | Theme |
|---|---|---|
| Unit 1 — Ὁ Γεωργός | Ch1, Ch2, Ch3 | The Farmer |
| Unit 2 — Ὁ Φίλος | Ch4, Ch5, Ch6 | Jesus / The Friend |
| Unit 3 — Τὸ Πνεῦμα | Ch7, Ch8 | The Holy Spirit |

Each chapter entry in `units.json` has: `id`, `title`, `subtitle`, `translations` (es/pl/fil), `locked`, `parts` (array of `{id, label, subtitle}`).

### Chapter Data Files (`src/data/unit{N}/chapter{N}/`)

Every chapter folder contains these five files:

| File | Purpose |
|---|---|
| `story.json` | Tokenized Greek text with per-word definitions |
| `vocabulary.json` | Flashcard vocabulary list with images |
| `exercises.json` | Practice exercises (empty `[]` if not yet written) |
| `grammar.json` | Grammar notes (empty `[]` if not yet written) |
| `visualstory.json` | Visual story panels — uses `"panels": []` key (NOT `"scenes"`) |

### story.json format

```json
{
  "title": "Κεφάλαιον Αʹ — ...",
  "titleTranslation": "Chapter 1 — ...",
  "paragraphs": [
    {
      "id": 1,
      "label": "Μέρος Αʹ — ... (Part A — ...)",  // ← only on FIRST para of each part
      "words": [
        { "greek": "ὁ", "definition": "the (nom.m.sg.)" }
      ]
    }
  ]
}
```

**Part switching** is triggered by `label` containing `Αʹ` or `Βʹ` — the StoryTab uses this to filter paragraphs by `activePart`. Do NOT use a nested `parts` key.

### vocabulary.json format

```json
[
  {
    "id": 1,
    "part": "A",
    "lemma": "ὁ γεωργός",
    "strongs": "G1092",
    "gloss": "farmer",
    "definition": "One who tills the earth; a farmer or agricultural worker.",
    "image": "/vocab-images/c1-noun-1.jpeg",
    "translations": { "es": "agricultor", "pl": "rolnik", "fil": "magsasaka" }
  }
]
```

**Image naming convention:** `c{chapterNum}{partLetter}-{type}-{n}.jpeg`
Examples: `c5b-noun-1.jpeg`, `c7-verb-2.jpeg`, `c8a-adj-1.jpeg`
Images live in `public/vocab-images/`.

### Vocabulary word counts (as of last update)

| Chapter | Part A | Part B | Total |
|---|---|---|---|
| Ch1 | 36 | 24 | 60 |
| Ch2 | 27 | 24 | 51 |
| Ch3 | 28 | 28 | 56 |
| Ch4 | 36 | 35 | 71 |
| Ch5 | 36 | 32 | 68 |
| Ch6 | 44 | — | 44 |
| Ch7 | 0 | 0 | — (not yet added) |
| Ch8 | 0 | 0 | — (not yet added) |
| **Total** | | | **350** |

---

## App Architecture

### Session / Auth (`src/auth.js`)

```js
// Hardcoded admin credentials (replace with real backend later)
ADMIN_EMAIL = 'admin@biblos.app'
ADMIN_PASSWORD = 'Biblos2024!'

checkAdminCredentials(email, password)  // → boolean
recordLoginEvent(type, email)           // writes to localStorage
getLoginLog()                           // reads from localStorage
getSession() / setSession(role) / clearSession()
```

### App routing (`src/App.jsx`)

```
App (owns session state)
 ├── !session       → <LoginPage onEnter={handleEnter} />
 ├── session='admin'→ <AdminPage onExit={handleExit} />
 └── session='guest'→ <LanguageProvider><AppInner onSignOut={handleSignOut} /></LanguageProvider>
```

**Critical pattern:** `handleSignOut` must be defined in `App` (which owns `setSession`), then passed as prop to `AppInner → Sidebar`. Never try to call `setSession` from inside `AppInner` — it has no closure over it.

### VOCAB_SOURCES (`src/App.jsx`)

When adding a new chapter, add its vocabulary import here:

```js
const VOCAB_SOURCES = [
  { file: () => import('./data/unit1/chapter1/vocabulary.json'), unit: 1, chapter: 1 },
  // ... one entry per chapter
  { file: () => import('./data/unit3/chapter8/vocabulary.json'), unit: 3, chapter: 8 },
]
```

---

## Checklist: Adding a New Chapter

1. **Create folder:** `src/data/unit{N}/chapter{N}/`
2. **Write story.json** — tokenize with Python script (see `scripts/` for reference), ensure every word has a `definition`, flat `paragraphs` array with `label` on first para of each part
3. **Write vocabulary.json** — add flashcard entries with images
4. **Copy images** to `public/vocab-images/` with naming convention
5. **Add to `units.json`** — new chapter object with `parts` array
6. **Add to VOCAB_SOURCES** in `src/App.jsx`
7. **Stub the other files** — `exercises.json`, `grammar.json` → `[]`; `visualstory.json` → `{"panels":[]}`
8. **Verify in browser** — navigate to chapter, check Story tab (both parts), Vocabulary tab

---

## Checklist: Adding Vocabulary to an Existing Chapter

1. Add image files to `public/vocab-images/` (follow naming convention)
2. Add entries to the chapter's `vocabulary.json`
3. Assign sequential `id` values continuing from the last existing entry
4. Verify word count is correct in browser (Λεξικόν badge total updates automatically)

---

## Key Components

| Component | File | Notes |
|---|---|---|
| App shell & routing | `src/App.jsx` | Session state, nav history stack |
| Sidebar | `src/components/Sidebar.jsx` | Unit/chapter list, gear button, Λεξικόν |
| Chapter view | `src/components/ChapterView.jsx` | Tab switcher, floating nav pill (‹ ›) |
| Story tab | `src/components/tabs/StoryTab.jsx` | Word-click definitions, part switching |
| Vocabulary tab | `src/components/tabs/VocabularyTab.jsx` | Flashcard grid |
| Vocabulary index | `src/components/VocabularyIndex.jsx` | Full Λεξικόν (all words) |
| Login page | `src/components/LoginPage.jsx` | Split-panel landing |
| Admin page | `src/components/AdminPage.jsx` | Login activity log (localStorage only) |
| GNT Reader | `src/components/GntReader.jsx` | Greek New Testament reader |

---

## Known Patterns & Gotchas

- **Tabler icons:** Use outline class names only — e.g., `ti ti-settings`. No `-filled` suffix. Check at tabler.io/icons if unsure a name exists.
- **visualstory.json:** Key must be `"panels"`, not `"scenes"`.
- **story.json part split:** The `label` field on a paragraph (containing `Αʹ` or `Βʹ`) triggers the part switch in StoryTab. No `label` = stays in current part.
- **JSON trailing commas:** Invalid in JSON — Vite will crash silently or with an unhelpful error. Always validate with `python3 -c "import json; json.load(open('file.json'))"`.
- **HMR stale modules:** If you delete a data file that was previously imported, restart the Vite server (`preview_stop` + `preview_start`).
- **Favicon:** Defined in `index.html` with both `.ico` and `.png` variants. `apple-touch-icon` is iOS home screen only — not enough for browser tabs.

---

## Pending / Future Work

- **Ch7 vocabulary** — vocab images not yet added; `vocabulary.json` is empty `[]`
- **Ch8 vocabulary** — vocab images not yet added; `vocabulary.json` is empty `[]`
- **Ch6 grammar.json** — still contains old grammar notes from prior story; needs update to match current Ch6 content
- **Real backend for admin login tracking** — currently per-device localStorage only. Recommended: Supabase `login_events` table + `@supabase/supabase-js`. See auth.js for the insertion point (`recordLoginEvent`).
- **User registration / real auth** — "Sign up free" on LoginPage is not yet wired up; only the hardcoded admin can sign in beyond guest mode.
- **Exercises & grammar content** — most chapters have empty stubs; content not yet written.
- **Visual story panels** — all chapters have empty `panels: []`; artwork/panels not yet added.

---

## Dev Server

```bash
npm run dev   # starts on http://localhost:5173
```

Or use the Claude Code preview tool (`preview_start` with name `biblos-dev`).

---

*Last updated: 2026-07-05 — Added Ch8 (Κεφάλαιον Ηʹ — Τὸ Πνεῦμα τὸ Ἅγιον)*

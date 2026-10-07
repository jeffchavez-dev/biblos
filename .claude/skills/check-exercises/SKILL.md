---
name: check-exercises
description: Validate that an exercises.json file uses only words and forms attested in the stories up to and including the target chapter. Run this after writing any exercises before committing.
---

## What This Skill Does

Checks every word in every exercise field (questions, options, statements, prompts, explanations, answers) against the full vocabulary corpus — all story.json files from Ch1 through the target chapter. Flags any word not found in that corpus.

This enforces the core rule: **exercises must not introduce vocabulary or forms the student has never encountered in the stories.**

---

## Step 1 — Identify the Target Chapter

The user will invoke this skill with a chapter number, e.g. `/check-exercises ch5` or `/check-exercises chapter 5`.

If no chapter is specified, ask which chapter's exercises to check.

Determine:
- The chapter number (e.g. 5)
- Its unit number (Ch1–3 = Unit 1, Ch4–6 = Unit 2, Ch7–9 = Unit 3, Ch10–11 = Unit 4)
- The path to its exercises.json

---

## Step 2 — Build the Attested Corpus

Run the following Python script via Bash. It collects every `greek` field token from all story.json files from Ch1 through the target chapter, strips punctuation, and returns a set of attested base forms.

```python
import json, re, glob, os

TARGET_CHAPTER = N  # replace with actual chapter number

# Map chapter number to unit
def chapter_to_unit(ch):
    if ch <= 3: return 1
    if ch <= 6: return 2
    if ch <= 9: return 3
    return 4

# Collect all story words up to and including the target chapter
attested = set()
for ch in range(1, TARGET_CHAPTER + 1):
    unit = chapter_to_unit(ch)
    path = f'src/data/unit{unit}/chapter{ch}/story.json'
    if not os.path.exists(path):
        continue
    with open(path) as f:
        data = json.load(f)
    for para in data['paragraphs']:
        for word in para['words']:
            raw = word['greek']
            # Strip leading/trailing punctuation but keep the word
            clean = re.sub(r'^[""\'«·,\.!?;\s]+|[""\'»·,\.!?;\s]+$', '', raw)
            clean = clean.strip()
            if clean:
                attested.add(clean)

print(f"Corpus size: {len(attested)} attested forms")
```

---

## Step 3 — Extract All Exercise Words

Extract every word from every text field in exercises.json. Check these fields across all exercise types:

| Exercise type | Fields to check |
|---|---|
| multipleChoice | question, options (each), explanation |
| trueFalse | statement, explanation |
| yesNo | question, explanation |
| thumbs | statement, explanation |
| conversationQuestions | question |
| fillBlank / fillInTheBlank | prompt, answer / answers (each), explanation |
| personChange | original, cue, answers (each), explanation |
| infinitives | prompt, answer, explanation |
| imperatives | student1, student2 / answer, explanation |
| contractVerbs | prompt, answer, explanation |
| caseFill | prompt, answer, explanation |
| prepFill | prompt, choices (each), answers (each), explanation |

**Do not check** English text inside explanations — only Greek tokens. Greek tokens are identified by Unicode range: any word containing characters in the range U+0370–U+03FF or U+1F00–U+1FFF.

Tokenize by splitting on whitespace and stripping punctuation from each token, same as the corpus step.

---

## Step 4 — Compare and Report

For each Greek token in the exercises that is NOT in the attested corpus, record:
- The exercise type (e.g. `multipleChoice`)
- The item id
- The field (e.g. `question`, `options[2]`)
- The flagged word
- The full text of the field (for context)

Then report:

```
## Exercise Check — Ch{N}

### Corpus
{X} attested forms from Ch1–Ch{N} stories.

### Flags ({Y} total)

| Type | ID | Field | Word | Context |
|---|---|---|---|---|
| multipleChoice | 3 | question | ὑπόσχεται | τί ὑπόσχεται ὁ Φίλιππος... |
| trueFalse | 7 | explanation | ἐμποδίζει | ...ὁ ὄνος ἐμποδίζει αὐτόν |

### Verdict
[PASS — no flags] or [FAIL — {Y} flags found, review before committing]
```

---

## Step 5 — Triage Flags

Not every flag is a real violation. Some Greek words are proper nouns, numbers, or particles that may not appear in story text but are unambiguously familiar. Help the user triage:

**Likely real violations** (fix these):
- Verb forms from roots never appearing in any prior story
- Nouns or adjectives completely absent from the corpus
- Technical vocabulary introduced nowhere before

**Likely false positives** (skip these):
- Proper nouns (names of people and places — Ἰάκωβος, Γαλιλαία, Ἀβραάμ)
- Greek numerals (εἷς, δύο, τρεῖς, etc.) — these are visually recognisable
- Common particles and conjunctions (ὅτε, ἐὰν, εἰ, ἆρα, ὦ, γάρ) — already known from reading
- Forms of words clearly present in corpus under a different inflection (e.g. corpus has ἔρχεται; flag is ἔρχῃ — same root, conjugation only)

For each flag, note whether it is a likely violation or likely false positive.

---

## Step 6 — Fix or Approve

After presenting the report, stop and let the developer decide:
- **Fix** — replace the flagged word with attested vocabulary
- **Approve** — mark the flag as an intentional false positive (proper noun, particle, inflectional variant of an attested root)

Do not edit the exercises file until the developer confirms which flags to fix.

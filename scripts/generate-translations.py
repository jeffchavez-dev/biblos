#!/usr/bin/env python3
"""
generate-translations.py
Scans all data JSON files for missing translations and fills them using Claude.

Usage:
  python3 scripts/generate-translations.py                  # all languages
  python3 scripts/generate-translations.py --lang es        # one language
  python3 scripts/generate-translations.py --dry-run        # preview only, no writes

Requires: ANTHROPIC_API_KEY in environment.
"""

import argparse
import json
import os
import glob
import sys
import textwrap
from pathlib import Path

try:
    import anthropic
except ImportError:
    print("Install the Anthropic SDK:  pip3 install anthropic")
    sys.exit(1)

# ── Config ────────────────────────────────────────────────────────────────────

DATA_DIR = Path(__file__).parent.parent / "src" / "data"

LANGUAGE_NAMES = {
    "es": "Spanish",
    "pl": "Polish",
    "de": "German",
    "fr": "French",
    "pt": "Portuguese",
    "it": "Italian",
    "nl": "Dutch",
    "hi": "Hindi",
}

# Max items to send in one Claude call (keeps prompts manageable)
BATCH_SIZE = 80

# ── Claude helper ─────────────────────────────────────────────────────────────

def translate_batch(client, items: list[dict], lang_code: str, context: str) -> dict:
    """
    Send a batch of {id, text} items to Claude and get back {id: translation}.
    `context` describes what kind of text this is (e.g. "vocabulary definitions").
    """
    lang_name = LANGUAGE_NAMES.get(lang_code, lang_code)
    numbered = "\n".join(f'{i["id"]}. {i["text"]}' for i in items)

    prompt = textwrap.dedent(f"""
        You are translating content for a Koine Greek language learning app.
        Translate the following {context} from English into {lang_name}.

        Rules:
        - Keep translations concise — match the brevity of the English original.
        - For vocabulary definitions, use natural {lang_name} equivalents (not word-for-word).
        - For biblical/theological terms (God, Lord, faithful, grace, etc.), use the standard {lang_name} term used in {lang_name} Bible translations.
        - For verb definitions starting with "I …" (e.g. "I carry"), keep the first-person form.
        - Do NOT translate Greek words — only translate the English meaning.
        - Return ONLY a JSON object mapping each number to its {lang_name} translation.
          Example format: {{"1": "translation one", "2": "translation two"}}

        Items to translate:
        {numbered}
    """).strip()

    response = client.messages.create(
        model="claude-opus-4-8",
        max_tokens=4096,
        messages=[{"role": "user", "content": prompt}],
    )

    raw = response.content[0].text.strip()
    # Strip markdown fences if present
    if raw.startswith("```"):
        raw = raw.split("\n", 1)[1].rsplit("```", 1)[0].strip()

    result = json.loads(raw)
    return {str(k): v for k, v in result.items()}


def translate_items(client, items: list[dict], lang_code: str, context: str) -> dict:
    """Split into batches, translate all, merge results."""
    all_results = {}
    for start in range(0, len(items), BATCH_SIZE):
        chunk = items[start : start + BATCH_SIZE]
        print(f"    Translating batch {start//BATCH_SIZE + 1} ({len(chunk)} items) → {lang_code.upper()}…")
        all_results.update(translate_batch(client, chunk, lang_code, context))
    return all_results


# ── File processors ───────────────────────────────────────────────────────────

def process_vocabulary(client, path: Path, langs: list[str], dry_run: bool):
    words = json.load(open(path))
    changed = False

    for lang in langs:
        missing = [w for w in words if lang not in (w.get("translations") or {})]
        if not missing:
            continue

        print(f"  {path.relative_to(DATA_DIR)}: {len(missing)} vocab definitions → {lang.upper()}")
        if dry_run:
            continue

        items = [{"id": str(w["id"]), "text": w["definition"]} for w in missing]
        results = translate_items(client, items, lang, "Greek vocabulary definitions")

        for w in missing:
            if str(w["id"]) in results:
                if "translations" not in w or w["translations"] is None:
                    w["translations"] = {}
                w["translations"][lang] = results[str(w["id"])]
                changed = True

    if changed and not dry_run:
        with open(path, "w") as f:
            json.dump(words, f, ensure_ascii=False, indent=2)
        print(f"  ✓ Saved {path.relative_to(DATA_DIR)}")


def process_story(client, path: Path, langs: list[str], dry_run: bool):
    data = json.load(open(path))
    paragraphs = data.get("paragraphs", [])
    changed = False

    for lang in langs:
        # 1. Paragraph-level translations
        missing_paras = [
            p for p in paragraphs
            if p.get("translation") and lang not in (p.get("translations") or {})
        ]
        if missing_paras:
            print(f"  {path.relative_to(DATA_DIR)}: {len(missing_paras)} paragraph translations → {lang.upper()}")
            if not dry_run:
                items = [{"id": str(p["id"]), "text": p["translation"]} for p in missing_paras]
                results = translate_items(client, items, lang, "story paragraph translations")
                for p in missing_paras:
                    if str(p["id"]) in results:
                        if "translations" not in p or p["translations"] is None:
                            p["translations"] = {}
                        p["translations"][lang] = results[str(p["id"])]
                        changed = True

        # 2. Word-level glosses (inline popover definitions)
        all_words = [w for p in paragraphs for w in p.get("words", []) if w.get("definition")]
        missing_words = [w for w in all_words if lang not in (w.get("translations") or {})]
        if missing_words:
            print(f"  {path.relative_to(DATA_DIR)}: {len(missing_words)} word glosses → {lang.upper()}")
            if not dry_run:
                # Deduplicate by definition text so we don't translate the same gloss twice
                seen = {}
                unique = []
                for i, w in enumerate(missing_words):
                    key = w["definition"]
                    if key not in seen:
                        seen[key] = str(i)
                        unique.append({"id": str(i), "text": key})

                results = translate_items(client, unique, lang, "brief Greek word glosses (very short definitions)")

                for i, w in enumerate(missing_words):
                    lookup_id = seen.get(w["definition"])
                    if lookup_id and lookup_id in results:
                        if "translations" not in w or w["translations"] is None:
                            w["translations"] = {}
                        w["translations"][lang] = results[lookup_id]
                        changed = True

    if changed and not dry_run:
        with open(path, "w") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print(f"  ✓ Saved {path.relative_to(DATA_DIR)}")


def process_visualstory(client, path: Path, langs: list[str], dry_run: bool):
    data = json.load(open(path))
    panels = data.get("panels", [])
    changed = False

    for lang in langs:
        missing = [p for p in panels if p.get("englishCaption") and lang not in (p.get("captionTranslations") or {})]
        if not missing:
            continue

        print(f"  {path.relative_to(DATA_DIR)}: {len(missing)} panel captions → {lang.upper()}")
        if dry_run:
            continue

        items = [{"id": str(p["id"]), "text": p["englishCaption"]} for p in missing]
        results = translate_items(client, items, lang, "visual story panel captions (1–3 short sentences describing a scene)")

        for p in missing:
            if str(p["id"]) in results:
                if "captionTranslations" not in p or p["captionTranslations"] is None:
                    p["captionTranslations"] = {}
                p["captionTranslations"][lang] = results[str(p["id"])]
                changed = True

    if changed and not dry_run:
        with open(path, "w") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print(f"  ✓ Saved {path.relative_to(DATA_DIR)}")


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Generate missing translations for Biblos data files.")
    parser.add_argument("--lang", help="Comma-separated language codes to generate (default: all configured)")
    parser.add_argument("--dry-run", action="store_true", help="Show what would be translated without calling the API")
    args = parser.parse_args()

    langs = args.lang.split(",") if args.lang else list(LANGUAGE_NAMES.keys())[:2]  # default: es, pl

    if not args.dry_run and not os.environ.get("ANTHROPIC_API_KEY"):
        print("Error: ANTHROPIC_API_KEY environment variable not set.")
        print("  export ANTHROPIC_API_KEY=sk-ant-…")
        sys.exit(1)

    client = anthropic.Anthropic() if not args.dry_run else None

    print(f"{'[DRY RUN] ' if args.dry_run else ''}Scanning for missing translations: {', '.join(l.upper() for l in langs)}\n")

    # Vocabulary
    for path in sorted(DATA_DIR.glob("**/vocabulary.json")):
        process_vocabulary(client, path, langs, args.dry_run)

    # Stories
    for path in sorted(DATA_DIR.glob("**/story.json")):
        process_story(client, path, langs, args.dry_run)

    # Visual stories
    for path in sorted(DATA_DIR.glob("**/visualstory.json")):
        process_visualstory(client, path, langs, args.dry_run)

    print("\nDone.")
    if args.dry_run:
        print("Run without --dry-run to generate translations.")


if __name__ == "__main__":
    main()

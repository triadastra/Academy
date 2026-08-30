"""Write enriched note bodies back into the course-notes corpus.

Run:  python3 scripts/apply_enriched_notes.py

Reads public/.notes-enriched.json (produced by enrich_notes.py) and rebuilds
each note's markdown as: title heading + IDX attribution + enriched body +
the Sources block. Notes with no enrichment keep their original fragments, so
this is safe to run part-way through a long enrichment.

`enriched: true` is set on the notes that were rewritten, so the app (and a
later pass) can tell prose from fragments.
"""

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CORPUS = ROOT / "public" / "course-notes.json"
CACHE = ROOT / "public" / ".notes-enriched.json"

ATTRIBUTION = (
    "> Compiled from Indexademics (IDX) study guides. Original documents by the "
    "IDX club; please keep this credit on any copy."
)


def sources_block(markdown: str) -> str:
    match = re.search(r"\n## Sources\n.*$", markdown, flags=re.S)
    return match.group(0) if match else ""


def main():
    notes = json.loads(CORPUS.read_text())
    cache = json.loads(CACHE.read_text()) if CACHE.exists() else {}

    applied = 0
    for note in notes:
        body = cache.get(note["id"])
        if not body:
            continue
        # Strip any title heading the model added back in; the corpus owns it.
        body = re.sub(r"^#\s+.*\n", "", body).strip()
        note["markdown"] = (
            f"# {note['code']} {note['title']}\n\n{ATTRIBUTION}\n\n{body}"
            + sources_block(note["markdown"])
        )
        note["enriched"] = True
        # The first paragraph of real prose makes a better summary than the
        # first long fragment did.
        summary = next(
            (
                line.strip()
                for line in body.split("\n")
                if len(line.strip()) > 60 and not line.startswith(("#", "-", ">", "*"))
            ),
            note.get("summary", ""),
        )
        note["summary"] = re.sub(r"\*\*|\$", "", summary)[:220]
        applied += 1

    CORPUS.write_text(json.dumps(notes, ensure_ascii=False, separators=(",", ":")) + "\n")
    size = CORPUS.stat().st_size / 1024 / 1024
    print(f"applied {applied} enriched notes of {len(notes)} ({size:.1f} MB) -> {CORPUS}")


if __name__ == "__main__":
    main()

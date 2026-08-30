"""Split the IDX study guides into per-level source material.

`import_arcana_notes.py` deliberately MERGES the S / S+ / H / H+ versions of a
topic into one note — the union of what all levels taught. That was right when
the app served one set of notes per course, and is wrong now: SHSID teaches
different content at each level, so a student must see only the notes their own
level's guides actually cover.

This script does the opposite. It keys every extracted topic by
(course, level) and never merges across levels, so each level's material stays
exactly as its own guides left it. The output is the writing source for
`content/notes/<course>/<level>/` — nothing here is shipped to students
directly.

    python3 scripts/extract_level_fragments.py --source ~/Arcana-1

Writes build/level-fragments.json and prints a coverage table.
"""
import argparse
import json
import re
import sys
from collections import defaultdict
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import import_arcana_notes as imp  # noqa: E402

ROOT = Path(__file__).resolve().parents[1]
LEVELS = ["S", "S+", "H", "H+", "—"]  # "—" = unlevelled (AP/IB/AL, or no marker)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", required=True, type=Path)
    parser.add_argument("--idxdb", type=Path)
    parser.add_argument("--out", type=Path, default=ROOT / "build" / "level-fragments.json")
    args = parser.parse_args()

    docs = imp.load_documents(args.source)
    by_folder = imp.folder_index(args.idxdb) if args.idxdb else {}

    # (course, level) -> topic key -> [(body, doc)]  — never merged across levels.
    topics = defaultdict(lambda: defaultdict(list))
    meta = {}
    for name, lines in docs.items():
        course, level = imp.classify(name, by_folder)
        if not course:
            continue
        for code, title, body in imp.sections_from(lines, imp.title_from_filename(name)):
            key = imp.norm(title)[:48]
            if not key:
                continue
            topics[(course, level)][key].append((body, name))
            # Within one level, keep the code/title from the fullest version.
            best = meta.get((course, level, key))
            if not best or len(body) > best[0]:
                meta[(course, level, key)] = (len(body), code, title)

    out = []
    for (course, level), course_topics in sorted(topics.items(), key=lambda kv: (kv[0][0], kv[0][1] or '')):
        for key, versions in course_topics.items():
            # Same topic in two guides at the SAME level is a genuine duplicate
            # (a review guide and its practice set), so merging those is safe.
            versions.sort(key=lambda v: len(v[0]), reverse=True)
            body, contributors = imp.merge_versions(
                [(0, b, d) for b, d in versions]
            )
            if len(body) < 4:
                continue
            _size, code, title = meta[(course, level, key)]
            if imp.is_junk_title(title):
                continue
            out.append(
                {
                    "courseId": course,
                    **({"level": level} if level else {}),
                    "code": code,
                    "title": title,
                    "points": body,
                    "sourceDocs": [doc for doc, _ in contributors],
                }
            )

    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(out, indent=1, ensure_ascii=False))

    grid = defaultdict(lambda: defaultdict(int))
    for frag in out:
        grid[frag["courseId"]][frag.get("level") or "—"] += 1
    print(f"{'course':22} " + " ".join(f"{l:>5}" for l in LEVELS) + "   total")
    for course in sorted(grid, key=lambda c: -sum(grid[c].values())):
        row = grid[course]
        total = sum(row.values())
        print(f"{course:22} " + " ".join(f"{row.get(l, 0):>5}" for l in LEVELS) + f"   {total:>5}")
    print(f"\n{len(out)} topics across {len(grid)} courses -> {args.out}")


if __name__ == "__main__":
    main()

"""Compile hand-written lesson notes into the corpus the app serves.

Run:  python3 scripts/compile_notes.py

Authored lessons live as markdown under content/notes/<course-id>/, one file per
lesson, named `<code>-<slug>.md` so the leading number sets the order. They are
the real course notes: written prose, not extracted fragments.

Precedence: a written lesson replaces exactly the fragments it covers — those
whose code matches its own. Writing `03-1-what-is-ecology.md` (code 3.1) retires
the "3.1 …" fragments and leaves 3.3 and 3.4 untouched until those are written
too. Matching by chapter instead would silently delete coverage of sections not
yet authored, which is how this went wrong the first time.

Output goes to public/course-notes.json, fetched at runtime by the app.
"""

import gzip
import json
import re
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
WRITTEN = ROOT / "content" / "notes"
FRAGMENTS = ROOT / "public" / "course-notes.fragments.json"
CORPUS = ROOT / "public" / "course-notes.json"
# Per-course shards, which are what the deployed app actually fetches.
SHARDS = ROOT / "public" / "notes"
MANIFEST = SHARDS / "manifest.json"

ATTRIBUTION = (
    "> Written for SHSID from Indexademics (IDX) study guides. Original material "
    "by the IDX club; please keep this credit on any copy."
)


def chapter_of(code: str) -> str:
    """'3.1' and '3' both belong to chapter 3."""
    match = re.match(r"(\d+)", code or "")
    return match.group(1) if match else ""


LEVELS = {"S", "S+", "H", "H+"}


def load_written():
    """(course id, level) -> [(code, title, markdown)] from content/notes/.

    Lessons live at content/notes/<course>/<level>/<lesson>.md. SHSID teaches
    different material at each level, so the level is part of a lesson's
    identity, not a tag on it — two levels of the same course share neither a
    numbering scheme nor a syllabus. A lesson placed directly under <course>/
    predates level scoping and is emitted with no level, which makes it visible
    at every level.
    """
    written = defaultdict(list)
    if not WRITTEN.is_dir():
        return written
    for path in sorted(WRITTEN.rglob("*.md")):
        level = path.parent.name if path.parent.name in LEVELS else None
        course = path.parent.parent.name if level else path.parent.name
        body = path.read_text().strip()
        heading = re.search(r"^#\s+(.+)$", body, re.M)
        if not heading:
            print(f"  ! {path.relative_to(ROOT)} has no '# ' title — skipped")
            continue
        title = heading.group(1).strip()
        # "03-1-what-is-ecology.md" -> code "3.1"
        stem = path.stem
        numbers = re.match(r"(\d+)(?:-(\d+))?", stem)
        code = f"{int(numbers.group(1))}.{numbers.group(2)}" if numbers and numbers.group(2) else (
            str(int(numbers.group(1))) if numbers else "1"
        )
        # Prefer the code stated in the title ("3.1 What Is Ecology?").
        in_title = re.match(r"^(\d+(?:\.\d+)?)\s+(.*)$", title)
        if in_title:
            code, title = in_title.group(1), in_title.group(2).strip()
        written[(course, level)].append((code, title, body))
    return written


def main():
    fragments = json.loads(FRAGMENTS.read_text()) if FRAGMENTS.exists() else []
    written = load_written()

    # Section codes that now have an authored lesson, per course.
    authored = defaultdict(set)
    for (course, _level), lessons in written.items():
        for code, _title, _body in lessons:
            authored[course].add(code)

    # Some courses' fragments carry meaningless sequential codes (Physics 9's
    # run 1..89), so code matching can never retire them. Dropping a marker file
    # in the course directory declares the course fully written and retires
    # whatever fragments remain. It is deliberately explicit: an automatic rule
    # would eventually delete coverage that had not actually been replaced.
    finished = {
        path.parent.name for path in WRITTEN.glob("*/_written") if WRITTEN.is_dir()
    }

    def covered(course, code):
        """A fragment is covered when its course is finished, when an authored
        lesson has the same code, or when a whole-chapter lesson ('3') covers a
        section of it ('3.4')."""
        if course in finished:
            return True
        codes = authored.get(course, set())
        return code in codes or chapter_of(code) in codes

    notes = []
    replaced = 0
    for fragment in fragments:
        if covered(fragment["courseId"], fragment.get("code", "")):
            replaced += 1
            continue
        notes.append(fragment)

    for (course, level), lessons in written.items():
        for code, title, body in lessons:
            markdown = body if ATTRIBUTION in body else body.replace(
                f"# {code} {title}", f"# {code} {title}\n\n{ATTRIBUTION}", 1
            )
            if ATTRIBUTION not in markdown:  # title had no code prefix
                markdown = re.sub(r"^(#\s+.+)$", rf"\1\n\n{ATTRIBUTION}", body, count=1, flags=re.M)
            # The summary is the lead paragraph, so drop everything that reads
            # as noise once flattened: headings, callouts, tables, code fences.
            prose = re.sub(r"^```.*?^```", "", body, flags=re.M | re.S)
            prose = re.sub(r"^#.*$|^>.*$|^\|.*$", "", prose, flags=re.M)
            # Summaries render as plain text, so inline markers would show raw.
            prose = re.sub(r"\*\*|\$", "", prose).replace("`", "")
            summary = re.sub(r"\s+", " ", prose).strip()
            notes.append(
                {
                    # The level is part of the id: two levels of a course
                    # legitimately both have a "3.1", and they are different
                    # lessons.
                    "id": f"written-{course}-{level or 'all'}-{code}",
                    "courseId": course,
                    **({"level": level} if level else {}),
                    "code": code,
                    "title": title,
                    "summary": summary[:200],
                    "revision": 1,
                    "updated": "Course notes",
                    "markdown": markdown,
                    "sections": [],
                    "written": True,
                }
            )

    # Order each course by chapter then section.
    by_group = defaultdict(list)
    for note in notes:
        by_group[(note["courseId"], note.get("level") or "")].append(note)
    out = []
    for _group, group_notes in sorted(by_group.items()):
        group_notes.sort(
            key=lambda n: [int(p) for p in re.findall(r"\d+", n["code"])] or [0]
        )
        out.extend(group_notes)

    CORPUS.write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")) + "\n")

    # Sharded copy, one file per course, plus a manifest.
    #
    # The whole corpus is several megabytes, which is past what `lp publish`
    # will upload in a single file — it skipped it silently and would have
    # shipped a site with no notes at all. Splitting by course keeps every
    # shard well inside the cap, and means a student downloads their own
    # course rather than all twenty-eight.
    by_course: dict[str, list] = defaultdict(list)
    for note in out:
        by_course[note["courseId"]].append(note)

    if SHARDS.exists():
        for stale in SHARDS.glob("*.json"):
            stale.unlink()
    SHARDS.mkdir(parents=True, exist_ok=True)

    # Each shard is written twice: plain for the dev server and the Python
    # tooling, and gzipped for the deploy. Lesson markdown compresses to under
    # a third of its size, which is the difference between fitting the upload
    # ceiling and not. The build drops the plain copies from dist.
    manifest = []
    for course_id, notes in sorted(by_course.items()):
        body = json.dumps(notes, ensure_ascii=False, separators=(",", ":")) + "\n"
        path = SHARDS / f"{course_id}.json"
        path.write_text(body)
        gz_path = SHARDS / f"{course_id}.json.gz"
        # mtime=0 so an unchanged corpus produces byte-identical output and the
        # deploy's content hashing can tell "same" from "rebuilt".
        with gzip.GzipFile(gz_path, "wb", compresslevel=9, mtime=0) as gz:
            gz.write(body.encode("utf-8"))
        manifest.append({"courseId": course_id, "notes": len(notes),
                         "bytes": path.stat().st_size,
                         "gzBytes": gz_path.stat().st_size})
    MANIFEST.write_text(json.dumps(manifest, ensure_ascii=False, separators=(",", ":")) + "\n")

    total_written = sum(len(v) for v in written.values())
    courses = {course for course, _level in written}
    print(f"{total_written} written lessons across {len(courses)} courses, "
          f"{len(written)} course/level pairs")
    print(f"{replaced} fragments retired by an authored chapter")
    print(f"corpus: {len(out)} notes ({CORPUS.stat().st_size / 1024 / 1024:.1f} MB) -> {CORPUS}")
    largest = max(manifest, key=lambda m: m["bytes"])
    print(f"shards: {len(manifest)} course files -> {SHARDS}"
          f" (largest {largest['courseId']} {largest['bytes'] / 1024:.0f} KB)")


if __name__ == "__main__":
    main()

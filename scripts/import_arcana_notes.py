"""Compile Indexademics (IDX) study guides into Synonance course notes.

Run:
  python3 scripts/import_arcana_notes.py \
      --source /path/to/Arcana/data/arcana_index.csv \
      --idxdb  /path/to/Arcana/data/IDXDB

Source: https://github.com/CelsiaSolaraStarflare/Arcana — `data/arcana_index.csv`
is an extracted-text index of the IDX corpus, one row per line of each document.

ATTRIBUTION: the source documents carry an Indexademics notice restricting
redistribution and modification. Every note keeps an IDX credit line and lists
the guides it was compiled from. Do not strip either.

HOW A NOTE IS BUILT
The corpus covers each subject many times over — different issues, different
terms, and S / S+ / H levels of the same topic. Rather than pick one version and
throw the rest away, every version of a topic is MERGED: the fullest treatment
leads, and each later guide contributes only the lines it adds. Near-duplicate
lines are collapsed, so a topic revised three times yields one note containing
the union of what those three guides taught, not three copies of the same facts.

Text is repaired before merging: the extractor split on periods, so
abbreviations ("Dr." / "Jekyll and Mr." / "Hyde") arrive as separate lines and
are rejoined into sentences.

Idempotent: rewrites public/course-notes.json wholesale.
"""

import argparse
import csv
import json
import re
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATABASE = ROOT / "src" / "database" / "synonance.database.json"
CORPUS = ROOT / "public" / "course-notes.json"

csv.field_size_limit(10**7)

# The grade is in the folder, never the filename. Everything under this root is
# Grade 10 — its guides say "G10 PA Resource Department" internally and none say
# G9 — while the issue folders and bare subject folders are Grade 9. Ignoring
# this files a year of Grade 10 material into Grade 9 courses.
GRADE10_ROOT = "CLASS OF 7 PA S2 FINALS GUIDES"


def level_in(text):
    """Return the course level named in `text`, or None if it names none.

    The lookarounds keep "CS" from reading as an S level and keep "H" from
    matching the first half of an "H+".
    """
    for candidate in ("H+", "S+", "H", "S"):
        if re.search(rf"(?<![A-Z]){re.escape(candidate)}(?![A-Z+])", text):
            return candidate
    return None

SUBJECT_COURSES = {
    9: {
        "BIO": "hs-biology-9",
        "MATH": "hs-math-9",
        "ENG": "hs-english-9",
        "HIST": "hs-history-9",
        "CS": "hs-cs-9",
        "PHY": "hs-physics-9",
        "CHEM": "hs-chemistry-9",
        "GEO": "hs-geography-9",
        "CHI": "hs-chinese-9",
    },
    10: {
        "BIO": "hs-biology-10",
        "MATH": "hs-math-10",
        "ENG": "hs-english-10",
        "HIST": "hs-history-10",
        "CS": "hs-cs-10",
        "PHY": "hs-physics-10",
        "CHEM": "hs-chemistry-10",
        "GEO": "hs-geography-10",
        "CHI": "hs-chinese-10",
        "ECON": "hs-economics-10",
    },
    # Courses whose guides carry no grade and are taken in either year.
    None: {
        "MUSIC": "hs-music",
        "ART": "hs-visual-arts",
    },
}


# Every subject token, regardless of which grades teach it.
SUBJECT_TOKENS = {token for courses in SUBJECT_COURSES.values() for token in courses}


def course_for(subject, grade):
    """Subject + grade -> course id, falling back to the grade-agnostic set."""
    return SUBJECT_COURSES.get(grade, {}).get(subject) or SUBJECT_COURSES[None].get(subject)

# Courses the corpus needs that the catalogue did not have.
NEW_COURSES = [
    {"id": "hs-geography-9", "pathway": "HS", "code": "GEOGRAPHY 9", "title": "Geography 9",
     "subject": "Humanities", "grades": [9]},
    {"id": "hs-chinese-9", "pathway": "HS", "code": "CHINESE 9", "title": "Chinese 9",
     "subject": "Chinese", "grades": [9]},
    # Grade 9 chemistry: 44 of the 48 chemistry guides are Grade 9, so they get
    # the course they were written for rather than being folded into the Grade
    # 10 one.
    {"id": "hs-chemistry-9", "pathway": "HS", "code": "CHEMISTRY 9", "title": "Chemistry 9",
     "subject": "Science", "grades": [9]},
    # The Grade 10 half of the corpus, which the catalogue only partly had.
    {"id": "hs-biology-10", "pathway": "HS", "code": "BIOLOGY 10", "title": "Biology 10",
     "subject": "Science", "grades": [10]},
    {"id": "hs-history-10", "pathway": "HS", "code": "HISTORY 10", "title": "History 10",
     "subject": "Humanities", "grades": [10]},
    {"id": "hs-geography-10", "pathway": "HS", "code": "GEOGRAPHY 10", "title": "Geography 10",
     "subject": "Humanities", "grades": [10]},
    {"id": "hs-chinese-10", "pathway": "HS", "code": "CHINESE 10", "title": "Chinese 10",
     "subject": "Chinese", "grades": [10]},
    # The arts guides carry no grade in the code, so they read honestly
    # whichever year selects them.
    {"id": "hs-music", "pathway": "HS", "code": "MUSIC", "title": "Music",
     "subject": "Arts", "grades": [9, 10]},
    {"id": "hs-visual-arts", "pathway": "HS", "code": "VISUAL ARTS", "title": "Visual Arts",
     "subject": "Arts", "grades": [9, 10]},
    # AP courses the corpus has guides for. Like every AP/IB/AL course these
    # are shared across Grades 11-12 and carry no S/S+/H/H+ level — that
    # streaming applies to the HS sequence only.
    {"id": "ap-world-history", "pathway": "AP", "code": "AP WORLD HISTORY",
     "title": "AP World History: Modern", "subject": "Humanities", "grades": [11, 12]},
    {"id": "ap-precalculus", "pathway": "AP", "code": "AP PRECALCULUS",
     "title": "AP Precalculus", "subject": "Mathematics", "grades": [11, 12]},
]

# Any path component naming a subject, at any depth. The corpus nests subjects
# under issue folders ("ISSUE 7/…") and under year folders with subject
# subfolders ("CLASS OF 7 PA S2 FINALS GUIDES/Music/Review Guide.pdf"), where
# the filename alone says nothing.
FOLDER_SUBJECTS = {
    "BIOLOGY": "BIO", "BIO": "BIO",
    "CHEM": "CHEM", "CHEMISTRY": "CHEM",
    "CS": "CS", "COMPUTER SCIENCE": "CS",
    "ENGLISH": "ENG", "ENG": "ENG",
    "HISTORY": "HIST", "HIST": "HIST",
    "MATH": "MATH", "MATHEMATICS": "MATH",
    "PHY": "PHY", "PHYSICS": "PHY",
    "GEO": "GEO", "GEOGRAPHY": "GEO",
    "CHINESE": "CHI", "CHI": "CHI",
    "MUSIC": "MUSIC",
    "VISUAL ARTS": "ART", "ART": "ART",
    "ECONOMICS": "ECON", "ECON": "ECON",
}

# Subject words that appear spelled out in filenames as well as folders.
NAME_SUBJECTS = {
    "HISTORY": "HIST", "GEOGRAPHY": "GEO", "CHINESE": "CHI",
    "ECONOMICS": "ECON", "PHYSICS": "PHY", "CHEMISTRY": "CHEM", "BIOLOGY": "BIO",
}

# Guides that name their own course, taken verbatim from the filenames rather
# than inferred. An AP/IB/AL course is shared across Grades 11-12 and is not a
# level of the HS course that sits in the same subject folder, so these are
# matched before any grade or level logic runs.
FILENAME_COURSES = [
    ("AP-PHYSICS-1", "ap-physics-1"),
    ("AP-CHEMISTRY", "ap-chemistry"),
    ("AP PRECALCULUS", "ap-precalculus"),
    ("AP CALCULUS", "ap-calculus-ab"),
    # Named only by their folder: "History/AP Review Guide.pdf" is AP World
    # History Unit 8-9, "English/AP Review Guide.pdf" is AP English Language.
    ("HISTORY/AP ", "ap-world-history"),
    ("ENGLISH/AP ", "ap-english-lang"),
    ("ECONOMICS/AP ", "ap-economics"),
]

LEVEL_RANK = {"H+": 4, "H": 3, "S+": 2, "S": 1}

ATTRIBUTION = (
    "> Compiled from Indexademics (IDX) study guides. Original documents by the "
    "IDX club; please keep this credit on any copy."
)

HEADING = re.compile(r"^(\d{1,2}\.\d{1,2})\s+(.{3,80})$")
CHAPTER = re.compile(r"^Chapter\s+(\d{1,2})\b(.*)$", re.I)
NOISE = re.compile(
    r"^(NOTE:\s*This is an official document|Unless otherwise stated|By\s+[\w ]{2,20}$"
    r"|Page \d+|\d+$|[^\w]{0,3}$"
    # Cover pages and bylines: "IDX G9 BIOLOGY H STUDY GUIDE ISSUE 4",
    # "By Arianna, Edited by Ava". These are not course content.
    r"|.{0,20}STUDY\s*GUIDE|IDX\s+G\d|.*\bEdited by\b)", re.I
)
# A heading the extractor glued onto the end of the previous line.
EMBEDDED_HEADING = re.compile(r"(?<=[a-z)\.])\s+(\d{1,2}\.\d{1,2}\s+[A-Z])")
# Abbreviations the period-splitter broke a sentence on.
ABBREV = re.compile(r"\b(Mr|Mrs|Ms|Dr|Prof|St|Jr|Sr|vs|etc|e\.g|i\.e|approx|Fig|No)\.$", re.I)


# ── loading ────────────────────────────────────────────────────────────────

def load_documents(source: Path):
    docs = defaultdict(list)
    with source.open(newline="", encoding="utf-8", errors="replace") as handle:
        clean = (line.replace("\x00", "") for line in handle)
        for row in csv.DictReader(clean):
            name = (row.get("name") or "").strip()
            content = (row.get("content") or "").strip()
            if name and content and not NOISE.match(content):
                docs[name].append(content)
    return {name: reflow(lines) for name, lines in docs.items()}


# Some guides survived extraction with their bullet glyphs inline, so a whole
# outline arrives as one line: "• Term o detail o detail". Left alone it both
# reads badly and defeats duplicate detection, because one flattened line
# overlaps only weakly with each of the separate lines saying the same thing.
BULLET_GLYPHS = re.compile(r"\s*(?:[•▪●◦·]|(?<= )o(?= ))\s*")


def is_exercise(line):
    """Fill-in-the-blank stems are practice material, not notes.

    Whole guides are worksheets and answer keys — mostly rules of underscores
    with the content removed. Rendering those as 'shared notes' would publish
    blanks, so any line that is mostly blank is dropped, and a document that is
    nothing but blanks then falls below the minimum and contributes nothing.
    """
    if re.search(r"[_﹏＿]{6,}", line):
        return True
    filler = sum(line.count(ch) for ch in "_﹏＿—")
    return len(line) > 0 and filler / len(line) > 0.22


def tidy(line):
    """Repair spacing the extractor introduced, without changing wording."""
    line = re.sub(r"\s+([:;,.])", r"\1", line)          # "key :"      -> "key:"
    line = re.sub(r"(?<=\w) - (?=\w{2,})", "-", line)     # "Two - part" -> "Two-part"
    line = re.sub(r"\s{2,}", " ", line)
    return line.strip(" -–—")


def explode_bullets(lines):
    out = []
    for line in lines:
        # Split an embedded heading back onto its own line before anything else.
        parts = EMBEDDED_HEADING.split(line) if EMBEDDED_HEADING.search(line) else [line]
        for part in parts:
            part = part.strip()
            if not part:
                continue
            # Any glyph splits: a lone lowercase "o" between spaces is a leftover
            # bullet marker, never a word.
            if BULLET_GLYPHS.search(part):
                out.extend(
                    tidy(piece) for piece in BULLET_GLYPHS.split(part) if len(piece.strip()) > 2
                )
            else:
                out.append(tidy(BULLET_GLYPHS.sub("", part, count=1) if part[:1] in "•▪●◦·" else part))
    return [line for line in out if line and not NOISE.match(line) and not is_exercise(line)]


def reflow(lines):
    """Rejoin sentences the period-splitter broke apart."""
    lines = explode_bullets(lines)
    out = []
    for line in lines:
        # A leftover "o " bullet marker never continues the previous line —
        # guard it here, or a short preceding line re-glues what
        # explode_bullets just separated.
        if re.match(r"^o\s", line):
            out.append(re.sub(r"^o\s+", "", line))
            continue
        if out and (
            ABBREV.search(out[-1])
            or (len(out[-1]) < 26 and not out[-1].endswith((":", "?", "!")))
            or re.match(r"^[a-z,;)]", line)
        ):
            # A continuation of the previous fragment, not a new line.
            if not HEADING.match(line) and not CHAPTER.match(line):
                out[-1] = f"{out[-1]} {line}".strip()
                continue
        out.append(line)
    return out


def folder_index(idxdb: Path):
    """basename -> subject, from any subject-named component of its path.

    Basenames repeat across subjects ("Review Guide.pdf" exists under Music,
    Visual Arts and Chemistry), so a name that resolves to more than one subject
    is dropped rather than guessed at — a misfiled guide is worse than a missing
    one.
    """
    votes = defaultdict(set)
    if not idxdb or not idxdb.is_dir():
        return {}
    for path in idxdb.rglob("*"):
        if not path.is_file():
            continue
        parts = [part.upper() for part in path.relative_to(idxdb).parts[:-1]]
        subjects = {FOLDER_SUBJECTS[part] for part in parts if part in FOLDER_SUBJECTS}
        if len(subjects) == 1:
            votes[path.name].add(next(iter(subjects)))
    return {name: next(iter(s)) for name, s in votes.items() if len(s) == 1}


def grade_of(name: str):
    """10 for the Grade 10 guide root, 9 otherwise. AP guides ignore this."""
    return 10 if Path(name).parts[:1] == (GRADE10_ROOT,) else 9


def classify(name: str, by_folder=None):
    """Returns (course_id, level) — None when the guide cannot be placed."""
    upper = name.upper()
    # An AP course is named by its own guide and is not a year of the HS
    # sequence, so it is placed before the grade is consulted. AP/IB/AL courses
    # are shared across Grades 11-12 and carry no level: S/S+/H/H+ streams the
    # HS sequence only.
    for token, course in FILENAME_COURSES:
        if token in upper.replace("_", "-"):
            return course, None
    # A subject named anywhere in the path beats the filename tokens.
    subject = next(
        (FOLDER_SUBJECTS[part.upper()] for part in Path(name).parts[:-1]
         if part.upper() in FOLDER_SUBJECTS),
        None,
    )
    subject = subject or next((t for t in SUBJECT_TOKENS if f" {t} " in f" {upper} "), None)
    # Filenames that spell the subject out rather than abbreviating it.
    subject = subject or next((s for word, s in NAME_SUBJECTS.items() if word in upper), None)
    if not subject and by_folder:
        subject = by_folder.get(Path(name).name)
    if not subject:
        return None, None
    # Where the level is written differs by grade, and both are read directly
    # rather than guessed: Grade 9 puts it in a folder ("BIOLOGY/H/…"), Grade 10
    # in the filename ("H+ Review Guide.pdf").
    #
    # Two traps. `\b` after a `+` is never a boundary, so a word-boundary
    # pattern silently downgrades "S+ Review Guide.pdf" to S. And the Grade 10
    # root is called "CLASS OF 7 PA S2 FINALS GUIDES", whose "S2" reads as an
    # S level for every unlevelled guide beneath it — so that component is
    # dropped before looking.
    # A third trap: "MATH/H AND H+" holds both levels in a single folder, so
    # the folder name cannot be trusted when the filename is more specific.
    # Ask the filename first and fall back to the folders only when it is
    # silent.
    path = Path(name)
    folders = [p.upper() for p in path.parts[:-1] if p != GRADE10_ROOT]
    level = level_in(path.name.upper()) or level_in("/".join(folders))
    course = course_for(subject, grade_of(name))
    if not course:
        return None, None
    return course, level


# ── segmentation ───────────────────────────────────────────────────────────

def _split(lines, matcher):
    found, current = [], None
    for line in lines:
        heading = matcher(line)
        if heading:
            if current:
                found.append(current)
            current = (heading[0], heading[1], [])
        elif current:
            current[2].append(line)
    if current:
        found.append(current)
    return [s for s in found if len(s[2]) >= 4]


def _numbered(line):
    m = HEADING.match(line)
    return (m.group(1), m.group(2).strip()) if m else None


def _chapter(line):
    m = CHAPTER.match(line)
    if not m:
        return None
    rest = m.group(2).strip(" .:-")
    return (f"1.{m.group(1)}", f"Chapter {m.group(1)}{f' — {rest[:60]}' if rest else ''}")


def _topic_splitter():
    counter = {"n": 0}

    def matcher(line):
        if line.startswith(("-", "•", "—")) or len(line) > 52:
            return None
        if line.endswith((".", ",", ";", ":")) or not re.match(r"^[A-Z0-9]", line):
            return None
        if len(line.split()) > 7:
            return None
        counter["n"] += 1
        return (f"1.{counter['n']}", line.strip())

    return matcher


def sections_from(lines, fallback_title=""):
    for matcher in (_numbered, _chapter, _topic_splitter()):
        found = _split(lines, matcher)
        if found:
            return found
    # No headings of any kind — a formula sheet or a continuous-prose guide.
    # Keep it whole rather than discard it; a quarter of the corpus is like this.
    body = [line for line in lines if line]
    if len(body) >= 6 and fallback_title:
        return [("1.1", fallback_title, body)]
    return []


# A "title" that is really just the subject abbreviation off a filename.
JUNK_TITLE = re.compile(
    r"^(hist(ory)?|bio(logy)?|chem(istry)?|phy(sics)?|math(s)?|eng(lish)?|geo(graphy)?|cs|"
    r"chi(nese)?|econ(omics)?|music|art|idx|study guide|answers?|questions?|practice( set)?|"
    r"review( guide)?)\s*(h\+?|s\+?|ap)?$",
    re.I,
)


def is_junk_title(title: str) -> bool:
    return len(title.strip()) < 4 or bool(JUNK_TITLE.match(title.strip()))


def title_from_filename(name: str):
    """A readable note title from '5 IDX G9 GEO H.docx'."""
    stem = Path(name).stem
    stem = re.sub(r"\b(IDX|G\d+|S2|FINALS|ISSUE)\b", " ", stem, flags=re.I)
    stem = re.sub(r"^[\d\s]+|[-_]+", " ", stem)
    stem = re.sub(r"\b(H\+|S\+|H|S)\b\s*$", "", stem.strip())
    stem = re.sub(r"\s{2,}", " ", stem).strip(" -–—")
    return stem.title() if stem else "Study guide"


# ── merging across guide versions ──────────────────────────────────────────

def norm(text):
    return re.sub(r"[^a-z0-9 ]+", "", text.lower()).strip()


def tokens(text):
    return set(norm(text).split())


def is_new(line, seen_tokens):
    """True when a line adds something the merged note does not already say."""
    words = tokens(line)
    if len(words) < 3:
        return False
    for previous in seen_tokens:
        overlap = len(words & previous)
        if overlap and overlap / max(len(words), len(previous)) >= 0.8:
            return False
    return True


def merge_versions(versions):
    """versions: [(level_rank, body, doc)] newest/fullest first. Returns merged body."""
    merged, seen = [], []
    contributors = []
    for _rank, body, doc in versions:
        added = 0
        for line in body:
            if is_new(line, seen):
                seen.append(tokens(line))
                merged.append(line)
                added += 1
        if added:
            contributors.append((doc, added))
    return merged, contributors


# ── rendering ──────────────────────────────────────────────────────────────

def is_subheading(line, following):
    """A label, not a fact.

    Deliberately strict — a false positive turns a real point into a heading and
    the reader loses it. "Underlined if written by hand" and "First word
    (capital) - Genus" both used to qualify; neither is a section label.
    """
    if len(line) > 44 or len(line.split()) > 5:
        return False
    # Punctuation that means the line is stating something, not naming a section.
    if any(mark in line for mark in (":", " - ", "–", "(", ")", "=", "→", "/", ",")):
        return False
    if line.endswith((".", ",", ";")):
        return False
    if not re.match(r"^[A-Z][A-Za-z0-9 '’&]+$", line):
        return False
    # Openers that introduce a statement rather than label a section.
    if re.match(r"^(If|When|Because|Used|Underlined|Based|Assign|Goal|Series|Two|First|Second)\b", line):
        return False
    return bool(following) and len(following) > len(line)


def _code_key(code):
    parts = re.findall(r"\d+", code)
    return tuple(int(p) for p in parts) or (0,)


def markdown_for(code, title, body, contributors):
    out = [f"# {code} {title}", "", ATTRIBUTION, ""]
    open_section = False
    for index, line in enumerate(body):
        following = body[index + 1] if index + 1 < len(body) else ""
        if is_subheading(line, following):
            out += ["", f"## {line}", ""]
            open_section = True
        else:
            if not open_section:
                out += ["## Key points", ""]
                open_section = True
            out.append(f"- {line}")
    if len(contributors) > 1:
        out += ["", "## Sources", ""]
        for doc, added in contributors:
            out.append(f"- {Path(doc).name} ({added} points)")
    return "\n".join(out).strip()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", required=True, type=Path)
    parser.add_argument("--idxdb", type=Path)
    args = parser.parse_args()

    docs = load_documents(args.source)
    by_folder = folder_index(args.idxdb) if args.idxdb else {}

    # course -> topic key -> [(level_rank, body, doc)]
    topics = defaultdict(lambda: defaultdict(list))
    meta = {}
    for name, lines in docs.items():
        course, level = classify(name, by_folder)
        if not course:
            continue
        for code, title, body in sections_from(lines, title_from_filename(name)):
            key = norm(title)[:48]
            if not key:
                continue
            topics[course][key].append((LEVEL_RANK.get(level, 0), body, name))
            # Keep the code/title from the fullest version.
            best = meta.get((course, key))
            if not best or LEVEL_RANK.get(level, 0) > best[0]:
                meta[(course, key)] = (LEVEL_RANK.get(level, 0), code, title)

    notes, stats = [], []
    for course, course_topics in sorted(topics.items()):
        built = []
        merged_from = 0
        for key, versions in course_topics.items():
            versions.sort(key=lambda v: (v[0], len(v[1])), reverse=True)
            body, contributors = merge_versions(versions)
            if len(body) < 4:
                continue
            _rank, code, title = meta[(course, key)]
            if is_junk_title(title):
                continue  # a filename fragment, not a topic
            if len(contributors) > 1:
                merged_from += 1
            built.append((code, title, body, contributors))

        built.sort(key=lambda b: _code_key(b[0]))
        # Topic-split guides each restart at 1.1, so a course can end up with
        # 160 notes all labelled "1.1". When codes are not unique they carry no
        # information, so renumber the course in reading order instead.
        if len({code for code, *_ in built}) < len(built) * 0.6:
            built = [(str(index + 1), *rest) for index, (_code, *rest) in enumerate(built)]

        for code, title, body, contributors in built:
            notes.append(
                {
                    "id": f"idx-{course}-{re.sub(r'[^a-z0-9]+', '-', title.lower())[:44]}",
                    "courseId": course,
                    "code": code,
                    "title": title,
                    "summary": next(
                        (l for l in body if len(l) > 40), f"{title} — IDX study guide."
                    )[:200],
                    "revision": len(contributors),
                    "updated": "Compiled from IDX guides",
                    "markdown": markdown_for(code, title, body, contributors),
                    "sections": [],
                    "sourceDocs": [doc for doc, _ in contributors],
                }
            )
        guides = {d for versions in course_topics.values() for _, _, d in versions}
        stats.append((course, len(built), merged_from, len(guides)))

    CORPUS.parent.mkdir(parents=True, exist_ok=True)
    CORPUS.write_text(json.dumps(notes, ensure_ascii=False, separators=(",", ":")) + "\n")

    database = json.loads(DATABASE.read_text())
    kept = [n for n in database["notes"] if not n["id"].startswith("idx-")]
    changed = len(kept) != len(database["notes"])
    database["notes"] = kept

    # Courses the corpus needs but the catalogue lacked.
    existing = {c["id"] for c in database["courseCatalog"]}
    for course in NEW_COURSES:
        if course["id"] not in existing:
            database["courseCatalog"].append(course)
            changed = True
            print(f"  + catalogue course {course['id']}")

    if changed:
        database["meta"]["schemaVersion"] = database["meta"].get("schemaVersion", 1) + 1
        DATABASE.write_text(json.dumps(database, indent=2, ensure_ascii=False) + "\n")

    for course, built, merged_from, guides in stats:
        print(f"{course:<20} {built:4d} notes  {merged_from:4d} merged from 2+ guides  ({guides} guides)")
    print(f"\n{len(notes)} notes ({CORPUS.stat().st_size / 1024 / 1024:.1f} MB) -> {CORPUS}")


if __name__ == "__main__":
    main()

# Writing SHSID course notes — house brief

You are writing the real course notes a student reads. Read the source guides
IN FULL, then write lessons as prose. Do not summarise into bullet dumps.

## Reading the sources

The guides are extracted into one CSV. Read a document with:

    bash ~/.synonance-tools/rd.sh "<exact doc path from your list>"

If that script is missing, recreate it:

    mkdir -p ~/.synonance-tools && cat > ~/.synonance-tools/rd.sh <<'SH'
    #!/bin/sh
    python3 - "$1" <<'PY'
    import csv, io, sys, textwrap
    from pathlib import Path
    csv.field_size_limit(10**9)
    want = sys.argv[1]
    raw = (Path.home()/'Arcana-1/data/arcana_index.csv').read_bytes().replace(b'\x00', b'').decode('utf-8', 'replace')
    seen = set()
    for row in csv.reader(io.StringIO(raw)):
        if len(row) < 3 or row[0] != want:
            continue
        body = row[2].strip()
        if not body or body in seen:
            continue
        seen.add(body)
        print(textwrap.fill(body, 150, replace_whitespace=False, drop_whitespace=False))
    PY
    SH

The reader parses the CSV properly. An earlier version stripped every double
quote in the corpus, so book titles and code string literals arrived unquoted —
if you are re-reading a document an earlier agent worked from, quoted text may
differ from what they saw.

READ EVERY DOCUMENT IN YOUR LIST before writing. They overlap and later issues
extend earlier ones; the union is your syllabus.

## The one hard rule: strict sourcing

Write ONLY what your level's guides contain. Never add facts, examples, or
topics they do not mention — SHSID teaches different content at each level, and
importing outside material puts a student in an exam with notes for a course
they are not taking. Explaining and organising what the guides DO say is
expected; introducing what they don't is not.

Do not cross-reference lessons in other courses or other levels — a student
cannot follow those.

## Output

One markdown file per lesson, in the directory you are given:

    content/notes/<course-id>/<LEVEL>/<NN>-<N>-<slug>.md

Filename number = the section code: section 4.2 -> `04-2-niches-and-....md`,
a whole chapter 7 -> `07-1-....md`. First line must be:

    # <code> <Title>

e.g. `# 4.2 Niches and Community Interactions`. The code must match the guide's
own numbering. Do not add an attribution line — the build inserts it.

## House style

- Prose that explains, not restated bullets. Where the guides state a fact and
  the reason is evident IN THE GUIDES, make the connection explicit.
- `## Section headings` for each part of the lesson.
- Markdown tables for anything genuinely tabular (comparisons, classifications,
  formula lists). Tables render properly.
- `$inline$` and `$$display$$` LaTeX for maths. Fenced code blocks with a
  language tag for code.
- **Bold** for terms on first definition. Sparing italics.
- British spelling. No emoji. No "In this lesson we will…" preambles.
- Where a guide flags an exam tip, a common error, or an exception, keep it —
  those are the highest-value lines in the source.

## Keywords section — REQUIRED

Every lesson ends with a final section:

    ## Keywords

    | Term | Definition |
    |---|---|
    | **Term** | The definition, as the guide gives it |

Include every term the lesson defines. If a lesson defines nothing, omit the
section — but that is rare.

## When done

Report: how many lessons you wrote, their codes and titles, and anything in the
guides you deliberately left out and why.

## Three guides have a mistyped header

A few source guides carry a header naming a level other than the one they are
filed under. The folder and the filename agree with each other in every case,
so they outrank the header — write the level you were assigned and ignore the
header line:

- `CS/S/1 G9 CS S.docx` — header says H, it is S
- `HISTORY/S/1 G9 HIST S.docx` — header says H, it is S
- `PHY/H/2 G9 PHY H.docx` — header says S, it is H

Do not treat a mistyped header as licence to pull in another level's material.

## When a guide is wrong

Two cases, handled differently. Never handle either one silently.

**The guide contradicts itself** — an arithmetic slip in a worked example, a
shape labelled against the definition the same guide gives, a trend example
running the opposite way to the trend just stated. Correct it, using only what
that same guide says elsewhere, and log it in
`build/doclists/SOURCE-DEFECTS.md` under "Errors corrected in the notes".

**The guide makes a wrong claim it never contradicts** — a fact that is simply
incorrect. Reproduce it as written, add no gloss, and log it in
`SOURCE-DEFECTS.md` under "Factual errors". Correcting it would mean importing
material the course does not teach, and the student sits an exam on the course,
not on chemistry in general.

You may add ONE plain sentence in the lesson pointing at a correction, but
only where a student holding the guide would otherwise think the notes are
wrong — a swapped pair of definitions, a worked answer that does not match its
own question. Write it as guidance ("the guide prints these two labels the
wrong way round; go by the descriptions"), never as a complaint, and never more
than a sentence. Everything else goes in the log only.

Never drop a claim merely because you cannot verify it.

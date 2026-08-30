"""Turn extracted IDX fragments into textbook-quality lesson notes.

Run:
  python3 scripts/write_lesson_notes.py --limit 3        # pilot, prints cost
  python3 scripts/write_lesson_notes.py                  # full run (resumable)

WHY
The import produces faithful but fragmented notes: bullet stubs lifted from
study guides, one per heading found. Students get coverage but not teaching.
This pass consolidates the fragments of a unit and rewrites them as a lesson —
prose that defines terms, explains mechanisms, and works through the reasoning.

SCOPE IS THE CONSTRAINT
The model may expand *explanation*; it may not expand *syllabus*. Every fact,
date, formula, and example must come from the fragments. The prompt says so
explicitly, and the source fragments are supplied verbatim as the only
permitted ground truth — so a lesson reads like a textbook chapter on exactly
the material the guides covered, and nothing beyond it.

COST
Reads MOONSHOT_API_KEY / MOONSHOT_BASE_URL from .env. Defaults to kimi-k2.5:
this is bulk prose generation, where K3's always-on reasoning would multiply the
bill for no benefit. Override with --model. Every call is cached to
scripts/.lesson-cache.json, so a re-run costs nothing for units already written
and an interrupted run resumes where it stopped.
"""

import argparse
import json
import os
import random
import re
import sys
import threading
import time
import urllib.error
import urllib.request
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CORPUS = ROOT / "public" / "course-notes.json"
# Applying replaces fragments with lessons, which would destroy the very input
# unit grouping depends on. The pristine fragment corpus is snapshotted the
# first time, and every later run groups from the snapshot — so --apply is
# re-runnable and a fresh generation pass still sees the original units.
FRAGMENTS = ROOT / "public" / "course-notes.fragments.json"
CACHE = ROOT / "scripts" / ".lesson-cache.json"
ENV = ROOT / ".env"

MAX_FRAGMENTS_PER_UNIT = 7
MAX_SOURCE_CHARS = 14000

SYSTEM = """You write course notes for SHSID students, in the register of a good textbook.

You are given fragments extracted from a class study guide: terse bullets, \
definitions and headings. Rewrite them as one complete, well-organised lesson.

HOW TO WRITE
- Prose first. Explain in full sentences and connected paragraphs. Use a list \
only where the material is genuinely a list (steps, criteria, named categories).
- Define every technical term the moment it is used.
- Explain WHY, not just what: the mechanism, the reason a rule holds, the \
condition under which it applies, the mistake it prevents.
- Where the fragments give a formula, state it, define each symbol, and explain \
when to apply it. Write mathematics as LaTeX between $ delimiters.
- Where the fragments give an example, work it through properly.
- Organise with ## section headings in a sensible teaching order, which need \
not be the order of the fragments.
- Open with one short paragraph telling the student what the lesson covers and \
why it matters. No heading for it.

SCOPE — THIS IS THE HARD RULE
Expand the EXPLANATION; never expand the SYLLABUS.
- Every fact, date, name, figure, formula and example must be traceable to the \
fragments. Do not add material from your own knowledge, however relevant.
- Do not introduce topics the fragments do not mention, and do not add \
"further reading", "extensions" or "related topics".
- If a fragment is too terse to explain safely, explain the general principle it \
states and stop. Never invent specifics — a wrong date or a fabricated example \
is far worse than a short section.
- If fragments contradict each other, present the fuller version and note the \
disagreement in one clause.

OUTPUT
Markdown only. Start with a single `# ` title. No preamble, no commentary about \
the source, no closing summary of what you did."""


def load_env():
    values = {}
    if ENV.exists():
        for line in ENV.read_text().splitlines():
            if line.strip() and not line.startswith("#") and "=" in line:
                key, _, value = line.partition("=")
                values[key.strip()] = value.strip().strip("\"'")
    return values


def group_units(notes):
    """Fragments -> teachable units.

    Prefer the chapter implied by a dotted code ("18.1" -> chapter 18); fall
    back to the guide a fragment came from. Oversized groups are split so one
    lesson stays a lesson.
    """
    units = []
    by_course = defaultdict(list)
    for note in notes:
        by_course[note["courseId"]].append(note)

    for course, course_notes in sorted(by_course.items()):
        buckets = defaultdict(list)
        for note in course_notes:
            code = note.get("code", "")
            if "." in code:
                key = f"ch{code.split('.')[0]}"
            else:
                docs = note.get("sourceDocs") or ["unknown"]
                key = Path(docs[0]).stem
            buckets[key].append(note)

        for key, group in buckets.items():
            group.sort(key=lambda n: [int(p) for p in re.findall(r"\d+", n["code"])] or [0])
            for index in range(0, len(group), MAX_FRAGMENTS_PER_UNIT):
                chunk = group[index : index + MAX_FRAGMENTS_PER_UNIT]
                suffix = f"-{index // MAX_FRAGMENTS_PER_UNIT + 1}" if len(group) > MAX_FRAGMENTS_PER_UNIT else ""
                units.append(
                    {
                        "id": f"{course}-{re.sub(r'[^a-z0-9]+', '-', key.lower())[:40]}{suffix}",
                        "courseId": course,
                        "fragments": chunk,
                    }
                )
    return units


def unit_prompt(unit):
    titles = [f["title"] for f in unit["fragments"]]
    body = "\n\n---\n\n".join(f["markdown"] for f in unit["fragments"])[:MAX_SOURCE_CHARS]
    return (
        f"Course: {unit['courseId']}\n"
        f"Topics this lesson must cover, and only these: {'; '.join(titles)}\n\n"
        f"Source fragments (the only permitted ground truth):\n\n{body}"
    )


class Runner:
    def __init__(self, key, base, model, max_tokens=8000):
        self.key, self.base, self.model = key, base, model
        self.max_tokens = max_tokens
        self.lock = threading.Lock()
        self.tokens_in = self.tokens_out = 0

    def call(self, prompt, max_tokens=None):
        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": SYSTEM},
                {"role": "user", "content": prompt},
            ],
            "temperature": 1,
            # Reasoning is always on across the Kimi line and is billed as
            # output — in testing it took 90% of a 300-token budget. The cap has
            # to cover thinking AND a full lesson, or `content` comes back empty
            # with the whole allowance spent reasoning.
            "max_tokens": max_tokens or self.max_tokens,
        }
        request = urllib.request.Request(
            f"{self.base}/chat/completions",
            data=json.dumps(payload).encode(),
            method="POST",
            headers={"Authorization": f"Bearer {self.key}", "Content-Type": "application/json"},
        )
        for attempt in range(6):
            try:
                with urllib.request.urlopen(request, timeout=600) as response:
                    data = json.load(response)
                usage = data.get("usage") or {}
                choice = data["choices"][0]
                with self.lock:
                    self.tokens_in += usage.get("prompt_tokens", 0)
                    self.tokens_out += usage.get("completion_tokens", 0)
                content = (choice["message"].get("content") or "").strip()
                if not content:
                    detail = usage.get("completion_tokens_details", {})
                    raise RuntimeError(
                        f"empty content (finish={choice.get('finish_reason')}, "
                        f"reasoning_tokens={detail.get('reasoning_tokens')}) — raise --max-tokens"
                    )
                if choice.get("finish_reason") == "length":
                    print(f"  ~ truncated at max_tokens: {content[-40:]!r}")
                return content
            except urllib.error.HTTPError as error:
                # A bare `continue` here burned every retry in microseconds and
                # lost 128 units to rate limiting. Back off, and honour
                # Retry-After when the server sends one.
                if error.code in (429, 500, 502, 503) and attempt < 5:
                    wait = error.headers.get("Retry-After") if error.headers else None
                    delay = float(wait) if wait and wait.isdigit() else min(60, 5 * 2**attempt)
                    time.sleep(delay + random.uniform(0, 3))
                    continue
                raise
            except (urllib.error.URLError, TimeoutError, OSError):
                if attempt < 5:
                    time.sleep(min(60, 5 * 2**attempt))
                    continue
                raise
        return ""


ATTRIBUTION = (
    "> Written from Indexademics (IDX) study guides. Original material by the "
    "IDX club; please keep this credit on any copy."
)


def apply_lessons(units, cache):
    """Replace the fragments of each written unit with its lesson.

    A unit becomes ONE note. That is the point: 724 stubs become ~210 lessons,
    each covering a coherent chunk of the course. Units the model has not
    written yet keep their fragments, so applying mid-run is safe.
    """
    notes = json.loads(FRAGMENTS.read_text())
    replaced_ids, lessons = set(), []

    for unit in units:
        lesson = cache.get(unit["id"])
        if not lesson:
            continue
        for fragment in unit["fragments"]:
            replaced_ids.add(fragment["id"])

        heading = re.search(r"^#\s+(.+)$", lesson, re.M)
        title = heading.group(1).strip() if heading else unit["fragments"][0]["title"]
        first = unit["fragments"][0]
        body = lesson if ATTRIBUTION in lesson else lesson.replace(
            f"# {title}", f"# {title}\n\n{ATTRIBUTION}", 1
        )
        sources = sorted({d for f in unit["fragments"] for d in (f.get("sourceDocs") or [])})
        summary = re.sub(r"\s+", " ", re.sub(r"^#.*$|^>.*$", "", body, flags=re.M)).strip()

        lessons.append(
            {
                "id": f"lesson-{unit['id']}",
                "courseId": unit["courseId"],
                "code": first.get("code", ""),
                "title": title,
                "summary": summary[:200],
                "revision": 1,
                "updated": "Written from IDX guides",
                "markdown": body,
                "sections": [],
                "sourceDocs": sources,
            }
        )

    kept = [n for n in notes if n["id"] not in replaced_ids]
    # Renumber each course so lessons read 1..N in order.
    merged = kept + lessons
    by_course = defaultdict(list)
    for note in merged:
        by_course[note["courseId"]].append(note)
    out = []
    for course, course_notes in sorted(by_course.items()):
        course_notes.sort(key=lambda n: [int(p) for p in re.findall(r"\d+", n["code"])] or [0])
        for index, note in enumerate(course_notes, start=1):
            note["code"] = str(index)
            out.append(note)

    CORPUS.write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")) + "\n")
    print(f"applied {len(lessons)} lessons, replacing {len(replaced_ids)} fragments")
    print(f"corpus now {len(out)} notes ({CORPUS.stat().st_size / 1024 / 1024:.1f} MB)")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--apply", action="store_true", help="write cached lessons into the corpus")
    parser.add_argument("--model", default="kimi-k2.5")
    parser.add_argument("--limit", type=int, help="only write N units (pilot)")
    parser.add_argument("--workers", type=int, default=4)
    args = parser.parse_args()

    env = load_env()
    key = env.get("MOONSHOT_API_KEY") or os.environ.get("MOONSHOT_API_KEY", "")
    base = env.get("MOONSHOT_BASE_URL") or "https://api.moonshot.cn/v1"
    if not key:
        sys.exit("No MOONSHOT_API_KEY in .env")

    if not FRAGMENTS.exists():
        FRAGMENTS.write_text(CORPUS.read_text())
    notes = json.loads(FRAGMENTS.read_text())
    units = group_units(notes)
    cache = json.loads(CACHE.read_text()) if CACHE.exists() else {}

    if args.apply:
        apply_lessons(units, cache)
        return

    todo = [u for u in units if u["id"] not in cache]
    if args.limit:
        todo = todo[: args.limit]
    print(f"{len(units)} units total | {len(cache)} already written | writing {len(todo)}")

    runner = Runner(key, base, args.model)
    done = 0
    lock = threading.Lock()

    def write(unit):
        nonlocal done
        try:
            lesson = runner.call(unit_prompt(unit))
        except RuntimeError:
            # Reasoning ate the whole budget — retry once with more room.
            try:
                lesson = runner.call(unit_prompt(unit), max_tokens=16000)
            except Exception as error:  # noqa: BLE001
                print(f"  ! {unit['id']}: {error}", flush=True)
                return
        except Exception as error:  # noqa: BLE001 - report and continue
            print(f"  ! {unit['id']}: {error}", flush=True)
            return
        if not lesson:
            return
        with lock:
            cache[unit["id"]] = lesson
            done += 1
            if done % 5 == 0 or done == len(todo):
                CACHE.write_text(json.dumps(cache, ensure_ascii=False))
                print(f"  {done}/{len(todo)} units written")

    with ThreadPoolExecutor(max_workers=args.workers) as pool:
        list(pool.map(write, todo))

    CACHE.write_text(json.dumps(cache, ensure_ascii=False))

    # kimi-k2.5 list price; adjust if --model changes.
    cost = runner.tokens_in / 1e6 * 0.60 + runner.tokens_out / 1e6 * 3.00
    print(
        f"\ntokens: {runner.tokens_in:,} in / {runner.tokens_out:,} out"
        f"  ~${cost:.2f} at kimi-k2.5 rates"
    )
    print(f"cache: {len(cache)} lessons -> {CACHE}")


if __name__ == "__main__":
    main()

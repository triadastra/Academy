"""Rewrite extracted IDX fragments into complete, detailed course notes.

Run:
  python3 scripts/enrich_notes.py                 # everything not yet done
  python3 scripts/enrich_notes.py --limit 5       # sample first, check quality
  python3 scripts/enrich_notes.py --course hs-biology-9
  python3 scripts/enrich_notes.py --model kimi-k3 # default is the cheap one

The imported corpus is line fragments: an extractor dumped each line of a study
guide, so notes read as disconnected bullets with broken sentences. This pass
sends each note to the Kimi API and asks for the same material written properly.

SCOPE IS THE WHOLE POINT. The model is instructed to expand only what the
fragments already contain — completing sentences, joining related points,
defining terms the fragments name, laying out worked steps that are implied.
It must not introduce topics, facts, dates or examples that are not in the
source. A tutor that quietly widens the syllabus is worse than terse notes,
because a student cannot tell which parts their course actually covers.

Resumable: every finished note is written to the cache immediately, so an
interrupted run resumes where it stopped. Re-running only processes what is
missing unless --force is given.

Cost: reasoning tokens are billed as output. kimi-k2.5 is roughly five times
cheaper than kimi-k3 per token and does not force reasoning, which is why it is
the default for a bulk pass of several hundred notes.
"""

import argparse
import json
import os
import re
import sys
import threading
import time
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CORPUS = ROOT / "public" / "course-notes.json"
CACHE = ROOT / "public" / ".notes-enriched.json"
ENV = ROOT / ".env"

ATTRIBUTION = (
    "> Compiled from Indexademics (IDX) study guides. Original documents by the "
    "IDX club; please keep this credit on any copy."
)

SYSTEM = """You rewrite fragmented study-guide extracts into complete course notes.

The input is raw lines pulled out of a school study guide. Sentences are broken,
bullets are duplicated, and ordering is rough. Your job is to produce the notes
that guide was trying to be.

RULES — the scope rule is absolute:
1. Use ONLY the material in the fragments. Do not add topics, facts, dates,
   formulae, examples or names that are not present or directly implied. If the
   fragments cover three causes of an event, write three — never a fourth you
   happen to know.
2. Do not broaden. This is one topic inside one school course; a student must be
   able to trust that everything here is examinable and nothing is missing.
3. Complete what IS there: finish broken sentences, merge duplicate points, put
   related points together, define terms the fragments name, and spell out steps
   the fragments imply.
4. Be detailed and explanatory. Say why, not just what. Where the fragments give
   a definition, explain what it means; where they give a process, give the
   steps in order.
5. Structure with `##` sections and `-` bullets. Use short paragraphs where
   prose reads better than bullets. Bold key terms with **term**.
6. Mathematics and formulae in LaTeX between $ delimiters.
7. If the fragments are too thin or garbled to make real notes, return exactly:
   INSUFFICIENT

Output markdown only. No preamble, no title heading (it is added for you), no
commentary about the source."""


def api_key_and_base():
    values = {}
    if ENV.exists():
        for line in ENV.read_text().splitlines():
            if "=" in line and not line.strip().startswith("#"):
                key, _, value = line.partition("=")
                values[key.strip()] = value.strip().strip("\"'")
    key = os.environ.get("MOONSHOT_API_KEY") or values.get("MOONSHOT_API_KEY")
    base = os.environ.get("MOONSHOT_BASE_URL") or values.get("MOONSHOT_BASE_URL")
    return key, (base or "https://api.moonshot.ai/v1").rstrip("/")


def strip_scaffold(markdown: str) -> str:
    """Drop the generated title, attribution and Sources block before sending."""
    body = markdown.split("\n")
    body = [line for line in body if not line.startswith("# ") and line.strip() != ATTRIBUTION]
    text = "\n".join(body)
    return re.sub(r"\n## Sources\n.*$", "", text, flags=re.S).strip()


def call(key, base, model, note, timeout, retries=3):
    payload = {
        "model": model,
        # The whole Kimi line rejects anything else: "invalid temperature: only
        # 1 is allowed for this model".
        "temperature": 1,
        "max_tokens": 4000,
        "messages": [
            {"role": "system", "content": SYSTEM},
            {
                "role": "user",
                "content": (
                    f"Course: {note.get('courseTitle') or note['courseId']}\n"
                    f"Topic: {note['code']} {note['title']}\n\n"
                    f"Fragments:\n{strip_scaffold(note['markdown'])}"
                ),
            },
        ],
    }
    request = urllib.request.Request(
        f"{base}/chat/completions",
        data=json.dumps(payload).encode(),
        method="POST",
        headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
    )
    last = ""
    for attempt in range(retries):
        try:
            with urllib.request.urlopen(request, timeout=timeout) as response:
                body = json.load(response)
            message = body["choices"][0]["message"]
            usage = body.get("usage", {})
            return (message.get("content") or "").strip(), usage
        except urllib.error.HTTPError as error:
            last = f"HTTP {error.code}"
            if error.code in (429, 500, 502, 503, 504):
                time.sleep(2 * (attempt + 1) ** 2)  # back off on rate limit
                continue
            try:
                last = json.load(error)["error"]["message"][:120]
            except Exception:
                pass
            break
        except Exception as error:  # timeouts, connection resets
            last = str(error)[:120]
            time.sleep(2 * (attempt + 1))
    return None, last


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--model", default="kimi-k2.5")
    parser.add_argument("--limit", type=int)
    parser.add_argument("--course")
    parser.add_argument("--workers", type=int, default=6)
    parser.add_argument("--timeout", type=int, default=180)
    parser.add_argument("--force", action="store_true")
    args = parser.parse_args()

    key, base = api_key_and_base()
    if not key:
        sys.exit("No MOONSHOT_API_KEY in .env or environment.")

    notes = json.loads(CORPUS.read_text())
    cache = json.loads(CACHE.read_text()) if CACHE.exists() else {}

    todo = [
        note for note in notes
        if (args.force or note["id"] not in cache)
        and (not args.course or note["courseId"] == args.course)
    ]
    if args.limit:
        todo = todo[: args.limit]

    print(f"{len(notes)} notes | {len(cache)} already enriched | {len(todo)} to do")
    print(f"model={args.model} workers={args.workers} base={base}\n")
    if not todo:
        return

    lock = threading.Lock()
    counters = {"ok": 0, "thin": 0, "fail": 0, "in": 0, "out": 0}

    def work(note):
        text, usage = call(key, base, args.model, note, args.timeout)
        with lock:
            if text is None:
                counters["fail"] += 1
                print(f"  ✗ {note['courseId']} {note['code']} {note['title'][:34]} — {usage}")
            elif text == "INSUFFICIENT" or len(text) < 120:
                counters["thin"] += 1
            else:
                cache[note["id"]] = text
                counters["ok"] += 1
                counters["in"] += usage.get("prompt_tokens", 0)
                counters["out"] += usage.get("completion_tokens", 0)
            done = counters["ok"] + counters["thin"] + counters["fail"]
            if done % 10 == 0 or done == len(todo):
                CACHE.write_text(json.dumps(cache, ensure_ascii=False))
                print(
                    f"  {done}/{len(todo)}  ok={counters['ok']} thin={counters['thin']} "
                    f"fail={counters['fail']}  tokens in={counters['in']//1000}k "
                    f"out={counters['out']//1000}k"
                )

    with ThreadPoolExecutor(max_workers=args.workers) as pool:
        futures = [pool.submit(work, note) for note in todo]
        for future in as_completed(futures):
            future.result()

    CACHE.write_text(json.dumps(cache, ensure_ascii=False))
    print(f"\nenriched {counters['ok']} | too thin {counters['thin']} | failed {counters['fail']}")
    print(f"tokens: {counters['in']} in, {counters['out']} out -> {CACHE}")
    print("Run scripts/apply_enriched_notes.py to write them into the corpus.")


if __name__ == "__main__":
    main()

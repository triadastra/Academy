# Synonance JSON database

`synonance.database.json` is the application seed. Published note contributions, images and scores now use the existing Academy server; see “Shared notes and contributions” below. The remaining account and study features retain their browser-local adapter.

## Data ownership

- Shared tables: institution, users, course catalog, course notes, progress definitions,
  indexed questions, mock tests, library records, admin records, and course contributions.
- Generated material: questions Syno wrote from a session's notes, the papers assembled from
  them, and one `SynthesisBatch` row per run. See "Sessions and generated material" below.
- Per-user databases: profile preferences, grade/course selection, active course, menu state,
  private chat threads, question attempts, uploaded-paper records, and grades.
  - `performance` (optional): the student's grade book, study log, per-course credits/targets/
    study plan, and per-topic fluency ratings. See `performance.ts`; the arithmetic is in
    `src/lib/performance-model.ts`.
  - `personal` (optional, personal accounts only): courses the account created, metadata for
    the files dropped into them, and the notes Syno wrote. The files' text is kept in IndexedDB
    (`src/lib/personal-files.ts`), not in the localStorage delta, keyed by user id.

### Tutorials

Every tutorial (access video, Launchpad access guide, first-run app tour) can be skipped. How each
one ended (`done` or `skipped`) is remembered in the `synonance_tutorials` cookie for this browser
and, once signed in, in `settings.tutorials` on the account. The two are merged both ways at every
sign-in (`syncTutorialChoices` in `client.ts`). A choice made before signing in therefore carries
onto the account, and an account's choice carries to a new browser. The older per-browser
localStorage keys are still honoured. Profile → *Replay the tour* forgets the tour's entry in both places.

### Personal and school accounts

`ApplicationUser.accountKind` is `'personal'` for accounts made from the sign-in page's personal
option and absent (school) for everything else. A personal session (`identityProvider:
'personal'`) is accepted only for a personal row, and a personal row is never accepted through
the Launchpad/institution path. `canOpenStudentWorkspace` admits either a verified school member
or a personal account to the student pages; isolation from shared material is then enforced where
data is read: `getAvailableCourses` returns only the account's own courses, `notesForCourse`
returns only private notes for a `personal-*` course, school notifications and the people table
exclude personal accounts, the contribution worker does not sync for them, and their sign-ins
are not written to the institution's audit log.

The current user is selected by `appSettings.currentUserId`. Each entry in `userDatabases`
is isolated by that user id.

## Runtime

`client.ts` is the only module allowed to read or write browser persistence. It hydrates the
versioned JSON seed, migrates the earlier demo keys, preserves per-user activity during schema
upgrades, and emits one database-change event for the UI. `storage.ts` sits underneath it as the
persistence primitive; `accounts.ts` sits on top as the account-lifecycle API.

This local JSON adapter is intentionally replaceable: a future server API can implement the
same typed operations without changing the pages.

### What is written, and what is not

Only the **mutable delta** reaches localStorage, under `synonance:database-delta:v1`:
`appSettings`, `userDatabases`, runtime-created or administratively-changed `users`, edited
`notes`, `noteRevisions`, `courseContributions`, the generated-material tables
(`synthesizedQuestions`, `synthesizedPapers`, `synthesisBatches`) and `auditLog`. Everything else —
the course catalogue, the question bank, the mock papers, the seeded notes — is rebuilt from the
bundled seed on read.

The generated tables are separate from `questions` and `mockTests` on purpose. Those two are seed
material — 358 questions and 220 papers compiled into the bundle — and mixing generated rows into
them would mean diffing the whole seed on every save to find the handful that are new. Readers that
want both merge them (`getQuestions`, `questionsForSession`); the storage layer never has to.
Adding them did **not** bump `schemaVersion`: a bump quarantines every existing delta, and an
absent optional table is readable by the build that wrote it and the build that did not.

This matters more than it sounds. The seed serialises to about 409 KB, of which roughly 406 KB is
immutable course material that is already compiled into the JS bundle. Persisting the whole
document meant every settings toggle, and every 500 ms chat checkpoint, wrote 409 KB to hold about
3 KB of real state, and consumed the origin's ~5 MB quota with duplicate course content.

### Running out of storage

`writeDelta` compacts down a fixed ladder before failing: interrupted partial replies, then older
chat messages, then oldest chat threads, then retired generated questions, then old audit entries,
then old question attempts, then signed-out accounts' transcripts. Every step taken is named in the returned `WriteOutcome`, shown
to the user by `StorageNotice`, and recorded in the audit log. A write that still cannot land
reports `status: 'failed'` and the banner stays up — it does not fail silently, which is what the
previous unguarded `setItem` did.

### Incompatible documents are quarantined, not deleted

A stored document whose `schemaVersion` does not match the build's is moved to
`synonance:database-quarantine:v1` rather than discarded. A rollback or a half-rolled-out deploy
must not be able to destroy a user's coursework.

## Authentication

Authentication is mirrored into each user's database and anchored by the small
`synonance:auth-session:v1` JSON record. Keeping that record separate from the much larger course
database prevents a content migration, hot reload, or interrupted database write from signing the
current user out.

Sessions carry two deadlines: an absolute `expiresAt` 30 days from sign-in, and a sliding
`idleExpiresAt` 12 hours ahead of the last activity, refreshed by `touchSession` at most once every
five minutes. `applyDurableAuth` enforces both on load, and also ends the session of an account an
administrator has suspended or erased.

Administrator sign-in verifies a PBKDF2-HMAC-SHA256 hash (`src/lib/password.ts`). The seed ships
the verifier, never a password. Failed attempts are throttled: five within fifteen minutes locks
the form for fifteen.

Institution course access is restricted to Launchpad sessions whose freshly resolved userinfo is
`verified` and whose `org` matches the installation's institution id (`shsid` here). Synonance
binds the account 1:1 by Launchpad `sub`, stores the platform VID as a read-only identity value,
and refuses missing, duplicate or conflicting VIDs. Restored sessions are checked before routes
render, again when the tab becomes visible, and every ten minutes while it remains open. The local
administrator credential can reach administration pages but does not satisfy the institution
course guard.

## Server-side requirements

**Everything above runs in the browser, so none of it is an access-control boundary.** Anyone can
open devtools, write `{"userId":"admin-…","authenticated":true}` into the session key, and be an
administrator in their own copy. That is not a bug in this code; it is what "browser-local store"
means. The checks here exist so the application behaves correctly and so the intended permission
model is explicit and testable — not to resist a hostile client.

Before this is distributed to institutions that do not trust every one of their users, the
following have to move to a server that the browser cannot rewrite:

| Concern | What the server must own |
| --- | --- |
| Identity | Session issuance and validation. The client may hold a token; it must not decide whether the token is valid. |
| Roles | Role assignment and every role check that gates data. `/teacher/*` and `/admin/*` must be enforced by the API, not only by the router. |
| Credentials | Password verification and throttling. Client-side PBKDF2 protects the credential from being *read*; it cannot stop it being *bypassed*. |
| Tenancy | The browser checks verified Launchpad `org` membership before showing institution routes, but the bundled static course data is still downloadable. Confidential multi-tenant data needs per-tenant isolation enforced by a server on every query. |
| Shared writes | Note revisions are shared class material. Approval must be server-authorised, and concurrent edits reconciled server-side rather than last-writer-wins. |
| Audit | The log must be append-only somewhere the audited party cannot edit it. |
| Durability | Per-user data must survive clearing a browser, and must be reachable from a second device. |

Until then, treat a deployment as one trusted browser per person, and say so to whoever is
evaluating it.

## Sessions and generated material

A **session** is one course taught at one level — `hs-english-9::S+` — and it is the unit that
questions, papers and generation are scoped by. SHSID does not teach one G9 English course at four
difficulties; it teaches four classes that share a course code and are set different texts. Notes
have been level-scoped since `notesForCourse` learned about levels; `question-bank.ts` applies the
same rule to everything else, so an S+ student is never served a question about a text only the H
class read.

Rows with no `level` predate session scoping and stay visible at every level. Anything generated
always carries one.

Generated questions are marked `origin: 'synthesized'` and tagged **Synthesized** wherever they
appear, including on a printed paper. They carry a `provenance` record — note codes, the note
revisions read, the model, the trigger — so a student can open the passage a question came from and
a teacher can see which run produced it.

Nothing generated reaches practice unreviewed. A run lands as a *block* of `status: 'draft'` rows
against one session; accepting or discarding the block is one act, and `discardBatch` also removes
any paper assembled from it. `src/lib/question-forge.ts` documents the pipeline itself — plan from
coverage, write per note, validate every draft against the marker the student will meet, stage for
review — and `marking.ts` holds the marking rules both the validator and the UI use.

## Shared notes and contributions

Course-note contributions now use the **existing Academy Launchpad runtime**.
`server/vite-notes.ts` mounts `/__academy/notes` in both development and preview;
`npm start` serves the built app with that backend. Deploy the repository using
`.launchpad/deploy.json`, not `dist/` alone: a static-only deployment cannot index
or persist shared contributions.

The server writes its own versioned note store and image files under
`.launchpad-data/notes/`, the directory Launchpad preserves across releases.
It uses atomic writes and a process lock, and refuses to start a competing writer
or silently replace unreadable data. Back up this directory with the existing
host backup process. Original contributions, snapshots, assessments and score
entries stay with the contribution history; image bytes are stored once and
referenced as `![description](note-asset:<id>)` in Markdown.

Every API request verifies the bearer token with Launchpad userinfo and requires
verified membership in the configured institution. Contributor identity comes
from that verified subject, not a browser-supplied user ID. Unpublished packets
and attachments are visible only to their author; published guide changes and
contribution history are visible to the institution. The browser caches shared
snapshots in memory for rendering and tutoring; it cannot set authoritative
scores or review decisions.

Uploads, selected-passage additions and reports all enter the same persistent
queue. A source is reviewed in parts of about 8,000 characters (split on
paragraph and page boundaries). For each part the first agent drafts
section-level edits (insert, replace or remove a `##` section by heading) and
assesses its marginal coverage; the server applies the edits itself, so the
model never rewrites the whole guide and its output grows with the change, not
the document. A separate model call verifies each part's edits, images and
scoring. If the verifier objects, or the edits name a section that does not
exist, the drafter gets one revision round (with reasoning, and the
verifier's evidence) before the verdict stands. Part scores are weighted by
length; an uncertain or incorrect part holds the whole packet for review.
Each model call is streamed and has its own deadline. Finished parts are
checkpointed on the packet, so Retry continues where an interrupted review
stopped. Uncertain,
invalid, timed-out or conflicting reviews never publish. Accepted packets retain
their exact before/after snapshots and wait for the contributor to publish. A stale
base revision queues a fresh review. Stopping a packet aborts the model request
and late replies cannot publish or score it. Server restarts make interrupted
packets explicitly retryable; queued packets continue in the background.

A published packet earns 0–100 points based on useful new course coverage.
Duplicate material earns none. Both reviewers must agree before an incorrect
source receives a penalty. Reports alone do not deduct points: corrections must
pass review and publish, with exact evidence linking the error to an earlier
packet. A correction cannot deduct more than that packet's remaining credit,
and event IDs prevent repeated publication from changing the score twice.
Agent review reduces errors but cannot guarantee factual correctness; ambiguous
cases stay unresolved instead of being silently accepted.

Runtime configuration reuses `MOONSHOT_API_KEY`, `MOONSHOT_BASE_URL` and
`VITE_LLM_MODEL`. Optional server-only overrides are `LAUNCHPAD_USERINFO_URL`
(default: Academy's existing HTTPS userinfo bridge) and `ACADEMY_NOTES_DATA_DIR`.
The latter must stay in preserved private storage. No model key is sent to the
browser. `npm run test:notes` exercises the real API with controlled model replies,
including cross-account access, cancellations, conflicts, penalties, image access,
failed storage and restart durability.

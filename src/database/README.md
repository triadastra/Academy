# Synonance JSON database

`synonance.database.json` is the application seed and schema-shaped source of truth.

## Data ownership

- Shared tables: institution, users, course catalog, course notes, progress definitions,
  indexed questions, mock tests, library records, admin records, and course contributions.
- Generated material: questions Syno wrote from a session's notes, the papers assembled from
  them, and one `SynthesisBatch` row per run. See "Sessions and generated material" below.
- Per-user databases: profile preferences, grade/course selection, active course, menu state,
  private chat threads, question attempts, uploaded-paper records, and grades.

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

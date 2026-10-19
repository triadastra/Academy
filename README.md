# Synonance Academy

Synonance is a course-grounded learning platform for students, teachers, and school administrators. It brings tutoring, course notes, practice, assessment creation, learning analytics, and institution controls into one role-aware application.

> **Project status:** This repository is a high-fidelity browser prototype. Shared and per-user data are seeded locally and mutable state is stored in the browser. Client-side role checks demonstrate the intended permission model, but they are not a production security boundary.

## What it includes

### Students

- Course-aware AI chat with conversation history
- Structured notes with selection-based questions
- Question practice, mock tests, review sessions, and study plans
- Mastery and knowledge tracking
- Notifications and profile preferences

### Teachers

- Class-level learning and objective insights
- Question library, uploads, tagging, and item review
- Assessment and paper construction
- Course creation and academic-integrity policies

### Administrators

- User and role management
- Audit, retention, export, and security views
- Institution-wide announcements

## Technology

- React 19 and TypeScript
- Vite 7
- Tailwind CSS 3 and Radix UI
- React Router
- KaTeX and PDF.js
- Recharts
- Browser-local JSON persistence

## Run locally

### Requirements

- Node.js 20 or newer
- npm

### Setup

```sh
git clone https://github.com/triadastra/Academy.git
cd Academy
npm install
cp .env.example .env
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The application starts at `/login`.

Launchpad authentication is available only on a Launchpad-hosted origin. Local development still loads the interface, but institution sign-in will report that Launchpad is unavailable.

## Optional AI configuration

The app can use Moonshot during local development. Add a server-side key to `.env`:

```dotenv
MOONSHOT_API_KEY=your_key_here
```

The key is read by the Vite development server and is not bundled into client code. Never rename it to `VITE_MOONSHOT_API_KEY`, because Vite exposes `VITE_*` values to the browser.

Without a key, the AI endpoint is disabled and chat shows an offline message and preserves your question for retry. Production deployments expect the host platform to provide `/__lp_llm_proxy`.

The gateway must forward `tools` and `tool_choice` to its OpenAI-compatible
provider and return `tool_calls` unchanged. Dropping these fields makes the
tutor appear conversational while disabling its note-search and grep tools.
Launchpad's `host-server/llmToolOptions.js` handles this forwarding. The app
keeps provider credentials on the host; do not add keys to the browser bundle.

Both course chat and highlighted-passage chat wait for notes to load and retrieve
course/level-scoped evidence before the first model call. Search ranks keywords,
headings, summaries and passages rather than requiring the student's entire
question to appear verbatim. The highlighted-passage tutor has read-only tools.
Long `notes_read` results return `nextOffset` for continuing through the note;
oversized results explicitly report truncation. Failed note downloads are
reported separately from an empty search and retried on a later question.

Run `npm run test:retrieval` for cold-load, search, streamed-tool, pagination and
scope-isolation regressions; `npm run test:generation` checks assessment generation.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the development server on port 3000 |
| `npm run build` | Type-check and create a production build in `dist/` |
| `npm run lint` | Run ESLint across the project |
| `npm run test:generation` | Verify topic planning, draft review, cancellation, and test assembly |
| `npm run preview` | Preview the production build locally |

## Project structure

```text
src/
├── components/   Shared application and UI components
├── database/     Typed browser-local data layer and seed
├── data/         Course catalogues and mock data
├── lib/          Authentication, AI, marking, and course utilities
└── pages/        Student, teacher, and administrator screens
public/           Static course-note assets
scripts/          Course-content preparation utilities
```

For details about storage, sessions, role enforcement, data ownership, and the work required for a production backend, see [`src/database/README.md`](src/database/README.md).

## Before production

Authentication, authorization, shared writes, tenancy, audit records, and durable user data must move to a trusted server before the application is used with sensitive or multi-user institutional data. The current browser-local implementation is intended for prototyping and evaluation.

// performance-import.ts — turning text into grade-book rows.
//
// Three ways in, one set of rules:
//   · the Performance page's paste box (a list copied from a school portal or
//     a spreadsheet),
//   · the chat agent's `grades_record` tool (what the student told Syno),
//   · `rubric_set` and the page's rubric box (how the course is weighted).
//
// Pure: no storage, no React. Every value is validated here, so nothing a
// model or a messy paste produces reaches the store unchecked.

export type ImportRow =
  | {
      kind: 'assessment'
      title: string
      category: string
      date: string
      /** % of the final grade; 0 = tracked but not counted. */
      weight: number
      score: number | null
      total: number
    }
  | { kind: 'study'; date: string; minutes: number; note?: string }

export interface ImportProblem {
  line: number
  text: string
  reason: string
}

export interface ImportResult {
  rows: ImportRow[]
  problems: ImportProblem[]
  /** Lines read as a header and skipped. */
  skipped: number
}

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']

const pad = (n: number) => String(n).padStart(2, '0')

function valid(year: number, month: number, day: number) {
  if (!(year >= 1990 && year <= 2100 && month >= 1 && month <= 12 && day >= 1 && day <= 31)) return null
  const date = new Date(Date.UTC(year, month - 1, day))
  return date.getUTCMonth() === month - 1 ? `${year}-${pad(month)}-${pad(day)}` : null
}

/**
 * `2026-09-26`, `2026/9/26`, `9/26/2026` (US order, as school portals here
 * print it), `Sep 26`, `26 Sep 2026`, `Sep 26, 2026`. A date without a year
 * takes the year that puts it closest to `today`.
 */
export function parseDate(text: string, today: string): string | null {
  const value = text.trim().toLowerCase().replace(/(\d)(st|nd|rd|th)\b/g, '$1')
  let match = value.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/)
  if (match) return valid(+match[1], +match[2], +match[3])
  match = value.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/)
  if (match) return valid(+match[3], +match[1], +match[2])
  const year = Number(today.slice(0, 4))
  const nearest = (month: number, day: number) => {
    const options = [year - 1, year, year + 1]
      .map((y) => valid(y, month, day))
      .filter((d): d is string => d !== null)
    const t = Date.parse(today)
    return options.sort((a, b) => Math.abs(Date.parse(a) - t) - Math.abs(Date.parse(b) - t))[0] ?? null
  }
  match = value.match(/^([a-z]{3})[a-z]*\.?\s+(\d{1,2}),?(?:\s+(\d{4}))?$/)
  if (match && MONTHS.includes(match[1])) {
    const month = MONTHS.indexOf(match[1]) + 1
    return match[3] ? valid(+match[3], month, +match[2]) : nearest(month, +match[2])
  }
  match = value.match(/^(\d{1,2})\s+([a-z]{3})[a-z]*\.?,?(?:\s+(\d{4}))?$/)
  if (match && MONTHS.includes(match[2])) {
    const month = MONTHS.indexOf(match[2]) + 1
    return match[3] ? valid(+match[3], month, +match[1]) : nearest(month, +match[1])
  }
  match = value.match(/^(\d{1,2})[-/.](\d{1,2})$/)
  if (match) return nearest(+match[1], +match[2])
  if (value === 'today') return today
  return null
}

/** `76/100`, `76 / 100`, `76%`, `76`, `—`, `upcoming`, blank. */
export function parseScore(text: string): { score: number | null; total: number } | null {
  const value = text.trim().toLowerCase()
  if (!value || /^(-|—|–|n\/?a|tbd|upcoming|pending|todo|\?)$/.test(value)) return { score: null, total: 100 }
  let match = value.match(/^(\d+(?:\.\d+)?)\s*(?:\/|out of|of)\s*(\d+(?:\.\d+)?)$/)
  if (match) {
    const score = Number(match[1])
    const total = Number(match[2])
    return total > 0 && score >= 0 && score <= total * 1.5 ? { score, total } : null
  }
  match = value.match(/^(\d+(?:\.\d+)?)\s*%?$/)
  if (match) {
    const score = Number(match[1])
    return score >= 0 && score <= 150 ? { score, total: 100 } : null
  }
  return null
}

/** `15%`, `15`, `0.15`, blank → 0. */
export function parseWeight(text: string): number | null {
  const value = text.trim().replace(/\s/g, '')
  if (!value) return 0
  const match = value.match(/^(\d+(?:\.\d+)?)(%?)$/)
  if (!match) return null
  let weight = Number(match[1])
  // A bare fraction ("0.15") is a share, not a percent.
  if (!match[2] && weight > 0 && weight < 1) weight *= 100
  return weight <= 100 ? Math.round(weight * 100) / 100 : null
}

/** `45`, `45 min`, `1h`, `1.5 h`, `1h 30m`, `90m`. */
export function parseMinutes(text: string): number | null {
  const value = text.trim().toLowerCase().replace(/\s+/g, '')
  let match = value.match(/^(\d+(?:\.\d+)?)h(?:ours?|rs?)?(?:(\d+)m(?:in(?:utes?|s)?)?)?$/)
  if (match) {
    const minutes = Math.round(Number(match[1]) * 60 + Number(match[2] ?? 0))
    return minutes > 0 && minutes <= 720 ? minutes : null
  }
  match = value.match(/^(\d+)(?:m|min|mins|minutes?)?$/)
  if (match) {
    const minutes = Number(match[1])
    return minutes > 0 && minutes <= 720 ? minutes : null
  }
  return null
}

const CATEGORY_WORDS: Array<[RegExp, string]> = [
  // Midterm and final stay apart: a rubric usually weights them differently.
  [/^(final|finals|final exam|final exams)$/, 'Final exam'],
  [/^(midterm|midterms|mid-term|midterm exam)$/, 'Midterm'],
  [/^(exam|exams|mock exam|mock exams)$/, 'Exam'],
  [/^(test|tests|unit test|unit tests|assessment|assessments)$/, 'Test'],
  [/^(quiz|quizzes|pop quiz)$/, 'Quiz'],
  [/^(homework|hw|assignment|assignments|problem set|problem sets|pset|psets)$/, 'Homework'],
  [/^(project|projects)$/, 'Project'],
  [/^(lab|labs|lab report|lab reports|practical|practicals)$/, 'Lab'],
  [/^(essay|essays|paper|papers|writing)$/, 'Essay'],
  [/^(participation|classwork|class work)$/, 'Participation'],
]

/** One spelling per kind of work, so "Quizzes" and "quiz" are the same category. */
export function normaliseCategory(text: string): string {
  const value = text.trim().toLowerCase().replace(/\s+/g, ' ')
  for (const [pattern, name] of CATEGORY_WORDS) if (pattern.test(value)) return name
  const cleaned = text.trim().replace(/\s+/g, ' ').slice(0, 40)
  return cleaned ? cleaned[0].toUpperCase() + cleaned.slice(1) : 'Other'
}

export function guessCategory(title: string): string {
  const value = title.toLowerCase()
  if (/\bfinal/.test(value)) return 'Final exam'
  if (/midterm|mid-term/.test(value)) return 'Midterm'
  if (/exam/.test(value)) return 'Exam'
  if (/quiz/.test(value)) return 'Quiz'
  if (/test/.test(value)) return 'Test'
  if (/homework|\bhw\b|assignment|problem set|pset/.test(value)) return 'Homework'
  if (/project/.test(value)) return 'Project'
  if (/lab/.test(value)) return 'Lab'
  if (/essay|paper/.test(value)) return 'Essay'
  return 'Other'
}

function split(line: string) {
  const separator = line.includes('\t') ? '\t' : line.includes(';') && !line.includes(',') ? ';' : ','
  return line.split(separator).map((cell) => cell.trim())
}

const HEADER = /^(name|title|assessment|assignment|item|type|category|date|due|weight|score|grade|points|minutes|course)$/i

/**
 * One row per line.
 *   Assessment: `name, type, date, weight, score`   e.g. `Unit test 1, Test, 2026-09-26, 15%, 76/100`
 *               `name, date, weight, score`         (type guessed from the name)
 *   Study:      `study, date, minutes[, note]`      e.g. `study, 2026-11-18, 45 min, past paper`
 * Commas, tabs (spreadsheet copy) or semicolons. A header row is skipped.
 */
export function parseImport(text: string, today: string): ImportResult {
  const rows: ImportRow[] = []
  const problems: ImportProblem[] = []
  let skipped = 0
  text.split(/\r?\n/).forEach((raw, index) => {
    // Trim spaces only. A spreadsheet copies empty trailing cells as trailing
    // tabs, and those tabs are what say "the score column is empty".
    const line = raw.replace(/^ +| +$/g, '')
    if (!line.trim() || line.trim().startsWith('#')) return
    const cells = split(line)
    const problem = (reason: string) => problems.push({ line: index + 1, text: line, reason })

    if (cells.filter(Boolean).every((cell) => HEADER.test(cell))) {
      skipped += 1
      return
    }

    if (/^(study|studied|revision|review|practice)$/i.test(cells[0])) {
      const date = parseDate(cells[1] ?? '', today)
      const minutes = parseMinutes(cells[2] ?? '')
      if (!date) return problem(`"${cells[1] ?? ''}" is not a date I can read`)
      if (minutes === null) return problem(`"${cells[2] ?? ''}" is not a length of time (try 45 or 1h 30m)`)
      const note = cells.slice(3).join(', ').trim()
      rows.push({ kind: 'study', date, minutes, ...(note ? { note: note.slice(0, 120) } : {}) })
      return
    }

    // Assessment: with or without a type column. Where the date sits says which.
    const typeless = parseDate(cells[1] ?? '', today) !== null
    const typed = parseDate(cells[2] ?? '', today) !== null
    // Neither parses: blame the column a full five-column row puts the date in.
    const hasType = typed || (!typeless && cells.length >= 5)
    const [title, typeCell, dateCell, weightCell, scoreCell] = hasType
      ? [cells[0], cells[1], cells[2], cells[3] ?? '', cells[4] ?? '']
      : [cells[0], '', cells[1] ?? '', cells[2] ?? '', cells[3] ?? '']
    if (!title) return problem('missing a name')
    if (cells.length < 2) return problem('needs at least a name and a date')
    const date = parseDate(dateCell, today)
    if (!date) return problem(`"${dateCell}" is not a date I can read`)
    const weight = parseWeight(weightCell)
    if (weight === null) return problem(`"${weightCell}" is not a weight (try 15%)`)
    const score = parseScore(scoreCell)
    if (!score) return problem(`"${scoreCell}" is not a score (try 76/100 or 76%)`)
    rows.push({
      kind: 'assessment',
      title: title.slice(0, 80),
      category: typeCell ? normaliseCategory(typeCell) : guessCategory(title),
      date,
      weight,
      score: score.score,
      total: score.total,
    })
  })
  return { rows, problems, skipped }
}

// ── Rubric ────────────────────────────────────────────────────────────────

export interface RubricEntry {
  category: string
  /** % of the final grade for the whole category. */
  weight: number
  /** How many items the category will have this term, when known. */
  count?: number
}

/**
 * `Tests 50%, Quizzes 20%, Homework 15%, Final 15%` — one category per comma
 * or line, optionally with a count: `Tests 40% (4)` or `4 tests 40%`.
 */
export function parseRubric(text: string): { entries: RubricEntry[]; problems: string[] } {
  const entries: RubricEntry[] = []
  const problems: string[] = []
  for (const raw of text.split(/[\n,;]+/)) {
    const part = raw.trim()
    if (!part) continue
    const match =
      part.match(/^(?:(\d+)\s*[x×]?\s+)?([A-Za-z][A-Za-z /&-]*?)\s*[:=-]?\s*(\d+(?:\.\d+)?)\s*%?\s*(?:\((\d+)(?:\s*items?)?\))?$/) ??
      null
    if (!match) {
      problems.push(`"${part}" — write it like "Tests 50%"`)
      continue
    }
    const weight = Number(match[3])
    if (!(weight > 0 && weight <= 100)) {
      problems.push(`"${part}" — weight must be between 0 and 100`)
      continue
    }
    const count = Number(match[1] ?? match[4] ?? 0)
    const category = normaliseCategory(match[2])
    const existing = entries.find((entry) => entry.category === category)
    if (existing) {
      // "Quiz 10%, Quizzes 10%" — the same bucket written twice.
      existing.weight += weight
      if (count) existing.count = (existing.count ?? 0) + count
    } else entries.push({ category, weight, ...(count > 0 ? { count } : {}) })
  }
  const total = entries.reduce((sum, entry) => sum + entry.weight, 0)
  if (entries.length && Math.abs(total - 100) > 0.5)
    problems.push(`The weights add up to ${Math.round(total * 10) / 10}%, not 100%.`)
  return { entries, problems }
}

/**
 * Each item's share of the grade under a rubric: the category's weight split
 * evenly over its items (or over its expected count, when that is larger, so
 * the items not on the list yet keep their share in reserve). Categories the
 * rubric does not mention keep whatever weight they had.
 */
export function rubricWeights(
  items: Array<{ id: string; category: string; weight: number }>,
  rubric: RubricEntry[],
): Map<string, number> {
  const weights = new Map<string, number>()
  for (const entry of rubric) {
    const inCategory = items.filter((item) => normaliseCategory(item.category) === entry.category)
    const slots = Math.max(entry.count ?? 0, inCategory.length)
    for (const item of inCategory) weights.set(item.id, Math.round((entry.weight / slots) * 100) / 100)
  }
  return weights
}

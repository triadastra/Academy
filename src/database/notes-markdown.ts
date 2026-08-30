// notes-markdown.ts — markdown is the source of truth for a course note.
//
// A note is one markdown document, shared by every student in the course. The
// structure the UI needs (summary, sections, anchors) is DERIVED from the
// markdown rather than stored beside it, so an agent that rewrites the text
// cannot desynchronise the two.
//
// Supported subset — deliberately small, because the corpus is authored:
//   # 2.3 Partial fractions      note heading (code + title)
//   first paragraph              the summary
//   ## Finding coefficients      a section
//   > text                       a callout inside the current section
//   - item                       a list item
//   $x^2$ / $$\int f$$           inline / display math (rendered by <Tex>)
//
// Everything here is pure: no storage access, no React. That keeps it usable
// from the agent tools, from tests, and from a future server implementation.

export interface NoteBlock {
  kind: 'paragraph' | 'callout' | 'list' | 'table' | 'code'
  /** Paragraph/callout text, the items of a list, or the body of a code block. */
  text: string
  items?: string[]
  /** Table rows, first row being the header. Set only when kind is 'table'. */
  rows?: string[][]
  /** Fence info string (e.g. `python`). Set only when kind is 'code'. */
  language?: string
  /** 0-based line in the source markdown — anchors citations to the document. */
  line: number
}

export interface ParsedSection {
  /** Slug of the heading, stable enough to cite and to scroll to. */
  id: string
  title: string
  blocks: NoteBlock[]
  line: number
}

export interface ParsedNote {
  code: string
  title: string
  summary: string
  sections: ParsedSection[]
}

/**
 * A URL-safe id for a heading.
 *
 * Keeping only `a-z0-9` erases a heading written in a non-Latin script
 * entirely: every section of a Chinese lesson slugified to the empty string,
 * so they shared one id, collided as React keys and made in-page anchors
 * ambiguous. Unicode letters and digits are therefore kept, and the caller is
 * responsible for making the result unique within a document.
 */
export function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
}

/** Splits `# 2.3 Partial fractions` into its code and title halves. */
function splitHeading(heading: string): { code: string; title: string } {
  const match = heading.match(/^([\d.]+)\s+(.*)$/)
  if (!match) return { code: '', title: heading.trim() }
  return { code: match[1], title: match[2].trim() }
}

export function parseNote(markdown: string): ParsedNote {
  const lines = markdown.split('\n')
  const sections: ParsedSection[] = []
  /** Section ids already handed out in this document, to keep them unique. */
  const usedIds = new Set<string>()
  let code = ''
  let title = ''
  let summary = ''
  let current: ParsedSection | null = null
  let paragraph: string[] = []
  let paragraphLine = 0
  let quote: string[] = []
  let quoteLine = 0
  let list: string[] = []
  let listLine = 0
  let table: string[][] = []
  let tableLine = 0
  // Fenced code blocks are captured verbatim: whitespace is meaningful in the
  // languages these notes teach, so nothing inside a fence may be reflowed.
  let fenceLanguage: string | null = null
  let fence: string[] = []
  let fenceLine = 0

  function flushParagraph() {
    if (paragraph.length === 0) return
    const text = paragraph.join(' ').trim()
    paragraph = []
    if (!text) return
    // The first paragraph before any section is the note summary.
    if (!current && !summary) {
      summary = text
      return
    }
    current?.blocks.push({ kind: 'paragraph', text, line: paragraphLine })
  }

  function flushQuote() {
    if (quote.length === 0) return
    const text = quote.join(' ').trim()
    quote = []
    if (text) current?.blocks.push({ kind: 'callout', text, line: quoteLine })
  }

  function flushList() {
    if (list.length === 0) return
    const items = [...list]
    list = []
    current?.blocks.push({ kind: 'list', text: items.join('\n'), items, line: listLine })
  }

  function flushTable() {
    if (table.length === 0) return
    const rows = [...table]
    table = []
    current?.blocks.push({ kind: 'table', text: '', rows, line: tableLine })
  }

  function flushFence() {
    if (fenceLanguage === null) return
    const body = fence.join('\n')
    const language = fenceLanguage
    fenceLanguage = null
    fence = []
    if (body.trim()) {
      current?.blocks.push({ kind: 'code', text: body, language: language || undefined, line: fenceLine })
    }
  }

  function flushAll() {
    flushFence()
    flushParagraph()
    flushQuote()
    flushList()
    flushTable()
  }

  lines.forEach((raw, index) => {
    const line = raw.trimEnd()

    if (/^\s*```/.test(line)) {
      if (fenceLanguage === null) {
        flushAll()
        fenceLanguage = line.trim().replace(/^`+/, '').trim()
        fenceLine = index
      } else {
        flushFence()
      }
      return
    }

    if (fenceLanguage !== null) {
      fence.push(raw)
      return
    }

    if (/^#\s+/.test(line)) {
      flushAll()
      const heading = splitHeading(line.replace(/^#\s+/, ''))
      code = heading.code
      title = heading.title
      return
    }

    // `###` is treated as a section too: written lessons nest one level deeper
    // in places, and silently dropping those headings would bury their content
    // in whatever section came before.
    if (/^#{2,4}\s+/.test(line)) {
      flushAll()
      const heading = line.replace(/^#{2,4}\s+/, '').trim()
      // Ids must be unique within the document: they key the rendered section
      // list and anchor in-page links. A repeated heading — "Method" twice in
      // one lesson — or one that slugifies to nothing takes a numbered suffix.
      const base = slugify(heading) || 'section'
      let id = base
      for (let n = 2; usedIds.has(id); n += 1) id = `${base}-${n}`
      usedIds.add(id)
      current = { id, title: heading, blocks: [], line: index }
      sections.push(current)
      return
    }

    // Markdown table row. The |---|---| separator carries no data, so it is
    // recognised and skipped rather than becoming a row of dashes.
    if (/^\|.*\|\s*$/.test(line)) {
      flushParagraph()
      flushQuote()
      flushList()
      if (table.length === 0) tableLine = index
      const cells = line.slice(1, -1).split('|').map((cell) => cell.trim())
      if (!cells.every((cell) => /^:?-{2,}:?$/.test(cell))) table.push(cells)
      return
    }

    if (/^>\s?/.test(line)) {
      flushParagraph()
      flushList()
      if (quote.length === 0) quoteLine = index
      quote.push(line.replace(/^>\s?/, ''))
      return
    }

    if (/^[-*]\s+/.test(line)) {
      flushParagraph()
      flushQuote()
      if (list.length === 0) listLine = index
      list.push(line.replace(/^[-*]\s+/, '').trim())
      return
    }

    if (line.trim() === '') {
      flushAll()
      return
    }

    flushQuote()
    flushList()
    if (paragraph.length === 0) paragraphLine = index
    paragraph.push(line.trim())
  })

  // flushAll() also closes an unterminated fence, so its content is kept.
  flushAll()
  return { code, title, summary, sections }
}

export interface NoteSearchHit {
  sectionId: string
  sectionTitle: string
  /** The matching block's text, trimmed to a readable window around the match. */
  snippet: string
  line: number
}

/** Case-insensitive search across a note's blocks. Used by the agent's search tool. */
export function searchNote(markdown: string, query: string, limit = 8): NoteSearchHit[] {
  const needle = query.trim().toLowerCase()
  if (!needle) return []
  const note = parseNote(markdown)
  const hits: NoteSearchHit[] = []

  for (const section of note.sections) {
    for (const block of section.blocks) {
      const haystack = block.text.toLowerCase()
      const at = haystack.indexOf(needle)
      if (at === -1) continue
      const start = Math.max(0, at - 60)
      const end = Math.min(block.text.length, at + needle.length + 60)
      hits.push({
        sectionId: section.id,
        sectionTitle: section.title,
        snippet: `${start > 0 ? '…' : ''}${block.text.slice(start, end).trim()}${
          end < block.text.length ? '…' : ''
        }`,
        line: block.line,
      })
      if (hits.length >= limit) return hits
    }
  }
  return hits
}

/**
 * Replaces the first occurrence of `find` in the markdown. Returns null when
 * the passage is absent or ambiguous, so a tool can refuse rather than guess
 * at which of several matches the author meant.
 */
export function replacePassage(
  markdown: string,
  find: string,
  replace: string,
): { markdown: string; line: number } | null {
  const occurrences = markdown.split(find).length - 1
  if (occurrences !== 1) return null
  const index = markdown.indexOf(find)
  const line = markdown.slice(0, index).split('\n').length - 1
  return { markdown: markdown.slice(0, index) + replace + markdown.slice(index + find.length), line }
}

/** Appends a `> callout` to the end of a named section. */
export function appendCallout(markdown: string, sectionId: string, text: string): string | null {
  const note = parseNote(markdown)
  const index = note.sections.findIndex((section) => section.id === sectionId)
  if (index === -1) return null

  const lines = markdown.split('\n')
  const next = note.sections[index + 1]
  const end = next ? next.line : lines.length
  // Walk back over trailing blank lines so the callout sits with its section.
  let insertAt = end
  while (insertAt > 0 && lines[insertAt - 1].trim() === '') insertAt -= 1

  const callout = text
    .split('\n')
    .map((part) => `> ${part}`)
    .join('\n')
  lines.splice(insertAt, 0, '', callout)
  return lines.join('\n')
}

/** Compact line diff, for showing a student what a proposed revision changes. */
export interface DiffLine {
  kind: 'added' | 'removed' | 'context'
  text: string
}

export function diffMarkdown(before: string, after: string): DiffLine[] {
  const beforeLines = before.split('\n')
  const afterLines = after.split('\n')
  const beforeSet = new Set(beforeLines)
  const afterSet = new Set(afterLines)
  const out: DiffLine[] = []

  for (const line of beforeLines) {
    if (!afterSet.has(line) && line.trim()) out.push({ kind: 'removed', text: line })
  }
  for (const line of afterLines) {
    if (!beforeSet.has(line) && line.trim()) out.push({ kind: 'added', text: line })
  }
  return out
}

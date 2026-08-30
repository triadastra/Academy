// MarkdownText.tsx — renders a model reply.
//
// Kimi K3 answers in markdown with LaTeX ($ inline, $$ display), so a chat
// bubble that prints the raw string shows "## 1." and "$$\int 2x\,dx$$" to the
// student. This renders the subset models actually emit and hands math to the
// existing <Tex> wrapper, matching how notes are rendered.
//
// Covers what models actually emit: headings, paragraphs, ordered/unordered
// lists, tables, fenced code, blockquotes, rules, and inline math, bold,
// italic, strikethrough, code, and links. Anything unrecognised falls through
// as plain text rather than being dropped.
//
// `_underscore_` italics are deliberately NOT parsed: this app answers CS
// questions full of snake_case identifiers, and treating those as emphasis
// mangles far more replies than it prettifies.
import type { ReactNode } from 'react'
import Tex from './Tex'

// Ordered longest-first so `***x***` beats `**x**` beats `*x*`. The italic arm
// requires non-space just inside the asterisks, so arithmetic like `2 * 3 * 4`
// is left alone.
const INLINE = new RegExp(
  [
    '\\$\\$[^$]+\\$\\$', // display math
    '\\$[^$\\n]+\\$', // inline math
    '`[^`]+`', // inline code
    '\\*\\*\\*[^*]+\\*\\*\\*', // bold italic
    '\\*\\*[^*]+\\*\\*', // bold
    '\\*[^\\s*](?:[^*\\n]*[^\\s*])?\\*', // italic
    '~~[^~]+~~', // strikethrough
    '\\[[^\\]\\n]+\\]\\([^)\\s]+\\)', // link
  ].join('|'),
  'g',
)

/** Splits a line into text, math, emphasis, code, and link runs. */
function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const parts = text.split(new RegExp(`(${INLINE.source})`, 'g'))
  return parts.filter(Boolean).map((part, index) => {
    const key = `${keyPrefix}-${index}`
    if (part.startsWith('$$') && part.endsWith('$$')) {
      return (
        <Tex key={key} display className="my-2 block">
          {part.slice(2, -2).trim()}
        </Tex>
      )
    }
    if (part.startsWith('$') && part.endsWith('$') && part.length > 2) {
      return <Tex key={key}>{part.slice(1, -1).trim()}</Tex>
    }
    if (part.startsWith('***') && part.endsWith('***')) {
      return (
        <strong key={key} className="font-medium italic text-ink">
          {part.slice(3, -3)}
        </strong>
      )
    }
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={key} className="font-medium text-ink">
          {part.slice(2, -2)}
        </strong>
      )
    }
    if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
      return (
        <em key={key} className="italic">
          {part.slice(1, -1)}
        </em>
      )
    }
    if (part.startsWith('~~') && part.endsWith('~~')) {
      return (
        <s key={key} className="text-ink-muted">
          {part.slice(2, -2)}
        </s>
      )
    }
    const link = part.match(/^\[([^\]\n]+)\]\(([^)\s]+)\)$/)
    if (link) {
      return (
        <a
          key={key}
          href={link[2]}
          target="_blank"
          rel="noopener noreferrer"
          className="underline decoration-rule underline-offset-2 hover:decoration-ink"
        >
          {link[1]}
        </a>
      )
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code key={key} className="rounded-chip bg-paper px-1 py-0.5 font-mono text-[13px]">
          {part.slice(1, -1)}
        </code>
      )
    }
    return <span key={key}>{part}</span>
  })
}

interface Block {
  kind: 'heading' | 'paragraph' | 'list' | 'table' | 'code' | 'quote' | 'rule'
  text: string
  items?: string[]
  ordered?: boolean
  /** Table rows, first row being the header. Set only when kind is 'table'. */
  rows?: string[][]
  /** Fence info string, e.g. `python`. Set only when kind is 'code'. */
  language?: string
}

function parseBlocks(markdown: string): Block[] {
  const blocks: Block[] = []
  let paragraph: string[] = []
  let list: string[] = []
  let ordered = false
  let table: string[][] = []
  let quote: string[] = []
  // A fence swallows every line until it closes, so whitespace inside code —
  // which is meaningful in the languages this app teaches — survives intact.
  let fence: string | null = null
  let code: string[] = []

  const flushParagraph = () => {
    if (!paragraph.length) return
    blocks.push({ kind: 'paragraph', text: paragraph.join(' ') })
    paragraph = []
  }
  const flushList = () => {
    if (!list.length) return
    blocks.push({ kind: 'list', text: '', items: [...list], ordered })
    list = []
  }
  const flushTable = () => {
    if (!table.length) return
    blocks.push({ kind: 'table', text: '', rows: [...table] })
    table = []
  }
  const flushQuote = () => {
    if (!quote.length) return
    blocks.push({ kind: 'quote', text: quote.join(' ') })
    quote = []
  }
  const flushCode = () => {
    if (fence === null) return
    const body = code.join('\n')
    const language = fence
    fence = null
    code = []
    if (body.trim()) blocks.push({ kind: 'code', text: body, language: language || undefined })
  }
  const flushAll = () => {
    flushCode()
    flushParagraph()
    flushList()
    flushTable()
    flushQuote()
  }

  // Models often run "## Heading" inline after a sentence; give headings their
  // own line first so they are recognised either way.
  for (const raw of markdown.replace(/\s(#{2,4}\s)/g, '\n$1').split('\n')) {
    const line = raw.trim()

    if (/^```/.test(line)) {
      if (fence === null) {
        flushAll()
        fence = line.replace(/^`+/, '').trim()
      } else {
        flushCode()
      }
      continue
    }
    if (fence !== null) {
      code.push(raw)
      continue
    }

    // A table row. The |---|---| separator carries no data, so it is
    // recognised and skipped rather than becoming a row of dashes.
    if (/^\|.*\|$/.test(line)) {
      flushParagraph()
      flushList()
      flushQuote()
      const cells = line.slice(1, -1).split('|').map((cell) => cell.trim())
      if (!cells.every((cell) => /^:?-{2,}:?$/.test(cell))) table.push(cells)
      continue
    }
    if (/^(\s*[-*_]\s*){3,}$/.test(line)) {
      flushAll()
      blocks.push({ kind: 'rule', text: '' })
      continue
    }
    if (/^#{1,4}\s/.test(line)) {
      flushAll()
      blocks.push({ kind: 'heading', text: line.replace(/^#{1,4}\s/, '') })
      continue
    }
    if (/^>\s?/.test(line)) {
      flushParagraph()
      flushList()
      flushTable()
      quote.push(line.replace(/^>\s?/, ''))
      continue
    }
    const orderedItem = line.match(/^(\d+)[.)]\s+(.*)$/)
    if (orderedItem) {
      flushParagraph()
      flushTable()
      flushQuote()
      if (!ordered) flushList()
      ordered = true
      list.push(orderedItem[2])
      continue
    }
    if (/^[-*+]\s+/.test(line)) {
      flushParagraph()
      flushTable()
      flushQuote()
      if (ordered) flushList()
      ordered = false
      list.push(line.replace(/^[-*+]\s+/, ''))
      continue
    }
    if (!line) {
      flushAll()
      continue
    }
    flushList()
    flushTable()
    flushQuote()
    paragraph.push(line)
  }
  // flushAll() also closes an unterminated fence, so a reply that is still
  // streaming mid-code-block shows its code rather than nothing.
  flushAll()
  return blocks
}

export default function MarkdownText({ children }: { children: string }) {
  const blocks = parseBlocks(children)
  return (
    <div className="flex flex-col gap-2.5">
      {blocks.map((block, index) => {
        const key = `b${index}`
        if (block.kind === 'heading') {
          return (
            <h3 key={key} className="mt-1 text-[14px] font-medium text-ink">
              {renderInline(block.text, key)}
            </h3>
          )
        }
        if (block.kind === 'rule') {
          return <hr key={key} className="my-1 border-0 border-t border-rule" />
        }
        if (block.kind === 'quote') {
          return (
            <blockquote
              key={key}
              className="border-l-2 border-board bg-board-tint/50 px-3 py-2 text-[14px] leading-relaxed text-ink-muted"
            >
              {renderInline(block.text, key)}
            </blockquote>
          )
        }
        if (block.kind === 'code') {
          return (
            <div key={key} className="overflow-hidden rounded-card border border-rule bg-paper">
              {block.language ? (
                <div className="border-b border-rule px-3 py-1 font-mono text-[10px] uppercase tracking-[0.08em] text-ink-muted">
                  {block.language}
                </div>
              ) : null}
              <pre className="overflow-x-auto px-3 py-2.5">
                <code className="font-mono text-[12.5px] leading-6 text-ink">{block.text}</code>
              </pre>
            </div>
          )
        }
        if (block.kind === 'table') {
          const [header, ...rows] = block.rows ?? []
          return (
            <div key={key} className="overflow-x-auto">
              <table className="w-full border-collapse text-[14px]">
                {header ? (
                  <thead>
                    <tr>
                      {header.map((cell, cellIndex) => (
                        <th
                          key={cellIndex}
                          className="border-b border-rule px-3 py-2 text-left font-medium text-ink"
                        >
                          {renderInline(cell, `${key}-h${cellIndex}`)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                ) : null}
                <tbody>
                  {rows.map((row, rowIndex) => (
                    <tr key={rowIndex}>
                      {row.map((cell, cellIndex) => (
                        <td
                          key={cellIndex}
                          className="border-b border-rule px-3 py-2 align-top text-ink"
                        >
                          {renderInline(cell, `${key}-${rowIndex}-${cellIndex}`)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        }
        if (block.kind === 'list') {
          const List = block.ordered ? 'ol' : 'ul'
          return (
            <List
              key={key}
              className={`flex flex-col gap-1.5 pl-5 ${block.ordered ? 'list-decimal' : 'list-disc'}`}
            >
              {(block.items ?? []).map((item, itemIndex) => (
                <li key={`${key}-${itemIndex}`} className="text-[14px] leading-relaxed text-ink">
                  {renderInline(item, `${key}-${itemIndex}`)}
                </li>
              ))}
            </List>
          )
        }
        return (
          <p key={key} className="text-[14px] leading-relaxed text-ink">
            {renderInline(block.text, key)}
          </p>
        )
      })}
    </div>
  )
}

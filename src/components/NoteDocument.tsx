// NoteDocument.tsx — renders a shared course note from its markdown.
//
// Built on the same parser the agent tools use (`parseNote`), so what a student
// reads and what an agent edits can never drift apart. Inline `$x$` and display
// `$$…$$` math is handed to the existing <Tex> wrapper rather than a second
// markdown/math stack.
import type { ReactNode } from 'react'
import { Sparkles } from 'lucide-react'
import Tex from './Tex'
import { parseNote, type ParsedSection } from '@/database/notes-markdown'

/**
 * Splits a line into text, math, bold and code runs. `$$…$$` becomes a display
 * block. Written lessons use bold for defined terms, so leaving it unparsed
 * would print literal asterisks through the whole document.
 */
function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const parts = text.split(/(\$\$[^$]+\$\$|\$[^$\n]+\$|\*\*[^*]+\*\*|`[^`]+`)/g)
  return parts.filter(Boolean).map((part, index) => {
    const key = `${keyPrefix}-${index}`
    if (part.startsWith('$$') && part.endsWith('$$')) {
      return (
        <Tex key={key} display className="my-3 block text-ink">
          {part.slice(2, -2).trim()}
        </Tex>
      )
    }
    if (part.startsWith('$') && part.endsWith('$') && part.length > 2) {
      return <Tex key={key}>{part.slice(1, -1).trim()}</Tex>
    }
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={key} className="font-medium text-ink">
          {part.slice(2, -2)}
        </strong>
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

function Section({ section, index, code }: { section: ParsedSection; index: number; code: string }) {
  return (
    <section id={section.id}>
      <div className="flex items-baseline gap-3 border-b border-rule pb-2">
        <span className="font-mono text-[11px] text-ink-muted">
          {code}.{index + 1}
        </span>
        <h3 className="font-serif text-[20px] text-ink">{section.title}</h3>
      </div>
      <div className="mt-4 flex flex-col gap-3">
        {section.blocks.map((block, blockIndex) => {
          const key = `${section.id}-${blockIndex}`
          if (block.kind === 'callout') {
            return (
              <div key={key} className="border-l-2 border-board bg-board-tint/50 px-4 py-3">
                <div className="flex items-start gap-2">
                  <Sparkles size={14} className="text-board mt-0.5 shrink-0" />
                  <p className="text-[12px] leading-relaxed text-ink-muted">
                    {renderInline(block.text, key)}
                  </p>
                </div>
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
          if (block.kind === 'list') {
            return (
              <ul key={key} className="flex list-disc flex-col gap-1.5 pl-5">
                {(block.items ?? []).map((item, itemIndex) => (
                  <li key={`${key}-${itemIndex}`} className="text-[15px] leading-7 text-ink">
                    {renderInline(item, `${key}-${itemIndex}`)}
                  </li>
                ))}
              </ul>
            )
          }
          return (
            <p key={key} className="text-[15px] leading-7 text-ink">
              {renderInline(block.text, key)}
            </p>
          )
        })}
      </div>
    </section>
  )
}

export default function NoteDocument({
  markdown,
  query,
}: {
  markdown: string
  /** When set, only sections whose text matches are rendered. */
  query?: string
}) {
  const note = parseNote(markdown)
  const needle = query?.trim().toLowerCase() ?? ''
  const sections = needle
    ? note.sections.filter((section) =>
        `${section.title} ${section.blocks.map((block) => block.text).join(' ')}`
          .toLowerCase()
          .includes(needle),
      )
    : note.sections

  return (
    <>
      <div className="flex flex-col gap-9">
        {sections.map((section) => (
          <Section
            key={section.id}
            section={section}
            index={note.sections.indexOf(section)}
            code={note.code}
          />
        ))}
      </div>
      {sections.length === 0 ? (
        <div className="border border-dashed border-rule rounded-card px-8 py-12 text-center text-[13px] text-ink-muted">
          No note sections match “{query}”.
        </div>
      ) : null}
    </>
  )
}

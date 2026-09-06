// Page.tsx — the single source of page chrome for every page in the product:
// student, teacher and administrator alike.
//
// Before this existed, each page invented its own header (four h1 sizes, three
// eyebrow treatments, some with a bar and some without), its own padding
// (px-6 / px-8 / px-10) and its own measure (640 → 1100px). Students moving
// between Chat, Notes and Question Base had to re-orient on every route. Use
// these primitives instead of hand-rolling page chrome.
//
// The contract:
//   <Page>                       fills the shell's slot, owns the scroll
//     <PageBar … />              OPTIONAL slim action bar — see rule below
//     <SidePanel … />            optional secondary rail (index or list width)
//     <PageBody …>               the scrolling well: one padding, one measure
//       <TableCard … >           the one table: card, header row, count strip
//         <TableEmpty … />       its empty state, so the card keeps its shape
//       <PageAction … />         the one button, in four weights
//       <PageNotice … />         the one inline refusal, until it is resolved
//     <Toast … />                the one transient confirmation (useToast)
//   </Page>
//
// RULE: no page prints its own name. The rail already shows the school, the
// course and the active route; an <h1> restating the nav label is ~130px of
// chrome that tells the student nothing they can't see two inches to the left.
// Content starts at the top of the page. A page renders PageBar only when it
// owns a real page-level action, and that bar carries the action — not a title,
// not a description.
import type { ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

/** Fills CourseShell's centre slot. PageBar stays put, PageBody scrolls. */
export default function Page({ children }: { children: ReactNode }) {
  return <div className="flex h-full min-h-0 flex-col overflow-hidden">{children}</div>
}

/**
 * Slim bar for page-level actions and page-level state. Never for a heading.
 * `context` is short live state (a count, a saved-at stamp), not a description
 * of the page; `children` are actions or filters that scope the whole page.
 *
 * Both are optional, and a page with state but nothing to press still gets the
 * strip — Data retention is a read-only report and would otherwise be the one
 * page in the admin area starting half an inch higher than its siblings. What
 * a bar must not do is appear with nothing in it at all.
 */
export function PageBar({ context, children }: { context?: ReactNode; children?: ReactNode }) {
  return (
    <div className="shrink-0 flex items-center justify-between flex-wrap gap-3 border-b border-rule bg-surface px-4 py-3 sm:px-8">
      {/* `truncate`, not wrap: this is a one-line strip, and when the actions
          beside it are wide (People's three filters) an unconstrained context
          collapses into a column one word per line and pushes the bar to the
          height of a header. */}
      <div className="min-w-0 truncate font-mono text-[11px] uppercase tracking-[0.08em] text-ink-muted">
        {context}
      </div>
      {children ? <div className="flex flex-wrap items-center gap-2">{children}</div> : null}
    </div>
  )
}

const MEASURE = {
  /** 820px — reading column: prose, one question, a form of stacked fields. */
  reading: 'max-w-[820px]',
  /** 1080px — tables, dashboards, anything with columns. */
  wide: 'max-w-[1080px]',
  /** Edge to edge: previews, canvases, split views that manage their own width. */
  full: 'max-w-none',
} as const

export function PageBody({
  measure = 'wide',
  className,
  children,
}: {
  measure?: keyof typeof MEASURE
  /** Applied to the measured container, so `flex`/`min-h-full` land correctly. */
  className?: string
  children: ReactNode
}) {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-8 sm:py-7">
      <div className={`mx-auto w-full ${MEASURE[measure]} ${className ?? ''}`}>{children}</div>
    </div>
  )
}

const RAIL = {
  /** 280px — an index: units, topics, a table of contents. */
  index: 'w-[280px]',
  /** 360px — a list of items you read in the pane beside it. */
  list: 'w-[360px]',
} as const

export function SidePanel({
  title,
  width = 'index',
  actions,
  sticky,
  children,
}: {
  title: string
  width?: keyof typeof RAIL
  /** Filters or controls that belong to the panel, not the page. */
  actions?: ReactNode
  /** Search / filter block pinned under the heading, above the scroll area. */
  sticky?: ReactNode
  children: ReactNode
}) {
  return (
    <aside className={`page-side-panel ${RAIL[width]} flex min-h-0 shrink-0 flex-col border-r border-rule bg-surface`}>
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-rule px-4 py-3">
        <h2 className="font-mono text-[11px] uppercase tracking-[0.08em] text-ink-muted">{title}</h2>
        {actions ? <div className="flex shrink-0 items-center gap-3">{actions}</div> : null}
      </div>
      {sticky ? <div className="shrink-0 border-b border-rule p-4">{sticky}</div> : null}
      <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
    </aside>
  )
}

const ACTION_BASE =
  'inline-flex min-h-9 items-center justify-center gap-2 rounded-control px-3.5 py-2 text-[13px] transition-colors duration-[120ms] ease-out disabled:cursor-not-allowed disabled:opacity-40'

const ACTION_VARIANT = {
  primary: 'bg-board text-paper hover:bg-board-deep',
  secondary: 'border border-rule bg-surface text-ink hover:border-board',
  /** Reversible harm: suspending an account, discarding a draft. */
  danger: 'border border-mark text-mark hover:bg-mark-tint',
  /** Irreversible harm, and only that. Filled, so it cannot be mistaken for
      the outlined one sitting next to it. */
  destructive: 'bg-mark text-paper font-medium hover:bg-mark/90',
} as const

/** The one button shape for page-level actions. Renders <a> when `href` is set. */
export function PageAction({
  variant = 'secondary',
  href,
  download,
  onClick,
  disabled,
  label,
  className,
  children,
}: {
  variant?: keyof typeof ACTION_VARIANT
  href?: string
  download?: string
  onClick?: () => void
  disabled?: boolean
  /** aria-label, for icon-only or otherwise ambiguous actions. */
  label?: string
  className?: string
  children: ReactNode
}) {
  const classes = `${ACTION_BASE} ${ACTION_VARIANT[variant]} ${className ?? ''}`
  if (href) {
    return (
      <a href={href} download={download} aria-label={label} className={classes}>
        {children}
      </a>
    )
  }
  return (
    <button type="button" onClick={onClick} disabled={disabled} aria-label={label} className={classes}>
      {children}
    </button>
  )
}

const SELECT_FIELD =
  'appearance-none rounded-control border border-rule bg-surface py-1.5 pl-3 pr-8 text-[13px] focus:border-board focus:outline-none disabled:opacity-60'

/**
 * The one select. A native <select> with the chevron drawn on top, because the
 * platform one cannot be styled and two of them side by side in a PageBar have
 * to match. Every filter in the product is one of these.
 */
export function FilterSelect({
  label,
  value,
  options,
  onChange,
  disabled,
  block,
  className,
}: {
  /** aria-label — a bare select in a bar has no visible label. */
  label: string
  value: string
  options: readonly string[]
  onChange: (value: string) => void
  disabled?: boolean
  /** Fill the container, for a select in a panel rather than a bar. */
  block?: boolean
  className?: string
}) {
  return (
    <div className={block ? 'relative w-full' : 'relative'}>
      <select
        aria-label={label}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className={cn(SELECT_FIELD, block && 'w-full', className)}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      <ChevronDown
        size={13}
        className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-muted"
      />
    </div>
  )
}

/**
 * The one inline refusal. When an action is declined — a role change the store
 * will not allow, an export with nothing to export — the reason belongs beside
 * the control that was pressed, and it stays until the situation changes.
 * `role="alert"` so it is announced the moment it appears.
 */
export function PageNotice({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <p
      role="alert"
      className={`rounded-control border border-mark/40 bg-mark-tint px-3 py-2 text-[13px] text-mark ${className ?? ''}`}
    >
      {children}
    </p>
  )
}

/**
 * The one transient confirmation, bottom centre. For "it worked" only — never
 * for anything the user has to read to carry on, which is what PageNotice is.
 * Its state lives in `useToast` (hooks/use-toast).
 */
export function Toast({ children }: { children: ReactNode }) {
  return (
    <div
      role="status"
      className="fixed bottom-16 left-1/2 z-50 -translate-x-1/2 rounded-control bg-ink px-4 py-2 text-[13px] text-paper"
    >
      {children}
    </div>
  )
}

/**
 * The one table shape: a bordered card, a light header row, and a footer strip
 * that says how much of the data you are looking at. Rows belong to the
 * caller; the chrome around them does not — it was copied between pages and
 * came out with different paddings, different empty states and, on People, a
 * pager whose arrows were painted on and did nothing.
 */
export function TableCard({
  columns,
  footer,
  className,
  children,
}: {
  columns: string[]
  /** Count line under the table. Omitted when there is nothing to count. */
  footer?: ReactNode
  className?: string
  children: ReactNode
}) {
  return (
    <div className={`overflow-hidden rounded-card border border-rule bg-surface ${className ?? ''}`}>
      {/* The card clips, so the table needs its own scroller: without one, a
          table wider than the well loses its right-hand columns silently — no
          scrollbar, no ellipsis, just a column that is not there. */}
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-rule text-[12px] text-ink-muted">
              {columns.map((column) => (
                <th key={column} scope="col" className="px-4 py-2.5 font-normal">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>{children}</tbody>
        </table>
      </div>
      {footer ? (
        <div className="border-t border-rule px-4 py-2.5 text-center text-[12px] text-ink-muted">
          {footer}
        </div>
      ) : null}
    </div>
  )
}

/** The empty state for a TableCard — a row, so the card keeps its shape. */
export function TableEmpty({ columns, children }: { columns: number; children: ReactNode }) {
  return (
    <tr>
      <td colSpan={columns} className="px-4 py-10 text-center text-[13px] text-ink-muted">
        {children}
      </td>
    </tr>
  )
}

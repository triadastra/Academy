// AppShell.tsx — three-column shell (design.md §Geometry):
// left rail 240px (dark green #26493F) with institution crest block, nav list
// (icon + label, active state board-tint/board), user chip at bottom · fluid
// center slot · optional 320px right drawer via `right?: ReactNode`.
import type { ReactNode } from 'react'
import Crest from './Crest'
import { getInstitution } from '@/database/client'

export interface NavItem {
  key: string
  label: string
  icon?: ReactNode
  onSelect?: () => void
}

export interface ShellUser {
  name: string
  role?: string
  initials?: string
}

export default function AppShell({
  nav,
  active,
  right,
  user,
  children,
}: {
  nav: NavItem[]
  active?: string
  right?: ReactNode
  user?: ShellUser
  children: ReactNode
}) {
  const institution = getInstitution()
  return (
    <div className="flex h-[100dvh] overflow-hidden bg-paper text-ink">
      {/* Left rail — 240px, deep chalkboard green */}
      <aside className="w-[240px] h-full min-h-0 shrink-0 flex flex-col bg-board-deep text-paper">
        {/* Institution crest block */}
        <div className="flex items-start gap-3 px-5 pt-6 pb-5 border-b border-white/15">
          <Crest size={36} tone="light" />
          <div className="min-w-0">
            <div className="text-[14px] font-medium leading-tight">{institution.short}</div>
            <div className="text-[12px] leading-snug text-paper/70">{institution.name}</div>
          </div>
        </div>

        {/* Nav list */}
        <nav className="flex-1 px-3 py-4 overflow-y-auto">
          <ul className="flex flex-col gap-0.5">
            {nav.map((item) => {
              const isActive = item.key === active
              return (
                <li key={item.key}>
                  <button
                    type="button"
                    onClick={item.onSelect}
                    aria-current={isActive ? 'page' : undefined}
                    className={
                      isActive
                        ? 'w-full flex items-center gap-2.5 px-3 py-2 rounded-control text-[14px] bg-board-tint text-board font-medium text-left'
                        : 'w-full flex items-center gap-2.5 px-3 py-2 rounded-control text-[14px] text-paper/80 hover:bg-white/10 text-left transition-colors duration-[120ms] ease-out'
                    }
                  >
                    {item.icon ? <span className="shrink-0">{item.icon}</span> : null}
                    <span className="truncate">{item.label}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        </nav>

        {/* User chip */}
        {user ? (
          <div className="px-4 py-4 border-t border-white/15 flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-control bg-board-tint text-board font-mono text-[12px] flex items-center justify-center shrink-0">
              {user.initials ?? user.name.slice(0, 1)}
            </span>
            <div className="min-w-0">
              <div className="text-[14px] leading-tight truncate">{user.name}</div>
              {user.role ? (
                <div className="text-[12px] text-paper/60 leading-tight truncate">{user.role}</div>
              ) : null}
            </div>
          </div>
        ) : null}
      </aside>

      {/* Center slot — fluid */}
      <main className="flex-1 min-w-0 min-h-0 overflow-y-auto">{children}</main>

      {/* Optional right drawer — 320px */}
      {right ? (
        <aside className="w-[320px] h-full min-h-0 shrink-0 overflow-y-auto border-l border-rule bg-surface">{right}</aside>
      ) : null}
    </div>
  )
}

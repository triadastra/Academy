// AdminShell.tsx — ONE shared shell for every administrator page
// (/admin/people, /admin/audit).
//
// It used to take `nav`, `header`, `footer` and `railWidth` as props, and each
// admin page passed its own. Audit drew a 230px rail headed by a serif
// wordmark, with eight nav entries; People drew a 190px rail headed by a
// centred roundel, with seven different ones. Eleven of those fifteen entries
// — Analytics, Taxonomy, Quality, Sessions, Reports, Content, Students … —
// were links to /admin/audit wearing some other page's name, and the entire
// rail redrew itself when you moved between the only two admin routes that
// exist. The nav is now stated once, here, and names only real destinations;
// the crest block, the section chip, the 240px width and the user chip are the
// ones CourseShell and AppShell already use, so the administrator area reads
// as the same product as the rest of Synonance rather than a third design.
import { useEffect, useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router'
import { Menu, X, Database, KeyRound, LogOut, Megaphone, ShieldCheck, Users } from 'lucide-react'
import Crest from './Crest'
import {
  getCurrentUser,
  getInstitution,
  signOutCurrentUser,
  touchSession,
} from '@/database/client'

export interface AdminNavItem {
  key: string
  label: string
  icon: ReactNode
  to: string
  /** Routes shown under this item while it, or one of them, is active. */
  children?: Array<{ key: string; label: string; to: string }>
}

/**
 * The administrator area in full. Every entry, at both levels, is a route.
 *
 * The three Data-and-compliance entries were component state until they had
 * pages to point at: clicking one swapped a filter over the audit log without
 * changing the URL, so "Data retention" was the audit log, "Data exports" was
 * the audit log with a `where action = data.exported`, and neither could be
 * linked to, bookmarked or reloaded.
 */
const ADMIN_NAV: AdminNavItem[] = [
  { key: 'people', label: 'People and roles', icon: <Users size={16} />, to: '/admin/people' },
  { key: 'messages', label: 'Messages', icon: <Megaphone size={16} />, to: '/admin/notifications' },
  {
    key: 'data',
    label: 'Data and compliance',
    icon: <Database size={16} />,
    to: '/admin/audit',
    children: [
      { key: 'audit', label: 'Data access and audit', to: '/admin/audit' },
      { key: 'retention', label: 'Data retention', to: '/admin/retention' },
      { key: 'exports', label: 'Data exports', to: '/admin/exports' },
    ],
  },
  // The credential and the quarantine. Both were functions in the data layer
  // that no screen could reach: the shipped administrator password could not be
  // changed from inside the product at all, and a stored database the running
  // build could not read was held for recovery that nothing offered.
  { key: 'security', label: 'Security', icon: <KeyRound size={16} />, to: '/admin/security' },
]

export default function AdminShell({
  active,
  right,
  children,
}: {
  /** Key of the active leaf: 'people' | 'audit' | 'retention' | 'exports'. */
  active?: string
  /** 320px drawer — same slot, same width as CourseShell's. */
  right?: ReactNode
  children: ReactNode
}) {
  const navigate = useNavigate()
  const account = getCurrentUser()
  const institution = getInstitution()

  // The activity listeners CourseShell installs. Without them the sliding idle
  // deadline expired underneath an administrator who was working the whole
  // time, because nothing in the admin area ever pushed it forward.
  useEffect(() => {
    const onActivity = () => touchSession()
    onActivity()
    window.addEventListener('pointerdown', onActivity)
    window.addEventListener('keydown', onActivity)
    window.addEventListener('focus', onActivity)
    return () => {
      window.removeEventListener('pointerdown', onActivity)
      window.removeEventListener('keydown', onActivity)
      window.removeEventListener('focus', onActivity)
    }
  }, [])

  const [menuOpen, setMenuOpen] = useState(false)

  const signOut = () => {
    signOutCurrentUser()
    navigate('/login', { replace: true })
  }

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-paper text-ink font-sans">
      {menuOpen ? <button type="button" aria-label="Close navigation" onClick={() => setMenuOpen(false)} className="fixed inset-0 z-40 bg-ink/40 md:hidden" /> : null}
      {/* Left rail — 240px, deep chalkboard green, as in every other shell */}
      <aside onClick={() => setMenuOpen(false)} className={`${menuOpen ? 'fixed inset-y-0 left-0 z-50 flex' : 'hidden'} w-[240px] h-full min-h-0 shrink-0 flex-col bg-board-deep text-paper md:static md:flex`}>
        {/* Institution crest block */}
        <div className="flex items-start gap-3 px-5 pt-6 pb-5 border-b border-white/15">
          <Crest size={36} tone="light" />
          <div className="min-w-0">
            <div className="text-[14px] font-medium leading-tight">{institution.short}</div>
            <div className="text-[12px] leading-snug text-paper/70">{institution.name}</div>
          </div>
        </div>

        {/* Section chip — where CourseShell puts the active course */}
        <div className="px-5 py-4 border-b border-white/15">
          <div className="font-mono text-[12px] uppercase tracking-[0.08em] text-paper/60 mb-1">
            Section
          </div>
          <div className="flex items-center gap-2.5">
            <span className="w-7 h-7 rounded-control bg-board-tint text-board flex items-center justify-center shrink-0">
              <ShieldCheck size={15} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-[14px] font-medium leading-tight truncate">Administration</div>
              <div className="text-[12px] text-paper/60 truncate">Institution-wide</div>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 overflow-y-auto">
          <ul className="flex flex-col gap-0.5">
            {ADMIN_NAV.map((item) => {
              // A parent is active when it IS the route or when it owns it, so
              // "Data and compliance" stays lit on all three of its pages.
              const isActive =
                item.key === active || (item.children?.some((c) => c.key === active) ?? false)
              return (
                <li key={item.key}>
                  <Link
                    to={item.to}
                    aria-current={item.key === active ? 'page' : undefined}
                    className={
                      isActive
                        ? 'w-full flex items-center gap-2.5 px-3 py-2 rounded-control text-[14px] bg-board-tint text-board font-medium text-left'
                        : 'w-full flex items-center gap-2.5 px-3 py-2 rounded-control text-[14px] text-paper/80 hover:bg-white/10 text-left transition-colors duration-[120ms] ease-out'
                    }
                  >
                    <span className="shrink-0">{item.icon}</span>
                    <span className="truncate">{item.label}</span>
                  </Link>
                  {isActive && item.children ? (
                    <ul className="mt-0.5 mb-1 flex flex-col gap-0.5">
                      {item.children.map((child) => (
                        <li key={child.key}>
                          <Link
                            to={child.to}
                            aria-current={child.key === active ? 'page' : undefined}
                            className={
                              child.key === active
                                ? 'block w-full pl-10 pr-3 py-1.5 text-left text-[13px] text-paper font-medium border-l-2 border-paper ml-4'
                                : 'block w-full pl-10 pr-3 py-1.5 text-left text-[13px] text-paper/60 hover:text-paper border-l-2 border-white/15 ml-4 transition-colors duration-[120ms] ease-out'
                            }
                          >
                            {child.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              )
            })}
          </ul>
        </nav>
        {/* User chip, then the one footer control that ever did anything.
            "Settings", "Admin accounts" and "Help" used to sit here too and
            were inert on click; a rail that lists three destinations it cannot
            reach teaches the administrator to distrust the two it can. */}
        <div className="border-t border-white/15">
          <Link
            to="/profile"
            className="px-4 pt-4 pb-2 flex items-center gap-2.5 hover:bg-white/5 transition-colors duration-[120ms] ease-out"
          >
            <span className="w-8 h-8 rounded-control bg-board-tint text-board font-mono text-[12px] flex items-center justify-center shrink-0">
              {account?.initials || '··'}
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-[14px] leading-tight truncate">
                {account?.displayName || account?.name || 'Signed in'}
              </div>
              <div className="text-[12px] text-paper/60 leading-tight truncate">
                {account?.role ?? 'Admin'}
              </div>
            </div>
          </Link>
          <div className="px-3 pb-3">
            <button
              type="button"
              onClick={signOut}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-control text-[14px] text-paper/80 hover:bg-white/10 text-left transition-colors duration-[120ms] ease-out"
            >
              <LogOut size={16} /> Sign out
            </button>
          </div>
        </div>
      </aside>

      {/* Centre slot — the same contract CourseShell offers, so <Page> and its
          primitives drop straight in on an admin route. */}
      <main className="flex-1 min-w-0 min-h-0 flex flex-col overflow-hidden">
        <div className="flex shrink-0 items-center gap-3 border-b border-rule bg-surface px-4 py-3 md:hidden"><button type="button" aria-label="Open administration menu" aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)} className="rounded-control border border-rule p-2">{menuOpen ? <X size={16} /> : <Menu size={16} />}</button><span className="text-[13px] text-ink-muted">Administration</span></div>
        {children}
      </main>

      {/* Optional right drawer — 320px */}
      {right ? (
        <aside className="w-[320px] h-full min-h-0 shrink-0 overflow-hidden border-l border-rule bg-surface">
          {right}
        </aside>
      ) : null}
    </div>
  )
}

// CourseShell.tsx — ONE shared course template for every course-scoped page
// (student /course/* and teacher /teacher/*). Standard 240px dark-green
// (#26493F) left rail: SHSID school block, active course chip,
// 2025–26 · DP Year 1", role nav list (routes, active state board-tint),
// user chip at bottom. Optional tab bar (wired to routes) rendered under an
// optional page header. Optional 320px right drawer.
import { useEffect, useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router'
import {
  LayoutGrid,
  MessageSquare,
  NotebookTabs,
  BarChart3,
  BookOpen,
  ListChecks,
  Bell,
  UserRound,
  Target,
  FolderOpen,
  ShieldCheck,
  FileText,
  FileStack,
  Presentation,
  CirclePlus,
  ScrollText,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react'
import { getActiveCourse } from '@/lib/course-selection'
import {
  getCurrentUser,
  getInstitution,
  getSettings,
  subscribeDatabase,
  touchSession,
  updateSettings,
} from '@/database/client'
import { unreadNotificationCount } from '@/database/notifications'

export interface CourseNavItem {
  key: string
  label: string
  to: string
  icon: ReactNode
}

export interface CourseTab {
  label: string
  to: string
}

const STUDENT_NAV: CourseNavItem[] = [
  { key: 'courses', label: 'Courses', to: '/courses', icon: <LayoutGrid size={16} /> },
  { key: 'chat', label: 'Chat', to: '/course/chat', icon: <MessageSquare size={16} /> },
  { key: 'notes', label: 'Notes', to: '/course/notes', icon: <NotebookTabs size={16} /> },
  { key: 'know', label: 'What you know', to: '/course/know', icon: <BarChart3 size={16} /> },
  { key: 'questions', label: 'Question Base', to: '/course/questions', icon: <BookOpen size={16} /> },
  { key: 'mock-tests', label: 'Mock Tests', to: '/course/mock-tests', icon: <FileStack size={16} /> },
  { key: 'plan', label: 'Study plan', to: '/course/plan', icon: <ListChecks size={16} /> },
  { key: 'notifications', label: 'Notifications', to: '/notifications', icon: <Bell size={16} /> },
  { key: 'profile', label: 'Profile', to: '/profile', icon: <UserRound size={16} /> },
]

const TEACHER_NAV: CourseNavItem[] = [
  { key: 'insights', label: 'Insights', to: '/teacher/class-picture', icon: <BarChart3 size={16} /> },
  { key: 'objectives', label: 'Objectives', to: '/teacher/objectives', icon: <Target size={16} /> },
  { key: 'library', label: 'Library', to: '/teacher/library', icon: <FolderOpen size={16} /> },
  { key: 'review', label: 'Item review', to: '/teacher/review', icon: <ShieldCheck size={16} /> },
  { key: 'paper-builder', label: 'Paper builder', to: '/teacher/paper-builder', icon: <FileText size={16} /> },
  { key: 'deck', label: 'Deck', to: '/teacher/deck', icon: <Presentation size={16} /> },
  { key: 'create-course', label: 'Create course', to: '/teacher/create-course', icon: <CirclePlus size={16} /> },
  { key: 'policies', label: 'Policies', to: '/teacher/policies', icon: <ScrollText size={16} /> },
]

export function courseNav(role: 'student' | 'teacher'): CourseNavItem[] {
  return role === 'student' ? STUDENT_NAV : TEACHER_NAV
}

export default function CourseShell({
  role,
  active,
  tabs,
  activeTab,
  header,
  right,
  children,
}: {
  role: 'student' | 'teacher'
  active?: string
  tabs?: CourseTab[]
  activeTab?: string
  header?: ReactNode
  right?: ReactNode
  children: ReactNode
}) {
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState(() => getSettings().courseMenuCollapsed)
  const [activeCourse, setActiveCourseState] = useState(getActiveCourse)
  const [unread, setUnread] = useState(unreadNotificationCount)
  const nav = courseNav(role)
  // The signed-in account, not the seeded demo one. This block used to read
  // `currentStudent` from data/mock.ts, a module constant pinned to the seeded
  // student — so every account, including one that had just registered, saw
  // "Yun Lin" in the rail. Identity comes from getCurrentUser() and nowhere
  // else.
  const account = getCurrentUser()
  const institution = getInstitution()
  const user = {
    name: account?.displayName || account?.name || 'Signed in',
    // Derived from the account, not from the `role` nav prop: the two can
    // legitimately differ (an administrator browsing a teacher page), and the
    // caption under someone's name should say who they are rather than which
    // nav list happens to be on screen.
    sub: account?.role === 'Student' ? 'View profile' : (account?.role ?? 'View profile'),
    initials: account?.initials || '··',
    to: '/profile',
  }

  function toggleMenu() {
    setCollapsed((current) => {
      const next = !current
      updateSettings({ courseMenuCollapsed: next })
      return next
    })
  }

  useEffect(() => {
    const refreshActiveCourse = () => {
      setActiveCourseState(getActiveCourse())
      setUnread(unreadNotificationCount())
    }
    window.addEventListener('synonance:active-course-changed', refreshActiveCourse)
    const unsubscribe = subscribeDatabase(refreshActiveCourse)
    return () => {
      window.removeEventListener('synonance:active-course-changed', refreshActiveCourse)
      unsubscribe()
    }
  }, [])

  // Keep the sliding idle deadline ahead of a user who is actually working.
  // `touchSession` rate-limits itself to one write every few minutes, so these
  // listeners are cheap despite firing constantly; the alternative — deciding
  // here how often to call it — would put the policy in the wrong place.
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

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-paper text-ink">
      {/* Left rail — 240px, deep chalkboard green */}
      <aside
        className={`${collapsed ? 'w-[72px]' : 'w-[240px]'} h-full min-h-0 shrink-0 flex flex-col bg-board-deep text-paper transition-[width] duration-200 ease-out`}
      >
        {/* Institution crest block */}
        <div
          className={
            collapsed
              ? 'flex flex-col items-center gap-3 px-2 pt-5 pb-4 border-b border-white/15'
              : 'flex items-start gap-3 px-5 pt-6 pb-5 border-b border-white/15'
          }
        >
          {!collapsed ? (
            <div className="min-w-0 flex-1">
              <div className="text-[14px] font-medium leading-tight">{institution.short}</div>
              <div className="text-[12px] leading-snug text-paper/70">{institution.name}</div>
            </div>
          ) : null}
          <button
            type="button"
            onClick={toggleMenu}
            aria-label={collapsed ? 'Expand main menu' : 'Collapse main menu'}
            aria-expanded={!collapsed}
            title={collapsed ? 'Expand menu' : 'Collapse menu'}
            className="w-8 h-8 rounded-control border border-white/15 text-paper/70 hover:text-paper hover:bg-white/10 flex items-center justify-center shrink-0 transition-colors duration-[120ms] ease-out"
          >
            {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
          </button>
        </div>

        {/* Course chip */}
        <div className={collapsed ? 'px-2 py-4 border-b border-white/15' : 'px-5 py-4 border-b border-white/15'}>
          {!collapsed ? (
            <div className="font-mono text-[12px] uppercase tracking-[0.08em] text-paper/60 mb-1">
              Course
            </div>
          ) : null}
          <button
            type="button"
            onClick={() => navigate('/courses')}
            aria-label={`Change course. Current course: ${activeCourse.code}`}
            title={collapsed ? `Change course · ${activeCourse.code}` : 'Change course'}
            className={`${collapsed ? 'flex justify-center' : 'flex items-center gap-2.5'} w-full rounded-control text-left hover:bg-white/10 transition-colors duration-[120ms] ease-out`}
          >
            <span
              className="w-7 h-7 rounded-control bg-board-tint text-board font-serif text-[14px] flex items-center justify-center shrink-0"
            >
              {activeCourse.symbol}
            </span>
            {!collapsed ? (
              <div className="min-w-0 flex-1">
                <div className="text-[14px] font-medium leading-tight truncate">{activeCourse.code}</div>
                <div className="text-[12px] text-paper/60 truncate">{activeCourse.context}</div>
              </div>
            ) : null}
            {!collapsed ? <ChevronRight size={14} className="text-paper/50 shrink-0" /> : null}
          </button>
        </div>

        {/* Nav list */}
        <nav className={collapsed ? 'flex-1 px-2 py-4 overflow-y-auto' : 'flex-1 px-3 py-4 overflow-y-auto'}>
          <ul className="flex flex-col gap-0.5">
            {nav.map((item) => {
              const isActive = item.key === active
              // Real unread count, not decoration — it comes from the same
              // store /notifications reads and empties as things are read.
              const badge = item.key === 'notifications' && unread > 0 ? unread : 0
              return (
                <li key={item.key}>
                  <Link
                    to={item.to}
                    aria-current={isActive ? 'page' : undefined}
                    aria-label={collapsed ? item.label : undefined}
                    title={collapsed ? item.label : undefined}
                    className={
                      isActive
                        ? `w-full flex items-center ${collapsed ? 'justify-center px-2' : 'gap-2.5 px-3'} py-2 rounded-control text-[14px] bg-board-tint text-board font-medium text-left`
                        : `w-full flex items-center ${collapsed ? 'justify-center px-2' : 'gap-2.5 px-3'} py-2 rounded-control text-[14px] text-paper/80 hover:bg-white/10 text-left transition-colors duration-[120ms] ease-out`
                    }
                  >
                    <span className="relative shrink-0">
                      {item.icon}
                      {badge > 0 && collapsed ? (
                        <span
                          aria-hidden="true"
                          className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-paper ring-2 ring-board-deep"
                        />
                      ) : null}
                    </span>
                    {!collapsed ? <span className="truncate">{item.label}</span> : null}
                    {badge > 0 && !collapsed ? (
                      <span
                        aria-label={`${badge} unread`}
                        className="ml-auto min-w-[20px] rounded-full bg-paper px-1.5 py-0.5 text-center font-mono text-[11px] leading-none text-board"
                      >
                        {badge}
                      </span>
                    ) : null}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>

        {/* User chip */}
        <button
          type="button"
          onClick={() => navigate(user.to)}
          aria-label={collapsed ? `Open profile for ${user.name}` : undefined}
          title={collapsed ? user.name : undefined}
          className={
            collapsed
              ? 'px-2 py-4 border-t border-white/15 flex items-center justify-center text-left hover:bg-white/5 transition-colors duration-[120ms] ease-out'
              : 'px-4 py-4 border-t border-white/15 flex items-center gap-2.5 text-left hover:bg-white/5 transition-colors duration-[120ms] ease-out'
          }
        >
          <span className="w-8 h-8 rounded-control bg-board-tint text-board font-mono text-[12px] flex items-center justify-center shrink-0">
            {user.initials}
          </span>
          {!collapsed ? (
            <>
              <div className="min-w-0 flex-1">
                <div className="text-[14px] leading-tight truncate">{user.name}</div>
                <div className="text-[12px] text-paper/60 leading-tight">{user.sub}</div>
              </div>
              <ChevronRight size={14} className="text-paper/60" />
            </>
          ) : null}
        </button>
      </aside>

      {/* Center slot — fluid */}
      <main className="flex-1 min-w-0 min-h-0 flex flex-col overflow-hidden">
        {header}
        {tabs ? (
          <nav className="flex items-center gap-6 border-b border-rule px-8">
            {tabs.map((t) => {
              const isActive = t.label === activeTab
              return (
                <Link
                  key={t.label}
                  to={t.to}
                  aria-current={isActive ? 'page' : undefined}
                  className={
                    isActive
                      ? 'py-2 text-[14px] font-medium text-ink border-b-2 border-board -mb-px transition-colors duration-[120ms] ease-out'
                      : 'py-2 text-[14px] text-ink-muted hover:text-ink border-b-2 border-transparent -mb-px transition-colors duration-[120ms] ease-out'
                  }
                >
                  {t.label}
                </Link>
              )
            })}
          </nav>
        ) : null}
        <div className="flex flex-1 min-h-0 flex-col overflow-y-auto">{children}</div>
      </main>

      {/* Optional right drawer — 320px */}
      {right ? (
        <aside className="w-[320px] h-full min-h-0 shrink-0 overflow-hidden border-l border-rule bg-surface">{right}</aside>
      ) : null}
    </div>
  )
}

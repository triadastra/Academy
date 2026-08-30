// App.tsx — route table for Synonance v2 (design.md §Routes).
//
// LAYOUT PATTERN: **children pattern** (react-dev.md pattern A).
// No <Outlet/> layout: pages own their visual shells. Authentication is a
// small per-route wrapper so refreshing a deep URL preserves the current page.
import { useEffect, useReducer, useState, type ReactNode } from 'react'
import { Navigate, Route, Routes } from 'react-router'
import {
  canAccessTeaching,
  getAuthSession,
  getSignedInHomeRoute,
  hasVerifiedInstitutionMembership,
  isAuthenticated,
  isCurrentUserAdministrator,
  isSessionValid,
  refreshLaunchpadAccess,
  signOutCurrentUser,
  subscribeDatabase,
} from '@/database/client'
import { currentLaunchpadUser } from '@/lib/launchpad-auth'
import Login from '@/pages/Login'
import SigninHelp from '@/pages/SigninHelp'
import Setup from '@/pages/Setup'
import Courses from '@/pages/Courses'
import Chat from '@/pages/Chat'
import ChatHistory from '@/pages/ChatHistory'
import ChatThread from '@/pages/ChatThread'
import Notes from '@/pages/Notes'
import Know from '@/pages/Know'
import QuestionBase from '@/pages/QuestionBase'
import MockTests from '@/pages/MockTests'
import StudyPlan from '@/pages/StudyPlan'
import Notifications from '@/pages/Notifications'
import Profile from '@/pages/Profile'
import ClassPicture from '@/pages/ClassPicture'
import Objectives from '@/pages/Objectives'
import Deck from '@/pages/Deck'
import Library from '@/pages/Library'
import Upload from '@/pages/Upload'
import TagReview from '@/pages/TagReview'
import ItemReview from '@/pages/ItemReview'
import PaperBuilder from '@/pages/PaperBuilder'
import PaperPreview from '@/pages/PaperPreview'
import CreateCourse from '@/pages/CreateCourse'
import Policies from '@/pages/Policies'
import Audit from '@/pages/Audit'
import Retention from '@/pages/Retention'
import Exports from '@/pages/Exports'
import Security from '@/pages/Security'
import People from '@/pages/People'
import Announcements from '@/pages/Announcements'
import StorageNotice from '@/components/StorageNotice'
import NotificationPush from '@/components/NotificationPush'

const LAUNCHPAD_RECHECK_MS = 10 * 60 * 1000

function SessionHome() {
  return <Navigate to={isAuthenticated() ? getSignedInHomeRoute() : '/login'} replace />
}

function LoginRoute() {
  return isAuthenticated() ? <Navigate to={getSignedInHomeRoute()} replace /> : <Login />
}

function RequireSession({ children }: { children: ReactNode }) {
  return isAuthenticated() ? <>{children}</> : <Navigate to="/login" replace />
}

function protectedPage(page: ReactNode) {
  return <RequireSession>{page}</RequireSession>
}

function RequireInstitution({ children }: { children: ReactNode }) {
  if (!isAuthenticated()) return <Navigate to="/login" replace />
  return hasVerifiedInstitutionMembership()
    ? <>{children}</>
    : <Navigate to={getSignedInHomeRoute()} replace />
}

function protectedInstitutionPage(page: ReactNode) {
  return <RequireInstitution>{page}</RequireInstitution>
}

/**
 * Role guard.
 *
 * A COMPONENT, and `allow` is a function — both deliberately. The guards were
 * first written as plain calls, `protectedAdminPage(<Audit />)`, which run
 * while the route table is being *built*: the answer was therefore fixed at
 * whatever `App` last rendered with. Navigation re-renders `Routes` but not
 * `App`, so signing in as an administrator and then opening /admin/audit was
 * still met with the redirect computed for the previous user, and a teacher
 * promoted mid-session could not reach the teacher area at all. Deferring the
 * predicate to a component moves the check to the moment the matched route
 * renders, which is the only moment it can be right.
 *
 * A signed-in user who lacks the role goes to their own home, not to /login:
 * they are not unauthenticated, and /login bounces an authenticated user
 * straight back, so sending them there would loop.
 */
function RequireRole({ allow, children }: { allow: () => boolean; children: ReactNode }) {
  if (!isAuthenticated()) return <Navigate to="/login" replace />
  return allow() ? <>{children}</> : <Navigate to={getSignedInHomeRoute()} replace />
}

/**
 * Teacher-only pages.
 *
 * These carry other students' work — the class picture, per-student response
 * review, the item bank, assessment construction and the institution's
 * academic-integrity policies — and were previously behind `protectedPage`,
 * which checks only that *somebody* is signed in. Any student could open the
 * whole teacher area by typing the URL.
 */
function protectedTeacherPage(page: ReactNode) {
  return <RequireRole allow={canAccessTeaching}>{page}</RequireRole>
}

function protectedAdminPage(page: ReactNode) {
  return <RequireRole allow={isCurrentUserAdministrator}>{page}</RequireRole>
}

export default function App() {
  // Re-render the route table whenever the database changes, so the guards
  // above re-run.
  //
  // Without this they are only consulted on navigation. An administrator could
  // suspend an account, or take away a teacher's role, and that person would
  // carry on reading the page they were already on — including another tab of
  // the same browser, which receives the change through the storage event —
  // until they happened to click something. Revocation that waits for the
  // revoked user's cooperation is not revocation.
  const [, revalidate] = useReducer((n: number) => n + 1, 0)
  useEffect(() => subscribeDatabase(revalidate), [])

  // A durable Synonance session is not enough to keep institution access.
  // Before rendering any route, re-resolve the short-lived Launchpad token
  // through userinfo and re-check verified + org + VID. A browser restart
  // clears the SDK token, so it also requires a fresh Launchpad sign-in.
  const [launchpadChecked, setLaunchpadChecked] = useState(() => {
    const session = getAuthSession()
    return session.identityProvider !== 'launchpad' || !isSessionValid(session)
  })
  useEffect(() => {
    if (launchpadChecked) return
    let live = true
    ;(async () => {
      const identity = await currentLaunchpadUser()
      const result = identity ? refreshLaunchpadAccess(identity) : null
      if (!result?.ok) signOutCurrentUser()
      if (live) setLaunchpadChecked(true)
    })()
    return () => {
      live = false
    }
  }, [launchpadChecked])

  useEffect(() => {
    if (!launchpadChecked || getAuthSession().identityProvider !== 'launchpad') return
    let checking = false
    const verify = async () => {
      if (checking) return
      checking = true
      try {
        const identity = await currentLaunchpadUser()
        const result = identity ? refreshLaunchpadAccess(identity) : null
        if (!result?.ok) signOutCurrentUser()
      } finally {
        checking = false
      }
    }
    const timer = window.setInterval(verify, LAUNCHPAD_RECHECK_MS)
    const onVisibility = () => {
      if (document.visibilityState === 'visible') void verify()
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [launchpadChecked])

  if (!launchpadChecked) {
    return (
      <div className="min-h-[100dvh] bg-paper flex items-center justify-center text-[13px] text-ink-muted">
        Verifying your Launchpad institution…
      </div>
    )
  }

  return (
    <>
      {/* Sits outside the route table: a failed save has to be visible
          wherever the user happens to be when it happens. */}
      <StorageNotice />
      {/* Same placement, same reason: a notification landing mid-session has
          to surface wherever the user happens to be. */}
      <NotificationPush />
      <Routes>
        <Route path="/" element={<SessionHome />} />

        {/* Access */}
        <Route path="/login" element={<LoginRoute />} />
        <Route path="/signin-help" element={<SigninHelp />} />
        <Route path="/setup" element={protectedInstitutionPage(<Setup />)} />

        {/* Student */}
        <Route path="/courses" element={protectedInstitutionPage(<Courses />)} />
        <Route path="/course/chat" element={protectedInstitutionPage(<Chat />)} />
        <Route path="/course/chat/history" element={protectedInstitutionPage(<ChatHistory />)} />
        <Route path="/course/chat/history/:threadId" element={protectedInstitutionPage(<ChatThread />)} />
        <Route path="/course/notes" element={protectedInstitutionPage(<Notes />)} />
        <Route path="/course/know" element={protectedInstitutionPage(<Know />)} />
        <Route path="/course/questions" element={protectedInstitutionPage(<QuestionBase />)} />
        <Route path="/course/mock-tests" element={protectedInstitutionPage(<MockTests />)} />
        <Route path="/course/review" element={protectedInstitutionPage(<Navigate to="/course/questions" replace />)} />
        <Route path="/course/plan" element={protectedInstitutionPage(<StudyPlan />)} />
        <Route path="/notifications" element={protectedInstitutionPage(<Notifications />)} />
        <Route path="/profile" element={protectedPage(<Profile />)} />

        {/* Teacher */}
        <Route path="/teacher/class-picture" element={protectedTeacherPage(<ClassPicture />)} />
        <Route path="/teacher/objectives" element={protectedTeacherPage(<Objectives />)} />
        <Route path="/teacher/deck" element={protectedTeacherPage(<Deck />)} />
        <Route path="/teacher/library" element={protectedTeacherPage(<Library />)} />
        <Route path="/teacher/upload" element={protectedTeacherPage(<Upload />)} />
        <Route path="/teacher/tag-review" element={protectedTeacherPage(<TagReview />)} />
        <Route path="/teacher/review" element={protectedTeacherPage(<ItemReview />)} />
        <Route path="/teacher/paper-builder" element={protectedTeacherPage(<PaperBuilder />)} />
        <Route path="/teacher/paper-preview" element={protectedTeacherPage(<PaperPreview />)} />
        <Route path="/teacher/create-course" element={protectedTeacherPage(<CreateCourse />)} />
        <Route path="/teacher/policies" element={protectedTeacherPage(<Policies />)} />

        {/* Admin */}
        <Route path="/admin" element={protectedAdminPage(<Navigate to="/admin/audit" replace />)} />
        <Route path="/admin/audit" element={protectedAdminPage(<Audit />)} />
        <Route path="/admin/people" element={protectedAdminPage(<People />)} />
        <Route path="/admin/notifications" element={protectedAdminPage(<Announcements />)} />
        <Route path="/admin/retention" element={protectedAdminPage(<Retention />)} />
        <Route path="/admin/exports" element={protectedAdminPage(<Exports />)} />
        <Route path="/admin/security" element={protectedAdminPage(<Security />)} />

        <Route path="*" element={<SessionHome />} />
      </Routes>
    </>
  )
}

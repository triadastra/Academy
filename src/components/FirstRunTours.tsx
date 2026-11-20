// FirstRunTours.tsx — the two tutorials every first-time user is walked through.
//
// 1. AccessGuide  — on /login, before anyone is signed in. Getting into
//    Synonance is the hard part: it needs a Launchpad account that has been
//    verified *on campus* as SHSID, and nothing on the sign-in card says so.
//    This is the same path the IDX "How to access Synonance" video walks
//    through, step by step. Shown once per browser.
// 2. AppTour      — the first time an account reaches a course page after
//    setup. Points at each item in the rail. Shown once per account.
//
// Both are forced (see ForcedTutorial): no skip, no close, finish to continue.
import { useEffect, useReducer } from 'react'
import { useLocation } from 'react-router'
import {
  BadgeCheck,
  Bell,
  BookOpen,
  FileStack,
  GraduationCap,
  LayoutGrid,
  LockKeyhole,
  MapPin,
  MessageSquare,
  NotebookTabs,
  Sparkles,
  UserPlus,
  UserRound,
  BarChart3,
  Target,
  FolderOpen,
  ShieldCheck,
  FileText,
  ScrollText,
  CirclePlus,
  FolderUp,
  TrendingUp,
} from 'lucide-react'
import ForcedTutorial, { type TutorialStep } from '@/components/ForcedTutorial'
import {
  completeAppTour,
  getCurrentUserRole,
  isAuthenticated,
  isPersonalAccount,
  markAccessGuideSeen,
  needsAppTour,
  subscribeDatabase,
} from '@/database/client'

const LAUNCHPAD_URL = 'https://launchpad.standardcas.org'

const ACCESS_STEPS: TutorialStep[] = [
  {
    eyebrow: 'Welcome',
    title: 'Welcome to Synonance',
    icon: <Sparkles size={20} />,
    body: (
      <>
        <p>
          Synonance is SHSID's study companion: chat with <strong>Syno</strong> about your own
          courses, read the course notes, practise from the question base and sit mock tests.
        </p>
        <p>
          Before your first sign-in there is a short setup. This guide shows you every step — it
          takes about five minutes, and part of it has to be done <strong>at school</strong>.
        </p>
      </>
    ),
  },
  {
    eyebrow: 'How sign-in works',
    title: 'You sign in with Launchpad',
    icon: <LockKeyhole size={20} />,
    body: (
      <>
        <p>
          Synonance has no password of its own. <strong>Sign in with Launchpad</strong> and{' '}
          <strong>Create an account</strong> do exactly the same thing: both send you to Launchpad,
          the StandardCAS platform that confirms you are an SHSID student.
        </p>
        <p>
          That check is what keeps Synonance exclusive to SHSID students and faculty.
        </p>
      </>
    ),
  },
  {
    eyebrow: 'Step 1 · Launchpad account',
    title: 'Create your Launchpad account',
    icon: <UserPlus size={20} />,
    body: (
      <>
        <p>
          If you already have a Launchpad account, skip ahead. Otherwise, open{' '}
          <a href={`${LAUNCHPAD_URL}/?signup=1`} target="_blank" rel="noreferrer">
            launchpad.standardcas.org
          </a>{' '}
          (or press <strong>Create an account</strong> here) and:
        </p>
        <ol>
          <li>Press <strong>Get started</strong> and choose <strong>Student</strong>.</li>
          <li>Enter your age, name and a username.</li>
          <li>
            Use an <strong>email address you can open</strong> — a verification code is sent there.
          </li>
          <li>Press <strong>Create account</strong>, then sign in.</li>
        </ol>
      </>
    ),
  },
  {
    eyebrow: 'Step 2 · Verify at school',
    title: 'Verify that you are at SHSID',
    icon: <MapPin size={20} />,
    body: (
      <>
        <p>
          <strong>Bring your device to school for this step.</strong> In Launchpad, open{' '}
          <strong>Settings → Organization verification</strong> and press{' '}
          <strong>Verify account</strong>. Then:
        </p>
        <ol>
          <li>
            <strong>Email code</strong> — type in the code Launchpad emails you. Check your junk
            folder if it does not arrive.
          </li>
          <li>
            <strong>Location</strong> — press <strong>Check my location</strong> and allow the
            browser to use your location while you are on campus.
          </li>
          <li>
            <strong>Campus code</strong> — enter your school ID, then the campus code shown at
            school.
          </li>
          <li>
            <strong>Passkey</strong> — press <strong>Create passkey</strong> and let your device
            finish it.
          </li>
        </ol>
      </>
    ),
  },
  {
    eyebrow: 'Step 3 · Come back',
    title: 'Sign in and build your course space',
    icon: <BadgeCheck size={20} />,
    body: (
      <>
        <p>
          Once Launchpad shows <strong>Verified</strong>, come back here and press{' '}
          <strong>Sign in with Launchpad</strong>, then approve access.
        </p>
        <p>
          The first time in, you pick your <strong>grade</strong>, your pathway (IB, AP, A Levels)
          and your <strong>courses</strong>. After that you can use Synonance from home or any
          device with the same account — verification only has to happen on campus once.
        </p>
      </>
    ),
  },
]

export function AccessGuide({ onDone }: { onDone: () => void }) {
  return (
    <ForcedTutorial
      label="How to get into Synonance"
      steps={ACCESS_STEPS}
      finishLabel="I'm ready to sign in"
      onFinish={() => {
        markAccessGuideSeen('done')
        onDone()
      }}
      onSkip={() => {
        markAccessGuideSeen('skipped')
        onDone()
      }}
    />
  )
}

const STUDENT_TOUR: TutorialStep[] = [
  {
    eyebrow: "You're in",
    title: 'A quick tour of Synonance',
    icon: <GraduationCap size={20} />,
    body: (
      <p>
        Your course space is ready. Here is where everything lives — it takes under a minute.
      </p>
    ),
  },
  {
    title: 'Courses',
    target: 'courses',
    icon: <LayoutGrid size={20} />,
    body: (
      <p>
        Every course you picked, with its teacher and current unit. Open a course to make it the
        active one — Chat, Notes, Question Base and Mock Tests all follow the active course.
      </p>
    ),
  },
  {
    title: 'Chat with Syno',
    target: 'chat',
    icon: <MessageSquare size={20} />,
    body: (
      <p>
        Ask Syno anything about the active course. Its answers are grounded in your course's own
        notes and cite where they came from. Past conversations are kept in your history.
      </p>
    ),
  },
  {
    title: 'Notes',
    target: 'notes',
    icon: <NotebookTabs size={20} />,
    body: (
      <p>
        The course notes and review guides, unit by unit. Select any passage to ask Syno about it.
      </p>
    ),
  },
  {
    title: 'Question Base',
    target: 'questions',
    icon: <BookOpen size={20} />,
    body: (
      <p>Practice questions for the course. Answer, check, and see what you need to revisit.</p>
    ),
  },
  {
    title: 'Mock Tests',
    target: 'mock-tests',
    icon: <FileStack size={20} />,
    body: <p>Full practice papers in exam conditions, marked when you hand them in.</p>,
  },
  {
    title: 'Performance',
    target: 'performance',
    icon: <TrendingUp size={20} />,
    body: (
      <p>
        Your grade book: grades, GPA, what you need on what is left, and how fast each subject fades
        if you stop practising. Syno can rate what you are good at from your chats.
      </p>
    ),
  },
  {
    title: 'Notifications',
    target: 'notifications',
    icon: <Bell size={20} />,
    body: <p>Announcements from your school and teachers land here.</p>,
  },
  {
    title: 'Profile',
    target: 'profile',
    icon: <UserRound size={20} />,
    body: (
      <p>
        Change your grade and courses, language and preferences, export your data — and replay this
        tour any time.
      </p>
    ),
  },
]

const PERSONAL_TOUR: TutorialStep[] = [
  {
    eyebrow: "You're in",
    title: 'Your personal workspace',
    icon: <GraduationCap size={20} />,
    body: (
      <p>
        Everything here is yours alone: courses you create, files you drop in and the notes Syno
        writes from them. Nothing is shared with a school.
      </p>
    ),
  },
  {
    title: 'My courses',
    target: 'courses',
    icon: <LayoutGrid size={20} />,
    body: <p>Create a course for anything you are learning, and switch between them here.</p>,
  },
  {
    title: 'Sources',
    target: 'sources',
    icon: <FolderUp size={20} />,
    body: (
      <p>
        Drop in PDFs, slides exported to PDF, or your own notes. Syno reads them and writes
        structured study notes for the course.
      </p>
    ),
  },
  {
    title: 'Notes and Chat',
    target: 'notes',
    icon: <NotebookTabs size={20} />,
    body: <p>Read your notes, and ask Syno about them in Chat — answers cite your own material.</p>,
  },
  {
    title: 'Performance',
    target: 'performance',
    icon: <TrendingUp size={20} />,
    body: (
      <p>
        Log scores and study time to see your GPA, projected grades and a forgetting curve per
        course. Syno updates your fluency per topic as you chat.
      </p>
    ),
  },
]

const TEACHER_TOUR: TutorialStep[] = [
  {
    eyebrow: 'Welcome',
    title: 'A quick tour for teachers',
    icon: <GraduationCap size={20} />,
    body: <p>Here is where the teaching tools live — it takes under a minute.</p>,
  },
  {
    title: 'Insights',
    target: 'insights',
    icon: <BarChart3 size={20} />,
    body: <p>The class picture: how your students are doing, objective by objective.</p>,
  },
  {
    title: 'Objectives',
    target: 'objectives',
    icon: <Target size={20} />,
    body: <p>The learning objectives your course is built on, and how material maps to them.</p>,
  },
  {
    title: 'Library',
    target: 'library',
    icon: <FolderOpen size={20} />,
    body: <p>Your course material. Upload notes here — Syno grounds its answers in them.</p>,
  },
  {
    title: 'Item review',
    target: 'review',
    icon: <ShieldCheck size={20} />,
    body: <p>Questions Syno drafted wait here; nothing reaches students until you accept it.</p>,
  },
  {
    title: 'Paper builder & Deck',
    target: 'paper-builder',
    icon: <FileText size={20} />,
    body: <p>Assemble assessments from the item bank, and build slide decks from your notes.</p>,
  },
  {
    title: 'Create course',
    target: 'create-course',
    icon: <CirclePlus size={20} />,
    body: <p>Set up a new course for your students.</p>,
  },
  {
    title: 'Policies',
    target: 'policies',
    icon: <ScrollText size={20} />,
    body: <p>Your academic-integrity policies. You can replay this tour from your profile.</p>,
  },
]

/** Pages that render the course rail the tour points at. Setup has no rail. */
function isTourablePath(pathname: string) {
  return (
    pathname === '/courses' ||
    pathname.startsWith('/course/') ||
    pathname.startsWith('/teacher/') ||
    pathname === '/notifications' ||
    pathname === '/profile'
  )
}

export function AppTour() {
  const { pathname } = useLocation()
  const [, rerender] = useReducer((n: number) => n + 1, 0)
  useEffect(() => subscribeDatabase(rerender), [])

  if (!isAuthenticated() || !isTourablePath(pathname) || !needsAppTour()) return null
  const role = getCurrentUserRole()
  // Administrators use the local escape-hatch console, which has no rail.
  if (role !== 'Student' && role !== 'Teacher') return null
  const teacher = role === 'Teacher'

  return (
    <ForcedTutorial
      // Remount per role, so a role change mid-tour starts the right steps.
      key={`${role}:${isPersonalAccount() ? 'personal' : 'school'}`}
      label="Synonance tour"
      steps={teacher ? TEACHER_TOUR : isPersonalAccount() ? PERSONAL_TOUR : STUDENT_TOUR}
      finishLabel={teacher ? 'Start teaching' : 'Start learning'}
      onFinish={() => completeAppTour('done')}
      onSkip={() => completeAppTour('skipped')}
    />
  )
}

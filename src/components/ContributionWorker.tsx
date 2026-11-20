import { useEffect } from 'react'
import {
  subscribeDatabase,
  isAuthenticated,
  isPersonalAccount,
  getCurrentUserId,
} from '@/database/client'
import {
  clearContributionCache,
  syncContributions,
} from '@/database/contributions'
import { getActiveCourse } from '@/lib/course-selection'
import { getCourseLevel } from '@/database/notes-tools'
/** The server owns indexing. This only refreshes shared course snapshots. */
export default function ContributionWorker() {
  useEffect(() => {
    let user = '',
      session = ''
    const tick = (force = false) => {
      // Personal accounts never talk to the school's shared notes service.
      const nextUser = isAuthenticated() && !isPersonalAccount() ? getCurrentUserId() : ''
      if (user !== nextUser) {
        user = nextUser
        session = ''
        clearContributionCache()
      }
      if (!user) return
      const course = getActiveCourse().id,
        nextSession = `${course}::${getCourseLevel(course) ?? ''}`
      if (force || session !== nextSession) {
        session = nextSession
        void syncContributions(course)
      }
    }
    const unsubscribe = subscribeDatabase(() => tick())
    const interval = window.setInterval(() => tick(true), 4000)
    tick()
    return () => {
      unsubscribe()
      window.clearInterval(interval)
    }
  }, [])
  return null
}

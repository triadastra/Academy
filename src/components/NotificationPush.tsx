// NotificationPush.tsx — the in-app push. Mounted once, outside the route
// table, so a notification landing while the user is anywhere in the product
// surfaces as a card in the top-right corner: same tab (the send dispatches
// the database event) and other tabs (the storage event) alike.
//
// In-app rather than the browser Notification API on purpose: the deployed
// site is served over plain http, where that API is unavailable, and a push
// that only works on localhost is a demo. Cards show only what arrived after
// this page loaded — mail that predates the visit belongs to /notifications,
// not to a corner of the screen.
import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { Bell, Mail, Megaphone, X } from 'lucide-react'
import { subscribeDatabase } from '@/database/client'
import {
  listNotificationsForCurrentUser,
  type DeliveredNotification,
} from '@/database/notifications'

/** How long a card stands before it withdraws on its own. */
const PUSH_MS = 8_000

export default function NotificationPush() {
  const [cards, setCards] = useState<DeliveredNotification[]>([])
  // Rows created before this moment never toast; they are already mail.
  const watermark = useRef(new Date().toISOString())
  const timers = useRef(new Map<string, number>())
  const navigate = useNavigate()
  const location = useLocation()
  const onFeed = location.pathname === '/notifications'
  const onFeedRef = useRef(onFeed)
  useEffect(() => {
    onFeedRef.current = onFeed
  }, [onFeed])

  useEffect(() => {
    const dismissLater = (id: string) => {
      const timer = window.setTimeout(() => {
        setCards((current) => current.filter((card) => card.id !== id))
        timers.current.delete(id)
      }, PUSH_MS)
      timers.current.set(id, timer)
    }

    const check = () => {
      const fresh = listNotificationsForCurrentUser().filter(
        (row) => row.unread && row.createdAt > watermark.current,
      )
      if (fresh.length === 0) return
      for (const row of fresh) {
        if (row.createdAt > watermark.current) watermark.current = row.createdAt
      }
      // The feed page shows the arrival itself; a card on top would be noise.
      if (onFeedRef.current) return
      setCards((current) => [...fresh, ...current].slice(0, 4))
      for (const row of fresh) dismissLater(row.id)
    }

    const unsubscribe = subscribeDatabase(check)
    const pending = timers.current
    return () => {
      unsubscribe()
      for (const timer of pending.values()) window.clearTimeout(timer)
      pending.clear()
    }
  }, [])

  const dismiss = (id: string) => {
    window.clearTimeout(timers.current.get(id))
    timers.current.delete(id)
    setCards((current) => current.filter((card) => card.id !== id))
  }

  const open = (id: string) => {
    dismiss(id)
    navigate('/notifications')
  }

  if (cards.length === 0) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed top-14 right-4 z-[90] flex w-[340px] max-w-[calc(100vw-2rem)] flex-col gap-2"
    >
      {cards.map((card) => {
        const Icon = card.kind === 'broadcast' ? Megaphone : card.kind === 'direct' ? Mail : Bell
        return (
          <div
            key={card.id}
            className="flex items-start gap-3 rounded-card border border-rule bg-surface px-4 py-3 shadow-lg"
          >
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-card border border-rule bg-paper text-board">
              <Icon size={15} />
            </span>
            <button
              type="button"
              onClick={() => open(card.id)}
              className="min-w-0 flex-1 text-left"
            >
              <span className="block truncate text-[13px] font-medium text-ink">{card.title}</span>
              <span className="mt-0.5 line-clamp-2 block text-[12px] leading-snug text-ink-muted">
                {card.body}
              </span>
              <span className="mt-1 block text-[11px] text-ink-muted">
                {card.senderName} · open notifications
              </span>
            </button>
            <button
              type="button"
              aria-label="Dismiss notification"
              onClick={() => dismiss(card.id)}
              className="shrink-0 text-ink-muted transition-opacity duration-[120ms] ease-out hover:opacity-70"
            >
              <X size={14} />
            </button>
          </div>
        )
      })}
    </div>
  )
}

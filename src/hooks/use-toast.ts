// use-toast.ts — the state behind <Toast> and <PageNotice> (components/Page).
//
// Pages used to hand-roll this pair and drifted apart: Audit dismissed after
// 2400ms and People after 2600ms, People's failure path cleared the toast
// while Audit's left a stale one standing behind a fresh error, and neither
// cancelled its timer on unmount. One implementation, one dismiss delay.
import { useCallback, useEffect, useRef, useState } from 'react'

const TOAST_MS = 2500

export function useToast() {
  const [toast, setToast] = useState<string | null>(null)
  const [notice, setNotice] = useState('')
  const timer = useRef<number | undefined>(undefined)

  useEffect(() => () => window.clearTimeout(timer.current), [])

  /** It worked. Raises the toast and clears any standing refusal. */
  const show = useCallback((message: string) => {
    setNotice('')
    setToast(message)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setToast(null), TOAST_MS)
  }, [])

  /** It was refused. The reason stays on screen; the toast goes. */
  const fail = useCallback((message: string) => {
    window.clearTimeout(timer.current)
    setToast(null)
    setNotice(message)
  }, [])

  return { toast, notice, show, fail }
}

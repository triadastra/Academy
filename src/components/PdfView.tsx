// PdfView.tsx — a paper preview this app paints itself.
//
// `<iframe src="paper.pdf">` hands the file to whatever PDF plugin the browser
// happens to own, and in production there is nothing to hand it to: Launchpad's
// nginx has no .pdf in its MIME table, so it answers
// `Content-Type: application/octet-stream` with `X-Content-Type-Options:
// nosniff`, and the browser can only file that away in Downloads. A student
// opening Mock Tests got a download, not a preview. pdf.js rasterises the pages
// onto canvases we control, which depends on no plugin and no header, so the
// paper always appears in the panel and the file leaves the app only when the
// student clicks Export.
import { useEffect, useRef, useState } from 'react'
import { LoaderCircle } from 'lucide-react'
// pdf.js parses in a worker, and `?worker` — not `?url` — is what we want here:
// it makes Vite emit the worker as a `.js` chunk we instantiate ourselves. The
// `?url` form would ship it as `.mjs`, an extension missing from the deploy
// host's MIME table (see the .pdf note above), so `nosniff` would refuse to run
// it and every page would parse on the main thread instead.
import PdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?worker'
import { cn } from '@/lib/utils'

/** Rounded, so a few pixels of layout drift don't trigger a full re-raster. */
function measure(element: HTMLElement) {
  return Math.max(320, Math.round(element.clientWidth / 32) * 32)
}

export default function PdfView({
  src,
  label,
  className,
}: {
  src: string
  /** Named in the failure notice, so a student knows which paper didn't open. */
  label: string
  className?: string
}) {
  const frame = useRef<HTMLDivElement | null>(null)
  const sheet = useRef<HTMLDivElement | null>(null)
  const [width, setWidth] = useState(0)
  const [status, setStatus] = useState<'loading' | 'ready' | 'failed'>('loading')

  useEffect(() => {
    const element = frame.current
    if (!element) return
    setWidth(measure(element))
    const observer = new ResizeObserver(() => setWidth(measure(element)))
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    // Wait for the first measurement: rastering at a guessed width and again at
    // the real one doubles the work on every paper the student opens.
    if (!width) return
    let cancelled = false
    setStatus('loading')

    void (async () => {
      // Set at each step to whatever now needs tearing down, so an abandoned
      // paper — a cancelled effect, a file that won't parse — never leaves a
      // worker thread running behind the panel.
      let close: (() => void) | null = null

      try {
        // Deferred so pdf.js — a megabyte of parser — stays out of the entry
        // bundle for the students who never open a paper.
        const pdfjs = await import('pdfjs-dist')
        // A worker per document, never a shared one: destroying a loading task
        // always terminates the worker it was handed, so a shared port would be
        // dead by the second paper.
        const worker = pdfjs.PDFWorker.create({ port: new PdfWorker() })
        close = () => worker.destroy()

        const document_ = await pdfjs.getDocument({ url: src, worker }).promise
        close = () => void document_.destroy() // takes the worker with it
        if (cancelled) return

        const host = sheet.current
        if (!host) return
        host.replaceChildren()

        // Retina sharpness, capped: a 3-page paper at an uncapped ratio on a
        // wide panel is ~100MB of bitmap for detail nobody can see.
        const density = Math.min(window.devicePixelRatio || 1, 2)
        const pixels = Math.min(width * density, 1600)

        for (let number = 1; number <= document_.numPages; number += 1) {
          const page = await document_.getPage(number)
          if (cancelled) break
          const viewport = page.getViewport({ scale: pixels / page.getViewport({ scale: 1 }).width })
          const canvas = window.document.createElement('canvas')
          canvas.width = Math.round(viewport.width)
          canvas.height = Math.round(viewport.height)
          // The canvas carries the paper's own pixel size; CSS fits it to the
          // panel so the pages stay legible at any width.
          canvas.className = 'block h-auto w-full rounded-card border border-rule bg-white shadow-sm'
          canvas.setAttribute('role', 'img')
          canvas.setAttribute('aria-label', `${label} — page ${number} of ${document_.numPages}`)
          host.append(canvas)
          await page.render({ canvas, viewport }).promise
        }

        if (!cancelled) setStatus('ready')
      } catch {
        if (!cancelled) setStatus('failed')
      } finally {
        close?.()
      }
    })()

    return () => {
      cancelled = true
    }
  }, [src, width, label])

  return (
    <div ref={frame} className={cn('overflow-y-auto overflow-x-hidden', className)}>
      <div ref={sheet} className="flex flex-col gap-4" aria-busy={status === 'loading'} />
      {status === 'loading' ? (
        <div className="flex items-center justify-center gap-2 py-16 text-[12px] text-ink-muted">
          <LoaderCircle size={15} className="animate-spin" /> Opening the paper…
        </div>
      ) : null}
      {status === 'failed' ? (
        <div className="flex flex-col items-center justify-center gap-1 py-16 text-center">
          <p className="text-[13px] font-medium text-ink">{label} didn't open</p>
          <p className="text-[12px] text-ink-muted">Export PDF still gives you the file.</p>
        </div>
      ) : null}
    </div>
  )
}

// SectionTag.tsx — small mono eyebrow label with hairline, used at page
// bottoms/headers. Uppercase tiny mono is the only uppercase allowed.
export default function SectionTag({
  children,
  className,
}: {
  children: string
  className?: string
}) {
  return (
    <div className={`flex items-center gap-3 ${className ?? ''}`}>
      <span className="font-mono text-[12px] uppercase tracking-[0.08em] text-ink-muted">
        {children}
      </span>
      <span className="h-px flex-1 bg-rule" aria-hidden="true" />
    </div>
  )
}

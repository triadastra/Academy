// Tex.tsx — small KaTeX wrapper for math rendering.
// <Tex>x^2 \sin x</Tex> inline; <Tex display>...</Tex> display mode.
// katex CSS is imported once here so any consumer gets styled output.
import { useMemo } from 'react'
import katex from 'katex'
import 'katex/dist/katex.min.css'

export default function Tex({
  children,
  display = false,
  className,
}: {
  children: string
  display?: boolean
  className?: string
}) {
  const html = useMemo(
    () =>
      katex.renderToString(children, {
        displayMode: display,
        throwOnError: false,
        output: 'html',
      }),
    [children, display],
  )
  return (
    <span
      className={className}
      // KaTeX output is generated locally from trusted content strings.
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}

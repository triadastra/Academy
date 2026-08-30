// A render-time throw anywhere below used to unmount the whole root and leave
// a white page (that is how the crypto.randomUUID secure-context bug read as
// "the page is dead"). This turns the next one into a visible message.
import { Component, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 px-8 text-center">
        <h1 className="font-serif text-[24px] text-ink">Something went wrong</h1>
        <p className="text-[14px] text-ink-muted max-w-[480px]">
          The page hit an unexpected error. Reloading usually clears it; if it
          keeps happening, this is the message to report:
        </p>
        <code className="font-mono text-[12px] text-ink-muted break-all max-w-[560px]">
          {this.state.error.message}
        </code>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-2 px-4 py-1.5 rounded-[6px] border border-rule text-[14px] text-ink hover:bg-surface transition-colors duration-[120ms] ease-out"
        >
          Reload
        </button>
      </div>
    )
  }
}

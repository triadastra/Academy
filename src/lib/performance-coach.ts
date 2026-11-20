// performance-coach.ts — Syno's read of the grade book, via Moonshot.
//
// Goes through `chat()` in lib/llm.ts like every other model call, so it uses
// `/__lp_llm_proxy`: Launchpad's host-server in production, and the Moonshot
// dev bridge in vite.config.ts under `npm run dev` (MOONSHOT_API_KEY in .env).
// No key ever reaches the browser.
//
// The model is handed numbers the page already computed and told not to
// invent any. Its job is judgement — what matters most this week, and why —
// not arithmetic, which it is worse at than the page.
import { chat, GatewayError, GatewayUnavailable, type LlmMessage } from '@/lib/llm'

export interface CoachCourse {
  name: string
  currentPct: number | null
  projectedPct: number | null
  targetPct: number
  neededOnRemainingPct: number | null
  remainingWeightPct: number
  knowledgeNow: number | null
  knowledgeIn30DaysIfPlan: number | null
  knowledgeIn30DaysIfStop: number | null
  daysSinceLastReview: number | null
  recentMinutesPerWeek: number
  plannedMinutesPerWeek: number
  upcoming: Array<{ title: string; date: string; weightPct: number }>
  recentScores: Array<{ title: string; date: string; pct: number }>
}

export interface CoachInput {
  today: string
  gpa: { weighted: number | null; unweighted: number | null; projectedWeighted: number | null }
  courses: CoachCourse[]
}

const SYSTEM = `You are Syno, a frank, warm academic coach inside a student's study app.
You receive a JSON snapshot of their grade book. The numbers were computed by the app:
- *Pct values are percentages of the course grade.
- knowledge* is a 0–100 index from a spaced-repetition forgetting model: it rises with study and results and decays without practice.
- neededOnRemainingPct is the average score they need on every remaining graded item to reach their target; above 100 means the target is out of reach.

Write in Markdown, under 350 words, with exactly these sections:
## Where you stand
Two or three sentences on GPA and the overall picture.
## Priorities
A short bulleted list, most urgent first. Name the course, the reason (a number from the data), and the action.
## Next 7 days
A day-by-day plan with minutes per course, sized to what they actually study now (recentMinutesPerWeek) plus a realistic stretch.
## Watch out for
One or two courses at risk of forgetting or of missing target, if any.

Never invent scores, dates or assessments that are not in the data. If data is thin, say what to log next.`

export async function reviewPerformance(
  input: CoachInput,
  handlers: { onToken: (full: string) => void; onThinking?: () => void; signal?: AbortSignal },
): Promise<string> {
  const messages: LlmMessage[] = [
    { role: 'system', content: SYSTEM },
    { role: 'user', content: `Here is my grade book as of ${input.today}:\n\n${JSON.stringify(input, null, 1)}` },
  ]
  return chat({
    messages,
    maxTokens: 4000,
    signal: handlers.signal,
    onToken: (_delta, full) => handlers.onToken(full),
    onReasoning: () => handlers.onThinking?.(),
  })
}

/** A sentence the page can show for any failure from `reviewPerformance`. */
export function coachErrorMessage(error: unknown) {
  if (error instanceof GatewayUnavailable)
    return 'Syno is not connected on this address. In local development, add MOONSHOT_API_KEY to .env and restart npm run dev.'
  if (error instanceof GatewayError)
    return error.status === 429
      ? `Syno is rate-limited right now. Try again${error.retryAfterSeconds ? ` in ${error.retryAfterSeconds}s` : ' shortly'}.`
      : `Syno could not answer (${error.status}). ${error.message}`
  return 'Syno could not finish the review. Try again.'
}

// marking.ts — how a typed answer is turned into correct/incorrect.
//
// A leaf module on purpose: it imports nothing from the database, so the same
// rules can be applied to a question that is already in the bank, to a draft
// the generator has just written, and to the validator that decides whether
// that draft is markable at all. `client.ts` delegates to it rather than
// keeping a second copy of the logic beside the stored rows.
//
// The original marker was `values.every(v => answer.includes(v))` over the raw
// strings. It read "16" as a correct answer to a question whose answer is "6",
// marked "0.667" wrong when the stored answer was "2/3", and treated a
// multiple-choice answer as prose — so typing the word "because" scored a
// question whose accepted value happened to be "b". Each mode below exists
// because one of those was a real way to be told you were right when you were
// not, or wrong when you were right.
import type { AnswerRule, IndexedQuestion } from '@/database/types'

/** Default relative tolerance for `numeric`, i.e. three significant figures. */
export const NUMERIC_TOLERANCE = 0.005

/** Strip whitespace and case — the comparison every string mode starts from. */
function tighten(value: string): string {
  return value.replace(/\s+/g, '').toLowerCase()
}

/**
 * Read a number out of a student's answer.
 *
 * Handles the three shapes an answer actually arrives in: a plain decimal, a
 * fraction (`2/3`, `-7/2`), and an answer written as an equation (`x = 4.5`),
 * which is how most students write a final line. Returns null when there is no
 * unambiguous number, and the caller falls back to a string comparison rather
 * than guessing.
 */
export function parseNumeric(value: string): number | null {
  const cleaned = tighten(value)
    // Only the last side of an equation is the answer.
    .split('=')
    .pop()!
    // Unicode minus and the various dashes students paste in.
    .replace(/[−–—]/g, '-')
    .replace(/[,$%°]/g, '')
  if (!cleaned) return null

  const fraction = /^(-?\d+(?:\.\d+)?)\/(-?\d+(?:\.\d+)?)$/.exec(cleaned)
  if (fraction) {
    const denominator = Number(fraction[2])
    if (!denominator) return null
    const result = Number(fraction[1]) / denominator
    return Number.isFinite(result) ? result : null
  }

  // A bare number, optionally in exponent form. Anything with other characters
  // attached is prose and belongs to a string mode.
  if (!/^-?\d*\.?\d+(?:e-?\d+)?$/.test(cleaned)) return null
  const result = Number(cleaned)
  return Number.isFinite(result) ? result : null
}

/** Whether two magnitudes agree closely enough to be the same answer. */
export function numericallyEqual(actual: number, expected: number, tolerance?: number): boolean {
  const tol = typeof tolerance === 'number' && tolerance >= 0 ? tolerance : NUMERIC_TOLERANCE
  // Relative for anything of a normal size, absolute near zero — a relative
  // tolerance around 0 can never be met, and an absolute one around 10^6 is
  // never missed.
  const scale = Math.max(1, Math.abs(expected))
  return Math.abs(actual - expected) <= tol * scale
}

/**
 * Whether this question can be marked automatically at all.
 *
 * An extended response with a rubric and no accept terms is NOT auto-checkable,
 * and saying so is the honest outcome: substring-matching an essay is marking
 * theatre. The UI teaches those instead of scoring them.
 */
export function isMarkable(question: Pick<IndexedQuestion, 'answerRule'>): boolean {
  return (question.answerRule?.values?.length ?? 0) > 0
}

/**
 * Mark one answer.
 *
 * Guards on an empty rule first: `[].every()` is true, so an empty rule would
 * otherwise mark ANY answer — including a blank one — as correct.
 */
export function markAnswer(question: Pick<IndexedQuestion, 'answerRule'>, answer: string): boolean {
  const rule: AnswerRule | undefined = question.answerRule
  if (!isMarkable(question)) return false
  const given = tighten(answer)
  if (!given) return false
  const values = rule!.values.map(tighten).filter(Boolean)
  if (values.length === 0) return false

  switch (rule!.mode) {
    case 'choice':
      // The option id, and nothing else. A choice is a click, not a sentence.
      return values.includes(given)
    case 'numeric': {
      const actual = parseNumeric(answer)
      if (actual === null) {
        // Not a number: fall back to an exact string match so a symbolic
        // answer ("2\\pi") to a numeric question is still markable.
        return values.includes(given)
      }
      return values.some((value) => {
        const expected = parseNumeric(value)
        return expected === null ? value === given : numericallyEqual(actual, expected, rule!.tolerance)
      })
    }
    case 'equalsAny':
      // `endsWith` keeps "x=6" correct for an expected "6" without letting
      // "16" through, which a bare `includes` would.
      return values.some((value) => given === value || given.endsWith(`=${value}`))
    case 'includesAll':
    default:
      return values.every((value) => given.includes(value))
  }
}

// insights.ts — the small-cohort disclosure rule, and the one place it lives.
//
// Two screens promised this protection and no code provided it. The teacher's
// Class picture footed its misconception table with "Patterns appear here once
// at least 5 students show them", and the administrator's audit page warned
// that "if erasure drops a cluster below 5 students, it disappears from teacher
// views". Neither was true: the table rendered whatever rows it was given, and
// nothing anywhere counted a cohort before showing it. The seeded rows all
// happened to sit above five, so the claim looked satisfied while being
// entirely unenforced — and an administrator would have repeated it to a
// regulator in good faith.
//
// The rule is now real, stated once, and applied wherever a cohort is shown.
// It is deliberately a *display* rule rather than a storage one: the underlying
// flags stay in the data, because suppressing a pattern is about not
// identifying the handful of students in it, not about forgetting it happened.

/**
 * Fewest students a pattern must cover before it may be shown.
 *
 * Five is the threshold both screens already advertised, so honouring it keeps
 * the promise the product had made rather than inventing a new one. Below it, a
 * "cluster" is a short list of named individuals wearing the language of
 * aggregate analysis — a teacher looking at a two-student pattern in a class
 * they teach has effectively been handed those two names.
 */
export const MIN_COHORT_SIZE = 5

/** Anything with a headcount can be suppressed; the shape is the caller's. */
export interface Cohort {
  /** Number of distinct students the pattern covers. */
  flags: number
}

/** The cohorts a teacher may see. */
export function visibleCohorts<T extends Cohort>(all: T[]): T[] {
  return all.filter((cohort) => cohort.flags >= MIN_COHORT_SIZE)
}

/** The cohorts held back, for the administrator's count — never for display. */
export function suppressedCohorts<T extends Cohort>(all: T[]): T[] {
  return all.filter((cohort) => cohort.flags < MIN_COHORT_SIZE)
}

/**
 * The footnote under a cohort table.
 *
 * Generated from the constant rather than typed into the page, so the sentence
 * and the behaviour cannot drift apart again — which is exactly how the
 * previous claim came to be false.
 */
export function cohortDisclosureNote(): string {
  return `Patterns appear here once at least ${MIN_COHORT_SIZE} students show them. Smaller groups are withheld, because naming a pattern in a class of two names the two students.`
}

/** What the administrator is shown about the rule, measured on real data. */
export interface CohortDisclosureReport {
  threshold: number
  total: number
  visible: number
  suppressed: number
}

export function cohortDisclosure<T extends Cohort>(all: T[]): CohortDisclosureReport {
  const suppressed = suppressedCohorts(all).length
  return {
    threshold: MIN_COHORT_SIZE,
    total: all.length,
    visible: all.length - suppressed,
    suppressed,
  }
}

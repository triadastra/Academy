import { describe, expect, it } from 'vitest'
import { markAnswer, numericallyEqual, parseNumeric, isMarkable } from './marking'

describe('parseNumeric', () => {
  it('reads plain numbers', () => {
    expect(parseNumeric('4.5')).toBe(4.5)
    expect(parseNumeric('-7')).toBe(-7)
  })

  it('reads fractions', () => {
    expect(parseNumeric('2/3')).toBeCloseTo(2 / 3)
    expect(parseNumeric('-7/2')).toBeCloseTo(-3.5)
  })

  it('reads the last side of an equation', () => {
    expect(parseNumeric('x = 4.5')).toBe(4.5)
  })

  it('returns null for prose and rejects division by zero', () => {
    expect(parseNumeric('about six')).toBeNull()
    expect(parseNumeric('1/0')).toBeNull()
    expect(parseNumeric('')).toBeNull()
  })
})

describe('numericallyEqual', () => {
  it('uses relative tolerance at normal magnitudes', () => {
    expect(numericallyEqual(100.4, 100)).toBe(true)
    expect(numericallyEqual(101, 100)).toBe(false)
  })

  it('uses absolute tolerance near zero', () => {
    expect(numericallyEqual(0.004, 0)).toBe(true)
  })
})

describe('markAnswer', () => {
  it('never marks with an empty rule — an empty rule would pass every answer', () => {
    expect(isMarkable({ answerRule: { mode: 'includesAll', values: [] } })).toBe(false)
    expect(markAnswer({ answerRule: { mode: 'includesAll', values: [] } }, 'anything')).toBe(false)
    expect(markAnswer({ answerRule: { mode: 'includesAll', values: [] } }, '')).toBe(false)
  })

  it('choice mode matches only the option id', () => {
    const rule = { mode: 'choice' as const, values: ['b'] }
    expect(markAnswer({ answerRule: rule }, 'B')).toBe(true)
    // The prose failure that started this module: the word happens to
    // contain the letter.
    expect(markAnswer({ answerRule: rule }, 'because')).toBe(false)
  })

  it('numeric mode accepts equivalent forms of the same number', () => {
    const rule = { mode: 'numeric' as const, values: ['2/3'] }
    expect(markAnswer({ answerRule: rule }, '0.667')).toBe(true)
    expect(markAnswer({ answerRule: rule }, 'x = 0.6667')).toBe(true)
    expect(markAnswer({ answerRule: rule }, '0.5')).toBe(false)
  })

  it('numeric mode falls back to exact match for symbolic answers', () => {
    const rule = { mode: 'numeric' as const, values: ['2\\pi'] }
    expect(markAnswer({ answerRule: rule }, '2\\pi')).toBe(true)
  })

  it('equalsAny does not let a prefix of digits through', () => {
    const rule = { mode: 'equalsAny' as const, values: ['6'] }
    expect(markAnswer({ answerRule: rule }, '6')).toBe(true)
    expect(markAnswer({ answerRule: rule }, 'x=6')).toBe(true)
    expect(markAnswer({ answerRule: rule }, '16')).toBe(false)
  })

  it('includesAll requires every fragment', () => {
    const rule = { mode: 'includesAll' as const, values: ['mitochondria', 'atp'] }
    expect(markAnswer({ answerRule: rule }, 'The mitochondria produces ATP')).toBe(true)
    expect(markAnswer({ answerRule: rule }, 'The mitochondria')).toBe(false)
  })
})

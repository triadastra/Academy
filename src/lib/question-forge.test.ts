import { describe, expect, it } from 'vitest'
import {
  parseModelJson,
  scanCompleteObjects,
  promptSimilarity,
  validateDraft,
} from './question-forge'
import type { CourseSession } from '@/database/question-bank'
import type { UnitNote } from '@/database/types'

const session: CourseSession = {
  courseId: 'course-1',
  courseCode: 'MATH 9',
  courseTitle: 'Mathematics 9',
  subject: 'Mathematics',
  level: null,
  key: 'course-1::*',
  label: 'MATH 9',
}

const note: UnitNote = {
  id: 'note-1',
  courseId: 'course-1',
  code: '2.1',
  title: 'Antiderivatives',
  summary: 'Reverse differentiation.',
  revision: 3,
  updated: 'today',
  sections: [],
}

const baseContext = {
  session,
  note,
  wanted: 'Standard' as const,
  index: 1,
  existingPrompts: [] as string[],
}

describe('parseModelJson', () => {
  it('parses a clean reply', () => {
    expect(parseModelJson('{"questions":[]}')).toEqual({ questions: [] })
  })

  it('strips code fences and surrounding prose', () => {
    expect(parseModelJson('Here you go:\n```json\n{"questions":[]}\n```')).toEqual({
      questions: [],
    })
  })

  it('repairs trailing commas', () => {
    expect(parseModelJson('{"questions":[{"prompt":"x",}]}')).toEqual({
      questions: [{ prompt: 'x' }],
    })
  })

  it('returns null when there is no object at all', () => {
    expect(parseModelJson('I cannot help with that.')).toBeNull()
  })
})

describe('scanCompleteObjects', () => {
  it('salvages finished questions from a truncated stream', () => {
    const buffer =
      '{"questions":[{"prompt":"one"},{"prompt":"two"},{"prompt":"three is cut off mid-sent'
    const { objects } = scanCompleteObjects(buffer, 0)
    expect(objects).toHaveLength(2)
    expect(JSON.parse(objects[0])).toEqual({ prompt: 'one' })
    expect(JSON.parse(objects[1])).toEqual({ prompt: 'two' })
  })

  it('resumes from the cursor instead of rescanning', () => {
    const first = '{"questions":[{"prompt":"one"}'
    const head = scanCompleteObjects(first, 0)
    expect(head.objects).toHaveLength(1)

    const grown = first + ',{"prompt":"two"}'
    const second = scanCompleteObjects(grown, head.next)
    expect(second.objects).toHaveLength(1)
    expect(JSON.parse(second.objects[0])).toEqual({ prompt: 'two' })
  })

  it('ignores braces inside strings', () => {
    const buffer = '{"questions":[{"prompt":"what does } mean in a set?"}'
    const { objects } = scanCompleteObjects(buffer, 0)
    expect(objects).toHaveLength(1)
  })
})

describe('promptSimilarity', () => {
  it('scores a restatement as a duplicate', () => {
    expect(
      promptSimilarity(
        'Find the antiderivative of 3x squared',
        'Find the antiderivative of 5x squared',
      ),
    ).toBeGreaterThan(0.7)
  })

  it('scores unrelated questions as distinct', () => {
    expect(
      promptSimilarity('Find the antiderivative of 3x squared', 'Explain photosynthesis'),
    ).toBeLessThan(0.7)
  })
})

describe('validateDraft', () => {
  const goodShort = {
    topic: 'Integration',
    prompt: 'Find the antiderivative of f(x) = 6x.',
    type: 'Short response',
    difficulty: 'Standard',
    marks: 4,
    answer: '3x^2 + C',
    accept: { mode: 'equalsAny', values: ['3x^2+c'] },
    steps: ['Apply the power rule to 6x.', 'Add the constant of integration.'],
  }

  it('accepts a well-formed short response', () => {
    const result = validateDraft(goodShort, baseContext)
    expect(result.ok).toBe(true)
    expect(result.question?.code).toBe('2.1-S01')
  })

  it('rejects a draft that refers to the source note', () => {
    const result = validateDraft(
      { ...goodShort, prompt: 'According to the note, what is the antiderivative of 6x?' },
      baseContext,
    )
    expect(result.ok).toBe(false)
    expect(result.reason).toMatch(/refers to the source/)
  })

  it('rejects a duplicate of an existing question', () => {
    const result = validateDraft(goodShort, {
      ...baseContext,
      existingPrompts: ['Find the antiderivative of f(x) = 6x.'],
    })
    expect(result.ok).toBe(false)
    expect(result.reason).toMatch(/duplicates/)
  })

  it('rejects a draft whose own answer fails its own accept rule', () => {
    const result = validateDraft(
      { ...goodShort, answer: 'something else entirely', accept: { mode: 'equalsAny', values: ['3x^2+c'] } },
      baseContext,
    )
    expect(result.ok).toBe(false)
    expect(result.reason).toMatch(/fails its own accept rule/)
  })

  describe('multiple choice', () => {
    const goodMcq = {
      ...goodShort,
      type: 'Multiple choice',
      options: [
        { id: 'A', text: '3x^2 + C', why: 'Power rule applied correctly.' },
        { id: 'B', text: '6x^2 + C', why: 'Forgot to divide by the new exponent.' },
        { id: 'C', text: '3x + C', why: 'Added one to the coefficient instead.' },
        { id: 'D', text: '6', why: 'Differentiated instead of integrating.' },
      ],
      correctOption: 'A',
      accept: undefined,
    }

    it('accepts a well-formed MCQ and keys the answer to the option id', () => {
      const result = validateDraft(goodMcq, baseContext)
      expect(result.ok).toBe(true)
      expect(result.question?.answerRule).toEqual({ mode: 'choice', values: ['A'] })
      expect(result.question?.answer).toBe('A — 3x^2 + C')
    })

    it('rejects a correctOption that is not one of the options', () => {
      const result = validateDraft({ ...goodMcq, correctOption: 'E' }, baseContext)
      expect(result.ok).toBe(false)
      expect(result.reason).toMatch(/not one of the options/)
    })

    it('rejects two options that say the same thing', () => {
      const result = validateDraft(
        {
          ...goodMcq,
          options: [
            { id: 'A', text: '3x^2 + C' },
            { id: 'B', text: '3x^2 + C' },
            { id: 'C', text: '6x^2 + C' },
            { id: 'D', text: '6' },
          ],
        },
        baseContext,
      )
      expect(result.ok).toBe(false)
      expect(result.reason).toMatch(/same thing/)
    })

    it('rejects filler options a student can eliminate for free', () => {
      const result = validateDraft(
        {
          ...goodMcq,
          options: [
            { id: 'A', text: '3x^2 + C' },
            { id: 'B', text: '6x^2 + C' },
            { id: 'C', text: '6' },
            { id: 'D', text: 'All of the above' },
          ],
        },
        baseContext,
      )
      expect(result.ok).toBe(false)
      expect(result.reason).toMatch(/filler option/)
    })
  })

  describe('numeric rules', () => {
    const goodNumeric = {
      ...goodShort,
      prompt: 'Evaluate the definite integral of 6x from 0 to 2.',
      answer: '12',
      accept: { mode: 'numeric', values: ['12'] },
    }

    it('accepts a numeric rule with a numeric value', () => {
      expect(validateDraft(goodNumeric, baseContext).ok).toBe(true)
    })

    it('accepts a fraction as a numeric value', () => {
      const result = validateDraft(
        { ...goodNumeric, answer: '2/3', accept: { mode: 'numeric', values: ['2/3'] } },
        baseContext,
      )
      expect(result.ok).toBe(true)
    })

    it('rejects a numeric rule with no numeric value', () => {
      const result = validateDraft(
        { ...goodNumeric, accept: { mode: 'numeric', values: ['twelve'] } },
        baseContext,
      )
      expect(result.ok).toBe(false)
      expect(result.reason).toMatch(/no numeric value/)
    })

    it('rejects a tolerance wide enough to mark wrong answers right', () => {
      const result = validateDraft(
        { ...goodNumeric, accept: { mode: 'numeric', values: ['12'], tolerance: 0.5 } },
        baseContext,
      )
      expect(result.ok).toBe(false)
      expect(result.reason).toMatch(/tolerance/)
    })
  })
})

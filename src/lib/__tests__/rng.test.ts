import { describe, expect, it } from 'vitest'
import { createRng, pickWeighted } from '../rng'

describe('createRng', () => {
  it('produces deterministic sequence for identical seeds', () => {
    const rngA = createRng('seed')
    const rngB = createRng('seed')
    const sequenceA = Array.from({ length: 5 }, () => rngA())
    const sequenceB = Array.from({ length: 5 }, () => rngB())
    expect(sequenceA).toEqual(sequenceB)
  })

  it('produces different sequence for different seeds', () => {
    const rngA = createRng('seed-a')
    const rngB = createRng('seed-b')
    const sequenceA = Array.from({ length: 5 }, () => rngA())
    const sequenceB = Array.from({ length: 5 }, () => rngB())
    expect(sequenceA).not.toEqual(sequenceB)
  })
})

describe('pickWeighted', () => {
  it('returns items proportionally to their weights', () => {
    const rng = createRng('weighted')
    const items = ['common', 'rare'] as const
    const counts: Record<(typeof items)[number], number> = {
      common: 0,
      rare: 0,
    }
    for (let i = 0; i < 100; i += 1) {
      const choice = pickWeighted(items, (item) => (item === 'common' ? 1 : 3), rng)
      counts[choice] += 1
    }
    expect(counts.rare).toBeGreaterThan(counts.common)
  })

  it('throws when total weight is not positive', () => {
    expect(() =>
      pickWeighted([1, 2, 3], () => 0, createRng('zero')),
    ).toThrow('Total weight must be positive')
  })
})

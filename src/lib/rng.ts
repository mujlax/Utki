export type RandomGenerator = () => number

const DEFAULT_SEED = 0x7391dcea

const hashSeed = (seed: string | number): number => {
  let h = 0
  const normalized = typeof seed === 'number' ? seed.toString(36) : seed
  for (let i = 0; i < normalized.length; i += 1) {
    h = Math.imul(31, h) + normalized.charCodeAt(i)
    h |= 0
  }
  return h >>> 0
}

export const createRng = (seed?: string | number): RandomGenerator => {
  let state = (seed ? hashSeed(seed) : DEFAULT_SEED) || DEFAULT_SEED
  return () => {
    // xorshift32
    state ^= state << 13
    state ^= state >>> 17
    state ^= state << 5
    const result = (state >>> 0) / 0xffffffff
    return result
  }
}

export const defaultRng = createRng()

export const pickWeighted = <T>(
  items: readonly T[],
  getWeight: (item: T) => number,
  rng: RandomGenerator = Math.random,
): T => {
  const weights = items.map((item) => Math.max(0, getWeight(item)))
  const totalWeight = weights.reduce((acc, weight) => acc + weight, 0)
  if (totalWeight <= 0) {
    throw new Error('Total weight must be positive')
  }
  const threshold = rng() * totalWeight
  let cumulative = 0
  for (let index = 0; index < items.length; index += 1) {
    cumulative += weights[index]
    if (threshold <= cumulative) {
      return items[index]
    }
  }
  return items[items.length - 1]
}

export const createDeterministicPicker =
  <T>(items: readonly T[], getWeight: (item: T) => number, seed?: string) =>
  () => {
    const rng = createRng(seed)
    return pickWeighted(items, getWeight, rng)
  }

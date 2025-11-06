import { describe, expect, it } from 'vitest'
import { purchasePrize, spinWheel } from '../economy'
import type { Prize, User, WheelSetting } from '../types'
import { createRng } from '../rng'

const baseUser: User = {
  userId: 'u1',
  name: 'Test User',
  balance: 100,
  spinsTotal: 0,
  luckModifier: 0,
  role: 'user',
  updatedAt: new Date(0).toISOString(),
}

const baseLevel: WheelSetting = {
  level: 'basic',
  spinCost: 3,
  pityStep: 0.1,
  pityMax: 0.5,
  rarityUpgrades: {
    1: 1,
    2: 2,
    3: 3,
    4: 4,
  },
  seriesBonusEvery: 5,
  seriesBonusType: 'freeSpin',
}

const commonPrize: Prize = {
  prizeId: 'p1',
  name: 'Sticker',
  description: 'Basic prize',
  rarity: 1,
  baseWeight: 100,
  directBuyEnabled: false,
  active: true,
}

const rarePrize: Prize = {
  prizeId: 'p2',
  name: 'Headphones',
  description: 'Rare prize',
  rarity: 3,
  baseWeight: 0.1,
  directBuyEnabled: true,
  directBuyPrice: 50,
  active: true,
}

describe('spinWheel', () => {
  it('reduces balance and increases pity after common prize', () => {
    const rng = createRng('common')
    const { result, nextUser, logEntry } = spinWheel({
      user: baseUser,
      level: baseLevel,
      prizes: [commonPrize],
      rng,
      now: new Date('2024-01-01T00:00:00.000Z'),
    })
    expect(result.rarity).toBe(1)
    expect(result.balanceAfter).toBe(baseUser.balance - baseLevel.spinCost)
    expect(result.luckAfter).toBeCloseTo(0.1, 5)
    expect(nextUser.luckModifier).toBeCloseTo(0.1, 5)
    expect(logEntry.prizeName).toBe(commonPrize.name)
  })

  it('resets pity when rare prize drops', () => {
    const rng = createRng('rare')
    const { nextUser } = spinWheel({
      user: { ...baseUser, luckModifier: 0.5 },
      level: baseLevel,
      prizes: [rarePrize],
      rng,
      now: new Date('2024-01-02T00:00:00.000Z'),
    })
    expect(nextUser.luckModifier).toBe(0)
  })
})

describe('purchasePrize', () => {
  it('creates an order and deducts balance', () => {
    const { order, nextUser } = purchasePrize({
      user: baseUser,
      prize: rarePrize,
      now: new Date('2024-01-03T00:00:00.000Z'),
    })
    expect(order.prizeId).toBe(rarePrize.prizeId)
    expect(order.price).toBe(rarePrize.directBuyPrice)
    expect(nextUser.balance).toBe(baseUser.balance - (rarePrize.directBuyPrice ?? 0))
  })
})

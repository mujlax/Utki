import { v4 as uuid } from 'uuid'
import { createRng, pickWeighted, type RandomGenerator } from './rng.js'
import type {
  Prize,
  Rarity,
  ShopOrder,
  SpinLogEntry,
  SpinResult,
  User,
  WheelSetting,
} from './types.js'

export const RARITY_BASE_WEIGHTS: Record<Rarity, number> = {
  1: 60,
  2: 25,
  3: 10,
  4: 5,
}

export interface SpinContext {
  user: User
  level: WheelSetting
  prizes: Prize[]
  now?: Date
  rng?: RandomGenerator
  seed?: string
}

export interface SpinOutcome {
  result: SpinResult
  nextUser: User
  logEntry: SpinLogEntry
}

export interface PurchaseContext {
  user: User
  prize: Prize
  now?: Date
}

export interface PurchaseOutcome {
  order: ShopOrder
  nextUser: User
}

const ensureBalance = (user: User, cost: number) => {
  if (user.balance < cost) {
    throw new Error('INSUFFICIENT_BALANCE')
  }
}

const applyRarityUpgrade = (
  rarity: Rarity,
  upgrades?: Record<Rarity, Rarity>,
): Rarity => {
  if (!upgrades) return rarity
  return upgrades[rarity] ?? rarity
}

const computePrizeWeight = ({
  effectiveRarity,
  level,
  luckModifier,
}: {
  effectiveRarity: Rarity
  level: WheelSetting
  luckModifier: number
}) => {
  const baseWeight = RARITY_BASE_WEIGHTS[effectiveRarity] ?? 0
  const override =
    level.weightsOverrides && level.weightsOverrides[effectiveRarity]
      ? level.weightsOverrides[effectiveRarity]!
      : 1
  const luckMultiplier =
    effectiveRarity === 1
      ? Math.max(0.1, 1 - luckModifier)
      : 1 + luckModifier
  return baseWeight * override * luckMultiplier
}

const buildPrizePool = (
  prizes: Prize[],
  level: WheelSetting,
): Array<{ prize: Prize; rarity: Rarity }> =>
  prizes
    .filter(
      (prize) =>
        prize.active && !(prize.removeAfterWin && prize.removedFromWheel),
    )
    .map((prize) => ({
      prize,
      rarity: applyRarityUpgrade(prize.rarity, level.rarityUpgrades),
    }))

const applyPity = (
  rarity: Rarity,
  level: WheelSetting,
  luckBefore: number,
): number => {
  if (rarity === 1) {
    return Math.min(level.pityMax, luckBefore + level.pityStep)
  }
  return 0
}

const applySeriesBonus = (
  level: WheelSetting,
  spinsTotal: number,
  spinCost: number,
  luckModifier: number,
): {
  balanceRefund: number
  luckIncrease: number
  applied: boolean
  freeSpinAwarded: boolean
} => {
  if (!level.seriesBonusEvery || level.seriesBonusEvery <= 0) {
    return { balanceRefund: 0, luckIncrease: 0, applied: false, freeSpinAwarded: false }
  }
  if (spinsTotal % level.seriesBonusEvery !== 0) {
    return { balanceRefund: 0, luckIncrease: 0, applied: false, freeSpinAwarded: false }
  }
  if (level.seriesBonusType === 'freeSpin') {
    return {
      balanceRefund: spinCost,
      luckIncrease: 0,
      applied: true,
      freeSpinAwarded: true,
    }
  }
  if (level.seriesBonusType === '+luck') {
    const remainingLuckRoom = Math.max(0, level.pityMax - luckModifier)
    if (remainingLuckRoom <= 0) {
      return { balanceRefund: 0, luckIncrease: 0, applied: false, freeSpinAwarded: false }
    }
    return {
      balanceRefund: 0,
      luckIncrease: Math.min(remainingLuckRoom, level.pityStep),
      applied: true,
      freeSpinAwarded: false,
    }
  }
  return { balanceRefund: 0, luckIncrease: 0, applied: false, freeSpinAwarded: false }
}

export const spinWheel = (context: SpinContext): SpinOutcome => {
  const { user, level, prizes } = context
  const now = context.now ?? new Date()
  ensureBalance(user, level.spinCost)

  const prizePool = buildPrizePool(prizes, level)
  if (prizePool.length === 0) {
    throw new Error('NO_PRIZES_AVAILABLE')
  }

  const rng: RandomGenerator =
    context.rng ?? (context.seed ? createRng(context.seed) : Math.random)

  const selected = pickWeighted(
    prizePool,
    (item: { prize: Prize; rarity: Rarity }) =>
      computePrizeWeight({
        effectiveRarity: item.rarity,
        level,
        luckModifier: user.luckModifier,
      }),
    rng,
  )
  const balanceBefore = user.balance
  const luckBefore = user.luckModifier

  let balanceAfter = balanceBefore - level.spinCost
  const spinsTotal = user.spinsTotal + 1
  let luckAfter = applyPity(selected.rarity, level, luckBefore)
  let freeSpinAwarded = false

  const bonus = applySeriesBonus(
    level,
    spinsTotal,
    level.spinCost,
    luckAfter,
  )
  if (bonus.applied) {
    balanceAfter += bonus.balanceRefund
    if (bonus.luckIncrease > 0) {
      luckAfter = Math.min(level.pityMax, luckAfter + bonus.luckIncrease)
    }
    freeSpinAwarded = bonus.freeSpinAwarded
  }

  const nextUser: User = {
    ...user,
    balance: balanceAfter,
    spinsTotal,
    lastResult: selected.prize.name,
    luckModifier: luckAfter,
    updatedAt: now.toISOString(),
  }

  const logEntry: SpinLogEntry = {
    logId: uuid(),
    userId: user.userId,
    betLevel: level.level,
    prizeId: selected.prize.prizeId,
    prizeName: selected.prize.name,
    rarity: selected.rarity,
    balanceBefore,
    balanceAfter,
    luckModifierBefore: luckBefore,
    luckModifierAfter: luckAfter,
    createdAt: now.toISOString(),
  }

  const result: SpinResult = {
    prize: selected.prize,
    rarity: selected.rarity,
    balanceBefore,
    balanceAfter,
    luckBefore,
    luckAfter,
    freeSpinAwarded,
    seriesBonusApplied: bonus.applied,
  }

  return { result, nextUser, logEntry }
}

export const purchasePrize = (context: PurchaseContext): PurchaseOutcome => {
  const { user, prize } = context
  const now = context.now ?? new Date()
  if (!prize.directBuyEnabled) {
    throw new Error('DIRECT_PURCHASE_NOT_ALLOWED')
  }
  if (typeof prize.directBuyPrice !== 'number') {
    throw new Error('DIRECT_PRICE_NOT_SET')
  }
  ensureBalance(user, prize.directBuyPrice)
  const nextUser: User = {
    ...user,
    balance: user.balance - prize.directBuyPrice,
    updatedAt: now.toISOString(),
  }
  const order: ShopOrder = {
    orderId: uuid(),
    userId: user.userId,
    prizeId: prize.prizeId,
    price: prize.directBuyPrice,
    status: 'created',
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  }
  return { order, nextUser }
}

export const calculatePrizeWeights = ({
  prizes,
  level,
  luckModifier,
}: {
  prizes: Prize[]
  level: WheelSetting
  luckModifier: number
}): Array<{ prize: Prize; weight: number; effectiveRarity: Rarity }> => {
  const pool = buildPrizePool(prizes, level)
  return pool.map(({ prize, rarity }) => ({
    prize,
    effectiveRarity: rarity,
    weight: computePrizeWeight({
      effectiveRarity: rarity,
      level,
      luckModifier,
    }),
  }))
}

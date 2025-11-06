import { z } from 'zod'
import type {
  Prize,
  Rarity,
  ShopOrder,
  SpinLogEntry,
  User,
  WheelSetting,
} from './types'

const raritySchema = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
])

const wheelLevelSchema = z.union([
  z.literal('basic'),
  z.literal('advanced'),
  z.literal('epic'),
  z.literal('legendary'),
])

const numberFromString = z.union([z.string(), z.number()]).transform((value) => {
  if (typeof value === 'number') return value
  const trimmed = value.trim()
  if (!trimmed) return 0
  const parsed = Number(trimmed)
  if (Number.isNaN(parsed)) {
    throw new Error(`Cannot parse number from value "${value}"`)
  }
  return parsed
})

const booleanFromString = z
  .union([z.string(), z.boolean()])
  .transform((value): boolean => {
    if (typeof value === 'boolean') return value
    const normalized = value.trim().toLowerCase()
    return normalized === 'true' || normalized === '1' || normalized === 'yes'
  })

const jsonRecordFromString = <T>(schema: z.ZodSchema<T>) =>
  z.union([z.string(), z.undefined(), z.null()]).transform((value) => {
    if (!value) {
      return schema.parse({})
    }
    try {
      const parsed = JSON.parse(value)
      return schema.parse(parsed)
    } catch (error) {
      throw new Error(`Cannot parse JSON from value "${value}": ${error}`)
    }
  }) as z.ZodType<T>

export const userSchema = z.object({
  userId: z.string(),
  name: z.string(),
  balance: numberFromString,
  spinsTotal: numberFromString,
  lastResult: z.string().optional(),
  luckModifier: numberFromString,
  role: z.union([z.literal('user'), z.literal('admin')]),
  updatedAt: z.string(),
})

export const prizeSchema = z.object({
  prizeId: z.string(),
  name: z.string(),
  description: z.string(),
  rarity: numberFromString.pipe(raritySchema),
  baseWeight: numberFromString,
  directBuyEnabled: booleanFromString,
  directBuyPrice: z
    .union([z.null(), z.undefined(), z.string(), z.number()])
    .transform((value) => {
      if (value === undefined || value === null) return undefined
      if (typeof value === 'number') return value
      const trimmed = value.trim()
      if (!trimmed) return undefined
      const parsed = Number(trimmed)
      if (Number.isNaN(parsed)) {
        throw new Error(`Cannot parse directBuyPrice from value "${value}"`)
      }
      return parsed
    }),
  active: booleanFromString,
  removeAfterWin: booleanFromString.optional().default(false),
  removedFromWheel: booleanFromString.optional().default(false),
})

const rarityOverrideSchema = z
  .record(z.string(), z.union([z.string(), z.number()]))
  .transform((record) => {
    const result: Partial<Record<Rarity, number>> = {}
    Object.entries(record).forEach(([key, value]) => {
      const numericKey = Number(key) as Rarity
      if (numericKey >= 1 && numericKey <= 4) {
        const numValue = typeof value === 'number' ? value : Number(value)
        if (!Number.isNaN(numValue)) {
          result[numericKey] = numValue
        }
      }
    })
    return result
  })

const rarityUpgradeSchema = z
  .record(z.string(), z.union([z.string(), z.number()]))
  .transform((record) => {
    const typed: Record<Rarity, Rarity> = {
      1: 1,
      2: 2,
      3: 3,
      4: 4,
    }
    Object.entries(record).forEach(([key, value]) => {
      const rarity = Number(key) as Rarity
      const rarityValue = typeof value === 'number' ? value : Number(value)
      if (rarity >= 1 && rarity <= 4 && rarityValue >= 1 && rarityValue <= 4) {
        typed[rarity] = rarityValue as Rarity
      }
    })
    return typed
  })

export const wheelSettingSchema = z.object({
  level: wheelLevelSchema,
  spinCost: numberFromString,
  rarityUpgrades: jsonRecordFromString(rarityUpgradeSchema),
  pityStep: numberFromString,
  pityMax: numberFromString,
  weightsOverrides: jsonRecordFromString(rarityOverrideSchema),
  seriesBonusEvery: numberFromString,
  seriesBonusType: z
    .union([
      z.literal('freeSpin'),
      z.literal('+luck'),
      z.string(),
      z.null(),
      z.undefined(),
    ])
    .transform((value) => {
      if (!value) return undefined
      if (value === 'freeSpin' || value === '+luck') return value
      return undefined
    }),
})

export const spinLogSchema = z.object({
  logId: z.string(),
  userId: z.string(),
  betLevel: wheelLevelSchema,
  prizeId: z.string().optional(),
  prizeName: z.string(),
  rarity: numberFromString.pipe(raritySchema),
  balanceBefore: numberFromString,
  balanceAfter: numberFromString,
  luckModifierBefore: numberFromString,
  luckModifierAfter: numberFromString,
  createdAt: z.string(),
})

export const shopOrderSchema = z.object({
  orderId: z.string(),
  userId: z.string(),
  prizeId: z.string(),
  price: numberFromString,
  status: z.union([
    z.literal('created'),
    z.literal('approved'),
    z.literal('delivered'),
  ]),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export type UserSchema = z.infer<typeof userSchema>
export type PrizeSchema = z.infer<typeof prizeSchema>
export type WheelSettingSchema = z.infer<typeof wheelSettingSchema>
export type SpinLogSchema = z.infer<typeof spinLogSchema>
export type ShopOrderSchema = z.infer<typeof shopOrderSchema>

export type ParsedUser = User
export type ParsedPrize = Prize
export type ParsedWheelSetting = WheelSetting
export type ParsedSpinLog = SpinLogEntry
export type ParsedShopOrder = ShopOrder

export const sheetSchemas = {
  Users: userSchema,
  Prizes: prizeSchema,
  WheelSettings: wheelSettingSchema,
  SpinLog: spinLogSchema,
  ShopOrders: shopOrderSchema,
}

export type SheetName = keyof typeof sheetSchemas

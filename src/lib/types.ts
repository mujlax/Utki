export type Rarity = 1 | 2 | 3 | 4

export type WheelLevelKey = 'basic' | 'advanced' | 'epic' | 'legendary'

export interface User {
  userId: string
  name: string
  balance: number
  spinsTotal: number
  lastResult?: string
  luckModifier: number
  role: 'user' | 'admin'
  updatedAt: string
}

export interface Prize {
  prizeId: string
  name: string
  description: string
  rarity: Rarity
  baseWeight: number
  directBuyEnabled: boolean
  directBuyPrice?: number
  active: boolean
  removeAfterWin?: boolean
  removedFromWheel?: boolean
}

export interface WheelSetting {
  level: WheelLevelKey
  spinCost: number
  rarityUpgrades: Record<Rarity, Rarity>
  pityStep: number
  pityMax: number
  weightsOverrides?: Partial<Record<Rarity, number>>
  seriesBonusEvery: number
  seriesBonusType?: 'freeSpin' | '+luck'
}

export type WheelSettingsMap = Record<WheelLevelKey, WheelSetting>

export interface SpinResult {
  prize?: Prize
  rarity: Rarity
  balanceBefore: number
  balanceAfter: number
  luckBefore: number
  luckAfter: number
  freeSpinAwarded?: boolean
  seriesBonusApplied?: boolean
}

export interface SpinLogEntry {
  logId: string
  userId: string
  betLevel: WheelLevelKey
  prizeId?: string
  prizeName: string
  rarity: Rarity
  balanceBefore: number
  balanceAfter: number
  luckModifierBefore: number
  luckModifierAfter: number
  createdAt: string
}

export interface ShopOrder {
  orderId: string
  userId: string
  prizeId: string
  price: number
  status: 'created' | 'approved' | 'delivered'
  createdAt: string
  updatedAt: string
}

export interface UserWinSummary {
  prizeId?: string
  prizeName: string
  rarity: Rarity
  count: number
  lastWonAt: string
}

export interface UserOverview {
  userId: string
  name: string
  balance: number
  wins: UserWinSummary[]
}

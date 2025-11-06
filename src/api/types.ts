import type {
  Prize,
  ShopOrder,
  SpinLogEntry,
  SpinResult,
  User,
  WheelSettingsMap,
  UserOverview,
} from '../lib/types'

export interface MeResponse {
  user: User
  appName: string
}

export interface PrizesResponse {
  prizes: Prize[]
}

export interface SettingsResponse {
  settings: WheelSettingsMap
}

export interface SpinLogsResponse {
  logs: SpinLogEntry[]
}

export interface OrdersResponse {
  orders: ShopOrder[]
}

export interface SpinResponse {
  result: SpinResult
  user: User
}

export interface BuyResponse {
  order: ShopOrder
  user: User
}

export interface AdminSuccessResponse {
  success: true
}

export interface UsersOverviewResponse {
  users: UserOverview[]
}

export type ApiError = {
  error: string
  details?: string
}

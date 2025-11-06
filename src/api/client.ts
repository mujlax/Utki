import type {
  AdminSuccessResponse,
  BuyResponse,
  DuckHistoryResponse,
  MeResponse,
  OrdersResponse,
  PrizesResponse,
  SettingsResponse,
  SpinLogsResponse,
  SpinResponse,
  UsersOverviewResponse,
} from './types'
import type { Prize, WheelSetting, User } from '../lib/types'
import { clientEnv } from '../lib/env'

const joinUrl = (path: string) => {
  if (!clientEnv.apiBaseUrl) {
    return path
  }
  const trimmed = path.startsWith('/') ? path : `/${path}`
  return `${clientEnv.apiBaseUrl.replace(/\/$/, '')}${trimmed}`
}

const toUrlSearchParams = (params: Record<string, string | undefined>) => {
  const searchParams = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) {
      searchParams.set(key, value)
    }
  })
  return searchParams.toString()
}

const handleResponse = async <T>(response: Response): Promise<T> => {
  if (!response.ok) {
    let errorMessage = response.statusText
    try {
      const errorBody = (await response.json()) as { error?: string; details?: string }
      if (errorBody.error) {
        errorMessage = errorBody.error
      }
    } catch {
      // ignore
    }
    throw new Error(errorMessage)
  }
  return response.json() as Promise<T>
}

export const apiClient = {
  getMe: async (userId: string) => {
    const query = toUrlSearchParams({ userId })
    const response = await fetch(joinUrl(`/api/me?${query}`))
    return handleResponse<MeResponse>(response)
  },

  getPrizes: async () => {
    const response = await fetch(joinUrl('/api/prizes'))
    return handleResponse<PrizesResponse>(response)
  },

  getUsersOverview: async () => {
    const response = await fetch(joinUrl('/api/users-overview'))
    return handleResponse<UsersOverviewResponse>(response)
  },

  getSettings: async () => {
    const response = await fetch(joinUrl('/api/settings'))
    return handleResponse<SettingsResponse>(response)
  },

  getLogs: async (userId?: string) => {
    const query = userId ? `?${toUrlSearchParams({ userId })}` : ''
    const response = await fetch(joinUrl(`/api/logs${query}`))
    return handleResponse<SpinLogsResponse>(response)
  },

  getOrders: async (userId?: string) => {
    const query = userId ? `?${toUrlSearchParams({ userId })}` : ''
    const response = await fetch(joinUrl(`/api/orders${query}`))
    return handleResponse<OrdersResponse>(response)
  },

  getDuckHistory: async (userId: string) => {
    const query = toUrlSearchParams({ userId })
    const response = await fetch(joinUrl(`/api/duck-history?${query}`))
    return handleResponse<DuckHistoryResponse>(response)
  },

  spin: async (payload: { userId: string; betLevel: string; seed?: string }) => {
    const response = await fetch(joinUrl('/api/spin'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    return handleResponse<SpinResponse>(response)
  },

  buyPrize: async (payload: { userId: string; prizeId: string }) => {
    const response = await fetch(joinUrl('/api/buy'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    return handleResponse<BuyResponse>(response)
  },

  savePrize: async (payload: { prize: Prize; authSecret?: string }) => {
    const response = await fetch(joinUrl('/api/admin/prizes'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(payload.authSecret ? { 'x-auth-secret': payload.authSecret } : {}),
      },
      body: JSON.stringify({
        prize: payload.prize,
        authSecret: payload.authSecret,
      }),
    })
    return handleResponse<AdminSuccessResponse>(response)
  },

  addDucks: async (payload: { userId: string; amount: number; note: string; authSecret?: string }) => {
    const response = await fetch(joinUrl('/api/admin/add-ducks'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(payload.authSecret ? { 'x-auth-secret': payload.authSecret } : {}),
      },
      body: JSON.stringify(payload),
    })
    return handleResponse<{ user: User; entry: { entryId: string } }>(response)
  },

  saveSetting: async (payload: { setting: WheelSetting; authSecret?: string }) => {
    const response = await fetch(joinUrl('/api/admin/settings'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(payload.authSecret ? { 'x-auth-secret': payload.authSecret } : {}),
      },
      body: JSON.stringify({
        setting: payload.setting,
        authSecret: payload.authSecret,
      }),
    })
    return handleResponse<AdminSuccessResponse>(response)
  },
}

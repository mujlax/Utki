import { create } from 'zustand'

interface UserStoreState {
  userId: string | null
  authSecret: string | null
  setUserId: (userId: string | null) => void
  setAuthSecret: (authSecret: string | null) => void
}

export const useUserStore = create<UserStoreState>((set) => ({
  userId: null,
  authSecret: null,
  setUserId: (userId) => set({ userId }),
  setAuthSecret: (authSecret) => set({ authSecret }),
}))

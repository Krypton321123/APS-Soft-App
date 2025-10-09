import { create } from 'zustand'

interface UserIdState {
    username: string, 
    setUsername: (username: string) => void
}

export const useUserId = create<UserIdState>((set) => ({
    username: '',
    setUsername: (username: string) => set(() => ({ username: username })),
  }))
  
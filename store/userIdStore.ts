import { create } from 'zustand'

interface UserIdState {
    username: string, 
    userId: string, 
    setUsername: (username: string, userId: string) => void
}

export const useUserId = create<UserIdState>((set) => ({
    username: '', 
    userId: '', 
    setUsername: (username: string, userId: string) => set(() => ({ username: username, userId: userId })),
  }))
  
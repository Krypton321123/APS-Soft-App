import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

interface UserIdState {
    username: string, 
    userId: string, 
    setUsername: (username: string, userId: string) => void
}

export const useUserId = create<UserIdState>((set) => ({
    username: '', 
    userId: '', 
    depotName: '', 
    setUsername: (username: string, userId: string) => set(() => ({ username: username, userId: userId })),
  }))
  
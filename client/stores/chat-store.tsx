import { create } from 'zustand'

export interface ChatItem {
  id: string
  name: string
}

interface ChatStore {
  chats: ChatItem[]
  addChat: () => ChatItem
}

export const useChatStore = create<ChatStore>((set, get) => ({
  chats: [],
  addChat: () => {
    const newChat: ChatItem = {
      id: crypto.randomUUID(),
      name: `Chat ${get().chats.length + 1}`
    }
    set((state) => ({
      chats: [...state.chats, newChat]
    }))
    return newChat
  }
})) 
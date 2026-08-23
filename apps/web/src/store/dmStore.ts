import { create } from 'zustand';
import { apiFetch } from '@/lib/api';
import { socket } from '@/lib/socket';

export interface DirectMessage {
  id: string;
  content: string;
  isEdited: boolean;
  authorId: string;
  conversationId: string;
  createdAt: string;
  updatedAt: string;
  author: {
    id: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
  };
}

export interface DMConversation {
  id: string;
  type: string;
  updatedAt: string;
  recipient: {
    id: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
    status: string;
  };
  lastMessage?: DirectMessage;
}

interface DMStore {
  conversations: DMConversation[];
  activeConversationId: string | null;
  messages: Record<string, DirectMessage[]>;
  isLoadingConversations: boolean;
  isLoadingMessages: boolean;

  fetchConversations: () => Promise<void>;
  openConversationWith: (userId: string) => Promise<string>;
  setActiveConversation: (id: string | null) => void;
  fetchMessages: (conversationId: string) => Promise<void>;
  sendMessage: (conversationId: string, content: string) => Promise<void>;

  setupSocketListeners: () => void;
  cleanupSocketListeners: () => void;
}

export const useDMStore = create<DMStore>((set, get) => ({
  conversations: [],
  activeConversationId: null,
  messages: {},
  isLoadingConversations: false,
  isLoadingMessages: false,

  fetchConversations: async () => {
    set({ isLoadingConversations: true });
    try {
      const data = await apiFetch('/api/dms');
      set({ conversations: data });
    } catch (error) {
      console.error('Failed to fetch DMs', error);
    } finally {
      set({ isLoadingConversations: false });
    }
  },

  openConversationWith: async (userId: string) => {
    try {
      const data = await apiFetch(`/api/dms/with/${userId}`, { method: 'POST' });
      await get().fetchConversations();
      get().setActiveConversation(data.id);
      return data.id;
    } catch (error) {
      console.error('Failed to open DM', error);
      throw error;
    }
  },

  setActiveConversation: (id: string | null) => {
    set({ activeConversationId: id });
    if (id) {
      get().fetchMessages(id);
    }
  },

  fetchMessages: async (conversationId: string) => {
    set({ isLoadingMessages: true });
    try {
      const data = await apiFetch(`/api/dms/${conversationId}/messages`);
      set(state => ({
        messages: { ...state.messages, [conversationId]: data }
      }));
    } catch (error) {
      console.error('Failed to fetch messages', error);
    } finally {
      set({ isLoadingMessages: false });
    }
  },

  sendMessage: async (conversationId: string, content: string) => {
    try {
      const msg = await apiFetch(`/api/dms/${conversationId}/messages`, {
        method: 'POST',
        body: JSON.stringify({ content })
      });
      // The socket event will append the message to the store, but we can do it optimistically here too if needed.
    } catch (error) {
      console.error('Failed to send message', error);
      throw error;
    }
  },

  setupSocketListeners: () => {
    get().cleanupSocketListeners();
    socket.on('dm:message', (message: DirectMessage) => {
      set(state => {
        const convId = message.conversationId;
        const existingMessages = state.messages[convId] || [];
        
        // Update the conversation's last message and sort them
        let newConversations = [...state.conversations];
        const convIndex = newConversations.findIndex(c => c.id === convId);
        
        if (convIndex >= 0) {
          newConversations[convIndex].lastMessage = message;
          newConversations[convIndex].updatedAt = message.createdAt;
          // Sort to bring this conv to top
          newConversations.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        } else {
          // If we received a message for a conv we don't know about, fetch convs again
          get().fetchConversations();
        }

        return {
          messages: {
            ...state.messages,
            [convId]: [...existingMessages, message]
          },
          conversations: newConversations
        };
      });
    });
  },

  cleanupSocketListeners: () => {
    socket.off('dm:message');
  }
}));

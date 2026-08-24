import { create } from 'zustand';
import { apiFetch } from '@/lib/api';
import { socket } from '@/lib/socket';

export interface UserInfo {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  status?: string;
}

export interface DirectMessage {
  id: string;
  content: string;
  isEdited: boolean;
  authorId: string;
  conversationId: string;
  createdAt: string;
  updatedAt: string;
  author: UserInfo;
  attachments?: any[];
}

export interface DMConversation {
  id: string;
  type: 'DIRECT' | 'GROUP';
  updatedAt: string;
  name?: string | null;
  iconUrl?: string | null;
  ownerId?: string | null;
  recipient?: UserInfo | null;
  participants: UserInfo[];
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
  createGroupDM: (userIds: string[], name?: string, iconUrl?: string) => Promise<string>;
  leaveGroup: (groupId: string) => Promise<void>;
  setActiveConversation: (id: string | null) => void;
  fetchMessages: (conversationId: string) => Promise<void>;
  sendMessage: (conversationId: string, content: string, attachmentIds?: string[]) => Promise<void>;

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

  createGroupDM: async (userIds: string[], name?: string, iconUrl?: string) => {
    try {
      const data = await apiFetch('/api/dms/group', {
        method: 'POST',
        body: JSON.stringify({ userIds, name, iconUrl })
      });
      await get().fetchConversations();
      get().setActiveConversation(data.id);
      return data.id;
    } catch (error) {
      console.error('Failed to create Group DM', error);
      throw error;
    }
  },

  leaveGroup: async (groupId: string) => {
    try {
      await apiFetch(`/api/dms/${groupId}/leave`, { method: 'POST' });
      const currentActive = get().activeConversationId;
      await get().fetchConversations();
      if (currentActive === groupId) {
        get().setActiveConversation(null);
      }
    } catch (error) {
      console.error('Failed to leave Group DM', error);
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

  sendMessage: async (conversationId: string, content: string, attachmentIds?: string[]) => {
    try {
      const msg = await apiFetch(`/api/dms/${conversationId}/messages`, {
        method: 'POST',
        body: JSON.stringify({ content, attachmentIds: attachmentIds || [] })
      });
      // socket event will trigger state update via addMessage
      return msg;
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
        
        let newConversations = [...state.conversations];
        const convIndex = newConversations.findIndex(c => c.id === convId);
        
        if (convIndex >= 0) {
          newConversations[convIndex].lastMessage = message;
          newConversations[convIndex].updatedAt = message.createdAt;
          newConversations.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        } else {
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

    socket.on('dm:group:created', () => get().fetchConversations());
    socket.on('dm:group:participant_added', () => get().fetchConversations());
    socket.on('dm:group:participant_removed', () => get().fetchConversations());
    socket.on('dm:group:left', (data) => {
      if (get().activeConversationId === data.conversationId) {
        get().setActiveConversation(null);
      }
      get().fetchConversations();
    });
  },

  cleanupSocketListeners: () => {
    socket.off('dm:message');
    socket.off('dm:group:created');
    socket.off('dm:group:participant_added');
    socket.off('dm:group:participant_removed');
    socket.off('dm:group:left');
  }
}));

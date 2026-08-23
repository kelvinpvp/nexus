import { create } from 'zustand';
import { apiFetch } from '@/lib/api';
import { socket } from '@/lib/socket';

export type FriendStatus = 'online' | 'offline' | 'idle' | 'dnd';

export interface Friend {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  status: FriendStatus;
  friendshipId?: string;
  friendshipCreatedAt?: string;
}

export interface FriendRequest {
  id: string;
  senderId: string;
  receiverId: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'IGNORED';
  createdAt: string;
  sender?: Friend;
  receiver?: Friend;
}

export interface Block {
  id: string;
  blockerId: string;
  blockedId: string;
  createdAt: string;
  blocked?: Friend;
}

interface FriendStore {
  friends: Friend[];
  sentRequests: FriendRequest[];
  receivedRequests: FriendRequest[];
  blocks: Block[];
  isLoading: boolean;
  
  fetchFriends: () => Promise<void>;
  fetchRequests: () => Promise<void>;
  fetchBlocks: () => Promise<void>;
  
  sendFriendRequest: (username: string) => Promise<void>;
  acceptFriendRequest: (requestId: string) => Promise<void>;
  rejectFriendRequest: (requestId: string) => Promise<void>;
  cancelFriendRequest: (requestId: string) => Promise<void>;
  removeFriend: (friendId: string) => Promise<void>;
  
  blockUser: (userId: string) => Promise<void>;
  unblockUser: (userId: string) => Promise<void>;

  setupSocketListeners: () => void;
  cleanupSocketListeners: () => void;
}

export const useFriendStore = create<FriendStore>((set, get) => ({
  friends: [],
  sentRequests: [],
  receivedRequests: [],
  blocks: [],
  isLoading: false,

  fetchFriends: async () => {
    try {
      const data = await apiFetch('/api/friends');
      set({ friends: data });
    } catch (error) {
      console.error('Failed to fetch friends', error);
    }
  },

  fetchRequests: async () => {
    try {
      const data = await apiFetch('/api/friends/requests');
      set({ receivedRequests: data.received || [], sentRequests: data.sent || [] });
    } catch (error) {
      console.error('Failed to fetch requests', error);
    }
  },

  fetchBlocks: async () => {
    try {
      const data = await apiFetch('/api/blocks');
      set({ blocks: data });
    } catch (error) {
      console.error('Failed to fetch blocks', error);
    }
  },

  sendFriendRequest: async (username: string) => {
    const data = await apiFetch('/api/friends/requests', {
      method: 'POST',
      body: JSON.stringify({ username })
    });
    set(state => ({ sentRequests: [...state.sentRequests, data] }));
  },

  acceptFriendRequest: async (requestId: string) => {
    await apiFetch(`/api/friends/requests/${requestId}/accept`, { method: 'POST' });
    set(state => ({
      receivedRequests: state.receivedRequests.filter(r => r.id !== requestId)
    }));
    await get().fetchFriends(); // Refresh friends list
  },

  rejectFriendRequest: async (requestId: string) => {
    await apiFetch(`/api/friends/requests/${requestId}/reject`, { method: 'POST' });
    set(state => ({
      receivedRequests: state.receivedRequests.filter(r => r.id !== requestId)
    }));
  },

  cancelFriendRequest: async (requestId: string) => {
    await apiFetch(`/api/friends/requests/${requestId}`, { method: 'DELETE' });
    set(state => ({
      sentRequests: state.sentRequests.filter(r => r.id !== requestId)
    }));
  },

  removeFriend: async (friendId: string) => {
    await apiFetch(`/api/friends/${friendId}`, { method: 'DELETE' });
    set(state => ({
      friends: state.friends.filter(f => f.id !== friendId)
    }));
  },

  blockUser: async (userId: string) => {
    await apiFetch(`/api/blocks/${userId}`, { method: 'POST' });
    await get().fetchBlocks();
    await get().fetchFriends();
    await get().fetchRequests();
  },

  unblockUser: async (userId: string) => {
    await apiFetch(`/api/blocks/${userId}`, { method: 'DELETE' });
    await get().fetchBlocks();
  },

  setupSocketListeners: () => {
    get().cleanupSocketListeners();

    socket.on('friend:request_received', (request: FriendRequest) => {
      set(state => ({ receivedRequests: [...state.receivedRequests, request] }));
    });

    socket.on('friend:request_accepted', ({ friendshipId, friend }) => {
      // If we sent it, remove from sent
      set(state => {
        // Prevent duplicates
        if (state.friends.some(f => f.id === friend.id)) return state;
        return {
          sentRequests: state.sentRequests.filter(r => r.receiverId !== friend.id),
          receivedRequests: state.receivedRequests.filter(r => r.senderId !== friend.id),
          friends: [...state.friends, { ...friend, friendshipId }]
        };
      });
    });

    socket.on('friend:request_rejected', ({ requestId }) => {
      set(state => ({
        sentRequests: state.sentRequests.filter(r => r.id !== requestId)
      }));
    });

    socket.on('friend:request_cancelled', ({ requestId }) => {
      set(state => ({
        receivedRequests: state.receivedRequests.filter(r => r.id !== requestId)
      }));
    });

    socket.on('friend:removed', ({ friendId }) => {
      set(state => ({
        friends: state.friends.filter(f => f.id !== friendId)
      }));
    });

    socket.on('block:created', () => {
      // Refresh lists when someone blocks us to remove any friendship/requests locally
      get().fetchFriends();
      get().fetchRequests();
    });

    socket.on('presence:update', ({ userId, status }) => {
      set(state => ({
        friends: state.friends.map(f => f.id === userId ? { ...f, status } : f)
      }));
    });
  },

  cleanupSocketListeners: () => {
    socket.off('friend:request_received');
    socket.off('friend:request_accepted');
    socket.off('friend:request_rejected');
    socket.off('friend:request_cancelled');
    socket.off('friend:removed');
    socket.off('block:created');
    socket.off('presence:update');
  }
}));

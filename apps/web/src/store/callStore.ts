import { create } from 'zustand';
import { apiFetch } from '@/lib/api';

export type CallStatus = 'RINGING' | 'ACTIVE' | 'DECLINED' | 'MISSED' | 'ENDED';
export type CallType = 'VOICE' | 'VIDEO';

export interface CallSession {
  id: string;
  conversationId: string;
  initiatorId: string;
  type: CallType;
  status: CallStatus;
  createdAt: string;
  acceptedAt: string | null;
  endedAt: string | null;
  initiator?: {
    id: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
  };
}

interface CallStore {
  incomingCall: CallSession | null;
  activeCall: CallSession | null;
  isCallModalOpen: boolean;
  liveKitToken: string | null;
  roomName: string | null;
  
  setIncomingCall: (call: CallSession | null) => void;
  setActiveCall: (call: CallSession | null) => void;
  setCallModalOpen: (isOpen: boolean) => void;
  
  initiateCall: (conversationId: string, type: CallType) => Promise<void>;
  acceptCall: (callId: string) => Promise<void>;
  declineCall: (callId: string) => Promise<void>;
  endCall: (callId: string) => Promise<void>;
  fetchToken: (callId: string) => Promise<void>;
  
  clearCallState: () => void;
  setupSocketListeners: () => void;
  cleanupSocketListeners: () => void;
}

export const useCallStore = create<CallStore>((set, get) => ({
  incomingCall: null,
  activeCall: null,
  isCallModalOpen: false,
  liveKitToken: null,
  roomName: null,

  setIncomingCall: (call) => set({ incomingCall: call }),
  setActiveCall: (call) => set({ activeCall: call }),
  setCallModalOpen: (isOpen) => set({ isCallModalOpen: isOpen }),

  clearCallState: () => set({
    incomingCall: null,
    activeCall: null,
    isCallModalOpen: false,
    liveKitToken: null,
    roomName: null,
  }),

  initiateCall: async (conversationId, type) => {
    try {
      const call = await apiFetch('/api/calls', {
        method: 'POST',
        body: JSON.stringify({ conversationId, type }),
      });
      set({ activeCall: call, isCallModalOpen: true });
    } catch (error: any) {
      // If there's a stuck call, force-end it and retry once
      if (error?.call?.id) {
        try {
          await apiFetch(`/api/calls/${error.call.id}/end`, { method: 'POST' });
          // Retry
          const retryCall = await apiFetch('/api/calls', {
            method: 'POST',
            body: JSON.stringify({ conversationId, type }),
          });
          set({ activeCall: retryCall, isCallModalOpen: true });
          return;
        } catch (retryError: any) {
          console.error('Failed to recover from stuck call:', retryError);
          throw retryError;
        }
      }
      console.error('Failed to initiate call:', error);
      throw error;
    }
  },

  acceptCall: async (callId) => {
    try {
      const call = await apiFetch(`/api/calls/${callId}/accept`, {
        method: 'POST',
      });
      set({ incomingCall: null, activeCall: call, isCallModalOpen: true });
      await get().fetchToken(callId);
    } catch (error: any) {
      console.error('Failed to accept call:', error);
      throw error;
    }
  },

  declineCall: async (callId) => {
    try {
      await apiFetch(`/api/calls/${callId}/decline`, {
        method: 'POST',
      });
      set({ incomingCall: null });
    } catch (error: any) {
      console.error('Failed to decline call:', error);
    }
  },

  endCall: async (callId) => {
    try {
      await apiFetch(`/api/calls/${callId}/end`, {
        method: 'POST',
      });
      get().clearCallState();
    } catch (error: any) {
      console.error('Failed to end call:', error);
    }
  },

  fetchToken: async (callId) => {
    try {
      const data = await apiFetch(`/api/calls/${callId}/token`, {
        method: 'POST',
      });
      set({ liveKitToken: data.token, roomName: data.roomName });
    } catch (error: any) {
      console.error('Failed to fetch call token:', error);
      throw error;
    }
  },

  setupSocketListeners: () => {
    const { socket } = require('@/lib/socket');
    
    socket.on('dm:call:incoming', (call: CallSession) => {
      set({ incomingCall: call });
    });
    
    socket.on('dm:call:accepted', async (call: CallSession) => {
      const state = get();
      if (state.activeCall?.id === call.id) {
        set({ activeCall: call });
        await state.fetchToken(call.id);
      } else if (state.incomingCall?.id === call.id) {
        // We accepted on another device or it's a multi-way?
        set({ incomingCall: null, activeCall: call, isCallModalOpen: true });
        await state.fetchToken(call.id);
      }
    });

    socket.on('dm:call:declined', (call: CallSession) => {
      const state = get();
      if (state.activeCall?.id === call.id || state.incomingCall?.id === call.id) {
        state.clearCallState();
      }
    });

    socket.on('dm:call:ended', (call: CallSession) => {
      const state = get();
      if (state.activeCall?.id === call.id || state.incomingCall?.id === call.id) {
        state.clearCallState();
      }
    });
  },

  cleanupSocketListeners: () => {
    const { socket } = require('@/lib/socket');
    socket.off('dm:call:incoming');
    socket.off('dm:call:accepted');
    socket.off('dm:call:declined');
    socket.off('dm:call:ended');
  }
}));

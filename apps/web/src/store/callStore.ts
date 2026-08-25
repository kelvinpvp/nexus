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
  conversation?: {
    id: string;
    type: string;
    ownerId: string | null;
  };
}

const isGroupCall = (call: CallSession | null | undefined) => call?.conversation?.type === 'GROUP';

interface CallStore {
  incomingCall: CallSession | null;
  activeCall: CallSession | null;
  isCallModalOpen: boolean;
  liveKitToken: string | null;
  roomName: string | null;
  
  // Realtime Active Group Calls map (conversationId -> { call, participantCount })
  activeGroupCalls: Record<string, { call: CallSession; participantCount: number }>;

  setIncomingCall: (call: CallSession | null) => void;
  setActiveCall: (call: CallSession | null) => void;
  setCallModalOpen: (isOpen: boolean) => void;
  
  checkActiveCall: (conversationId: string) => Promise<CallSession | null>;
  initiateCall: (conversationId: string, type: CallType) => Promise<void>;
  joinActiveCall: (call: CallSession) => Promise<void>;
  leaveCall: (callId: string) => Promise<void>;
  endCallForEveryone: (callId: string) => Promise<void>;
  acceptCall: (callId: string) => Promise<void>;
  declineCall: (callId: string) => Promise<void>;
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
  activeGroupCalls: {},

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

  checkActiveCall: async (conversationId: string) => {
    try {
      const data = await apiFetch(`/api/calls/active/${conversationId}`);
      if (data.activeCall && data.activeCall.status !== 'ENDED') {
        set((state) => ({
          activeGroupCalls: {
            ...state.activeGroupCalls,
            [conversationId]: {
              call: data.activeCall,
              participantCount: typeof data.participantCount === 'number' ? data.participantCount : 0,
            }
          }
        }));
        return data.activeCall;
      } else {
        set((state) => {
          const next = { ...state.activeGroupCalls };
          delete next[conversationId];
          return { activeGroupCalls: next };
        });
        return null;
      }
    } catch (e) {
      return null;
    }
  },

  // Initiate or Join active call
  initiateCall: async (conversationId, type) => {
    try {
      const call = await apiFetch('/api/calls', {
        method: 'POST',
        body: JSON.stringify({ conversationId, type }),
      });

      set((state) => ({
        activeCall: call,
        isCallModalOpen: true,
        activeGroupCalls: isGroupCall(call)
          ? {
              ...state.activeGroupCalls,
              [call.conversationId]: {
                call,
                participantCount: state.activeGroupCalls[call.conversationId]?.participantCount ?? 0,
              },
            }
          : state.activeGroupCalls,
      }));
      await get().fetchToken(call.id);
    } catch (error: any) {
      console.error('Failed to initiate call:', error);
      throw error;
    }
  },

  joinActiveCall: async (call) => {
    try {
      set((state) => ({
        activeCall: call,
        isCallModalOpen: true,
        incomingCall: state.incomingCall?.id === call.id ? null : state.incomingCall,
      }));
      await get().fetchToken(call.id);
    } catch (error: any) {
      console.error('Failed to join call:', error);
      throw error;
    }
  },

  // Leave Call (Solo disconnect - Call stays ACTIVE for others)
  leaveCall: async (callId) => {
    try {
      await apiFetch(`/api/calls/${callId}/leave`, {
        method: 'POST',
      });
      get().clearCallState();
    } catch (error: any) {
      console.error('Failed to leave call:', error);
      get().clearCallState();
    }
  },

  // End Call for Everyone (Authorized only)
  endCallForEveryone: async (callId) => {
    try {
      await apiFetch(`/api/calls/${callId}/end`, {
        method: 'POST',
      });
      get().clearCallState();
    } catch (error: any) {
      alert(error.message || 'Falha ao encerrar chamada para todos.');
    }
  },

  acceptCall: async (callId) => {
    try {
      const call = await apiFetch(`/api/calls/${callId}/accept`, {
        method: 'POST',
      });
      set((state) => ({
        incomingCall: null,
        activeCall: call,
        isCallModalOpen: true,
        activeGroupCalls: isGroupCall(call)
          ? {
              ...state.activeGroupCalls,
              [call.conversationId]: {
                call,
                participantCount: state.activeGroupCalls[call.conversationId]?.participantCount ?? 0,
              },
            }
          : state.activeGroupCalls,
      }));
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
    get().cleanupSocketListeners();
    const { socket } = require('@/lib/socket');
    
    socket.on('dm:call:incoming', (call: CallSession) => {
      set((state) => ({
        incomingCall: call,
        activeGroupCalls: isGroupCall(call)
          ? {
              ...state.activeGroupCalls,
              [call.conversationId]: {
                call,
                participantCount: state.activeGroupCalls[call.conversationId]?.participantCount ?? 0,
              },
            }
          : state.activeGroupCalls,
      }));
    });
    
    socket.on('dm:call:accepted', async (call: CallSession) => {
      const state = get();
      if (state.activeCall?.id === call.id) {
        set((prev) => ({
          activeCall: call,
          activeGroupCalls: isGroupCall(call)
            ? {
                ...prev.activeGroupCalls,
                [call.conversationId]: {
                  call,
                  participantCount: prev.activeGroupCalls[call.conversationId]?.participantCount ?? 0,
                },
              }
            : prev.activeGroupCalls,
        }));
        await state.fetchToken(call.id);
      } else if (state.incomingCall?.id === call.id) {
        set((prev) => ({
          incomingCall: null,
          activeCall: call,
          isCallModalOpen: true,
          activeGroupCalls: isGroupCall(call)
            ? {
                ...prev.activeGroupCalls,
                [call.conversationId]: {
                  call,
                  participantCount: prev.activeGroupCalls[call.conversationId]?.participantCount ?? 0,
                },
              }
            : prev.activeGroupCalls,
        }));
        await state.fetchToken(call.id);
      }
    });

    socket.on('call:participant_left', ({ callId, userId, conversationId }: any) => {
      const state = get();
      // If current user left, state is already updated via leaveCall
      // For other participants, keep activeCall alive and update count if needed
      if (state.activeCall?.id === callId && state.activeCall?.initiatorId !== userId) {
        // Keep active call alive
      }
      if (conversationId) {
        get().checkActiveCall(conversationId);
      }
    });

    socket.on('dm:call:declined', (call: CallSession) => {
      const state = get();
      if (!isGroupCall(call) && (state.activeCall?.id === call.id || state.incomingCall?.id === call.id)) {
        state.clearCallState();
      }
    });

    socket.on('call:participant_declined', ({ callId, conversationId }: any) => {
      const state = get();
      if (state.incomingCall?.id === callId) {
        set({ incomingCall: null });
      }
      if (conversationId) {
        void state.checkActiveCall(conversationId);
      }
    });

    socket.on('dm:call:ended', (call: CallSession) => {
      const state = get();
      if (state.activeCall?.id === call.id || state.incomingCall?.id === call.id) {
        state.clearCallState();
      }
      if (call.conversationId) {
        set((prev) => {
          const next = { ...prev.activeGroupCalls };
          delete next[call.conversationId];
          return { activeGroupCalls: next };
        });
      }
    });
  },

  cleanupSocketListeners: () => {
    const { socket } = require('@/lib/socket');
    socket.off('dm:call:incoming');
    socket.off('dm:call:accepted');
    socket.off('call:participant_left');
    socket.off('dm:call:declined');
    socket.off('call:participant_declined');
    socket.off('dm:call:ended');
  }
}));

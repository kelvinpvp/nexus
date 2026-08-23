import { create } from 'zustand';
import { apiFetch } from '@/lib/api';

interface VoiceState {
  connectedVoiceChannelId: string | null;
  connectedServerId: string | null;
  token: string | null;
  wsUrl: string | null;
  roomName: string | null;
  isConnecting: boolean;
  error: string | null;
  
  // Local audio settings per participant
  localUserVolumes: Record<string, number>; // userId -> volume (0 to 1)
  locallyMutedUserIds: Record<string, boolean>; // userId -> isMuted

  connectToVoice: (channelId: string, serverId: string) => Promise<void>;
  disconnectFromVoice: () => void;
  setLocalVolume: (userId: string, volume: number) => void;
  toggleLocalMute: (userId: string) => void;
  clearError: () => void;
}

export const useVoiceStore = create<VoiceState>((set, get) => ({
  connectedVoiceChannelId: null,
  connectedServerId: null,
  token: null,
  wsUrl: null,
  roomName: null,
  isConnecting: false,
  error: null,
  localUserVolumes: {},
  locallyMutedUserIds: {},

  connectToVoice: async (channelId: string, serverId: string) => {
    // If already connecting or connected to the same channel, do nothing
    if (get().connectedVoiceChannelId === channelId && get().token) return;

    set({ isConnecting: true, error: null });

    try {
      const data = await apiFetch('/api/voice/token', {
        method: 'POST',
        body: JSON.stringify({ channelId }),
      });

      const wsUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL || data.wsUrl || 'ws://localhost:7880';

      set({
        token: data.token,
        wsUrl,
        roomName: data.roomName,
        connectedVoiceChannelId: channelId,
        connectedServerId: serverId,
        isConnecting: false,
      });
    } catch (err: any) {
      console.error('Error connecting to voice:', err);
      set({
        isConnecting: false,
        error: err.message || 'Falha ao gerar token de voz.',
      });
    }
  },

  disconnectFromVoice: () => {
    set({
      connectedVoiceChannelId: null,
      connectedServerId: null,
      token: null,
      wsUrl: null,
      roomName: null,
      isConnecting: false,
    });
  },

  setLocalVolume: (userId: string, volume: number) => {
    set((state) => ({
      localUserVolumes: {
        ...state.localUserVolumes,
        [userId]: Math.max(0, Math.min(2, volume)),
      },
    }));
  },

  toggleLocalMute: (userId: string) => {
    set((state) => ({
      locallyMutedUserIds: {
        ...state.locallyMutedUserIds,
        [userId]: !state.locallyMutedUserIds[userId],
      },
    }));
  },

  clearError: () => set({ error: null }),
}));

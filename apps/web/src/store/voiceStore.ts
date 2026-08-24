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
  
  participantAudioPreferences: Record<string, {
    voiceVolume: number;
    voiceMuted: boolean;
    screenShareVolume: number;
    screenShareMuted: boolean;
  }>;

  connectToVoice: (channelId: string, serverId: string) => Promise<void>;
  disconnectFromVoice: () => void;
  setAudioPreference: (
    userId: string, 
    type: 'voiceVolume' | 'voiceMuted' | 'screenShareVolume' | 'screenShareMuted', 
    value: number | boolean
  ) => void;
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
  participantAudioPreferences: {},

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

  setAudioPreference: (userId, type, value) => {
    set(state => {
      const currentPrefs = state.participantAudioPreferences[userId] || {
        voiceVolume: 1,
        voiceMuted: false,
        screenShareVolume: 1,
        screenShareMuted: false
      };
      
      return {
        participantAudioPreferences: {
          ...state.participantAudioPreferences,
          [userId]: {
            ...currentPrefs,
            [type]: value
          }
        }
      };
    });
  },

  clearError: () => set({ error: null }),
}));

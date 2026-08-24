import { create } from 'zustand';
import { apiFetch } from '@/lib/api';

export interface UserPreferences {
  joinMuted: boolean;
  joinDeafened: boolean;
  theme: string;
  messageDisplay: string;
  reducedMotion: boolean;
  notificationSounds: boolean;
  desktopNotifications: boolean;
  friendRequestPolicy: string;
  allowServerDMs: boolean;
  cameraQuality?: 'AUTO' | 'P720' | 'P1080';
  screenShareQuality?: 'AUTO' | 'P720_30' | 'P1080_30' | 'P1080_60' | 'MAX';
  audioInputDeviceId?: string;
  audioOutputDeviceId?: string;
  noiseSuppressionEnabled?: boolean;
}

interface SettingsState {
  preferences: UserPreferences | null;
  isLoading: boolean;
  fetchPreferences: () => Promise<void>;
  updatePreferences: (updates: Partial<UserPreferences>) => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  preferences: null,
  isLoading: false,

  fetchPreferences: async () => {
    set({ isLoading: true });
    try {
      const data = await apiFetch('/api/users/me/preferences');
      set({ preferences: data, isLoading: false });
    } catch (err) {
      console.error('Error fetching preferences:', err);
      set({ isLoading: false });
    }
  },

  updatePreferences: async (updates) => {
    // Optimistic update
    const prev = get().preferences;
    const optimistic = prev ? { ...prev, ...updates } : null;
    if (optimistic) {
      set({ preferences: optimistic });
    }

    try {
      const data = await apiFetch('/api/users/me/preferences', {
        method: 'PATCH',
        body: JSON.stringify(updates)
      });
      // Merge: server is source of truth, but keep optimistic values for
      // device IDs that the server may return as null (not yet migrated rows)
      const merged = {
        ...data,
        audioInputDeviceId: data.audioInputDeviceId ?? optimistic?.audioInputDeviceId,
        audioOutputDeviceId: data.audioOutputDeviceId ?? optimistic?.audioOutputDeviceId,
        noiseSuppressionEnabled: data.noiseSuppressionEnabled ?? optimistic?.noiseSuppressionEnabled ?? true,
      };
      set({ preferences: merged });
    } catch (err) {
      console.error('Error updating preferences:', err);
      // Revert on error
      if (prev) {
        set({ preferences: prev });
      }
    }
  }
}));

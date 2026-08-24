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
    if (prev) {
      set({ preferences: { ...prev, ...updates } });
    }

    try {
      const data = await apiFetch('/api/users/me/preferences', {
        method: 'PATCH',
        body: JSON.stringify(updates)
      });
      set({ preferences: data });
    } catch (err) {
      console.error('Error updating preferences:', err);
      // Revert on error
      if (prev) {
        set({ preferences: prev });
      }
    }
  }
}));

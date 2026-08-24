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

// Keys that are local/device-specific and must persist in localStorage
// even if the server doesn't support them yet.
const LOCAL_PREF_KEY = 'nexus_local_prefs';

function loadLocalPrefs(): Partial<UserPreferences> {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(localStorage.getItem(LOCAL_PREF_KEY) || '{}');
  } catch {
    return {};
  }
}

function saveLocalPrefs(updates: Partial<UserPreferences>) {
  if (typeof window === 'undefined') return;
  const existing = loadLocalPrefs();
  const localFields: (keyof UserPreferences)[] = [
    'audioInputDeviceId',
    'audioOutputDeviceId',
    'noiseSuppressionEnabled',
  ];
  const next: Partial<UserPreferences> = { ...existing };
  localFields.forEach((k) => {
    const v = (updates as any)[k];
    if (v !== undefined) (next as any)[k] = v;
  });
  localStorage.setItem(LOCAL_PREF_KEY, JSON.stringify(next));
}

/** Merge server prefs with localStorage fallback for local-device fields */
function mergeWithLocal(serverData: any): UserPreferences {
  const local = loadLocalPrefs();
  return {
    ...serverData,
    audioInputDeviceId: serverData.audioInputDeviceId ?? local.audioInputDeviceId,
    audioOutputDeviceId: serverData.audioOutputDeviceId ?? local.audioOutputDeviceId,
    noiseSuppressionEnabled:
      serverData.noiseSuppressionEnabled !== undefined && serverData.noiseSuppressionEnabled !== null
        ? serverData.noiseSuppressionEnabled
        : (local.noiseSuppressionEnabled ?? true),
  };
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
      // Always merge with localStorage so local-device fields survive
      // even if the backend migration hasn't run yet.
      set({ preferences: mergeWithLocal(data), isLoading: false });
    } catch (err) {
      console.error('Error fetching preferences:', err);
      set({ isLoading: false });
    }
  },

  updatePreferences: async (updates) => {
    // Persist local-device fields to localStorage immediately (survives page reload)
    saveLocalPrefs(updates);

    // Optimistic update
    const prev = get().preferences;
    const optimistic = prev ? { ...prev, ...updates } : null;
    if (optimistic) {
      set({ preferences: optimistic });
    }

    try {
      const data = await apiFetch('/api/users/me/preferences', {
        method: 'PATCH',
        body: JSON.stringify(updates),
      });
      // Merge server response with localStorage so nothing resets
      set({ preferences: mergeWithLocal(data) });
    } catch (err) {
      console.error('Error updating preferences:', err);
      if (prev) {
        set({ preferences: prev });
      }
    }
  },
}));

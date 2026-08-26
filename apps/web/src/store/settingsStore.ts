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
  monitorOwnVoice?: boolean;
  monitorOwnScreenShareAudio?: boolean;
}

// Keys that are local/device-specific and must persist in localStorage
// even if the server doesn't support them yet.
const LOCAL_PREF_KEY = 'nexus_local_prefs';
const LOCAL_PREF_FIELDS: (keyof UserPreferences)[] = [
  'audioInputDeviceId',
  'audioOutputDeviceId',
  'noiseSuppressionEnabled',
  'monitorOwnVoice',
  'monitorOwnScreenShareAudio',
];

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
  const next: Partial<UserPreferences> = { ...existing };
  LOCAL_PREF_FIELDS.forEach((k) => {
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
    audioInputDeviceId: local.audioInputDeviceId ?? serverData.audioInputDeviceId,
    audioOutputDeviceId: local.audioOutputDeviceId ?? serverData.audioOutputDeviceId,
    noiseSuppressionEnabled:
      local.noiseSuppressionEnabled ??
      (serverData.noiseSuppressionEnabled !== undefined && serverData.noiseSuppressionEnabled !== null
        ? serverData.noiseSuppressionEnabled
        : true),
    monitorOwnVoice: local.monitorOwnVoice ?? false,
    monitorOwnScreenShareAudio: local.monitorOwnScreenShareAudio ?? false,
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

    const serverUpdates = Object.fromEntries(
      Object.entries(updates).filter(([key]) => !LOCAL_PREF_FIELDS.includes(key as keyof UserPreferences))
    ) as Partial<UserPreferences>;

    if (Object.keys(serverUpdates).length === 0) {
      return;
    }

    try {
      const data = await apiFetch('/api/users/me/preferences', {
        method: 'PATCH',
        body: JSON.stringify(serverUpdates),
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

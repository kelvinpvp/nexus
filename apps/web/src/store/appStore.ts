import { create } from 'zustand';
import { apiFetch } from '@/lib/api';

export interface Channel {
  id: string;
  name: string;
  type: 'TEXT' | 'VOICE' | 'STAGE' | 'FORUM' | 'MEDIA' | 'ANNOUNCEMENT';
  categoryId?: string | null;
  serverId: string;
}

export interface Category {
  id: string;
  name: string;
  channels: Channel[];
}

export interface VoiceState {
  userId: string;
  username: string;
  avatarUrl: string | null;
  channelId: string;
  isMuted: boolean;
  isDeafened: boolean;
}

export interface ServerMember {
  id: string;
  role: string;
  user: {
    id: string;
    username: string;
    avatarUrl: string | null;
    status: string;
  };
}

export interface Server {
  id: string;
  name: string;
  iconUrl: string | null;
  ownerId: string;
  categories: Category[];
  members: ServerMember[];
}

interface AppState {
  servers: Server[];
  activeServerId: string | null;
  activeChannelId: string | null;
  isLoadingServers: boolean;
  voiceStates: VoiceState[];
  
  fetchServers: () => Promise<void>;
  fetchServerDetails: (serverId: string) => Promise<void>;
  setActiveServer: (serverId: string | null) => void;
  setActiveChannel: (channelId: string) => void;
  addServer: (server: Server) => void;
  setVoiceStates: (states: VoiceState[]) => void;
  isSettingsModalOpen: boolean;
  setSettingsModalOpen: (isOpen: boolean) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  servers: [],
  activeServerId: null,
  activeChannelId: null,
  isLoadingServers: false,
  voiceStates: [],
  isSettingsModalOpen: false,

  setSettingsModalOpen: (isOpen) => set({ isSettingsModalOpen: isOpen }),
  setVoiceStates: (states) => set({ voiceStates: states }),

  fetchServers: async () => {
    set({ isLoadingServers: true });
    try {
      const servers = await apiFetch('/api/servers');
      set({ servers, isLoadingServers: false });
      
      // Auto select first server if none selected
      if (servers.length > 0 && !get().activeServerId) {
        get().setActiveServer(servers[0].id);
      }
    } catch (error) {
      console.error('Failed to fetch servers', error);
      set({ isLoadingServers: false });
    }
  },

  fetchServerDetails: async (serverId: string) => {
    try {
      const serverDetails = await apiFetch(`/api/servers/${serverId}`);
      set((state) => ({
        servers: state.servers.map(s => s.id === serverId ? serverDetails : s)
      }));
      
      // Auto select general channel if none is selected
      if (!get().activeChannelId && serverDetails.categories.length > 0) {
        const textCat = serverDetails.categories.find((c: any) => c.name === 'CANAIS DE TEXTO');
        if (textCat && textCat.channels.length > 0) {
          set({ activeChannelId: textCat.channels[0].id });
        }
      }
    } catch (error) {
      console.error('Failed to fetch server details', error);
    }
  },

  setActiveServer: (serverId: string | null) => {
    set({ activeServerId: serverId, activeChannelId: null });
    if (serverId) {
      get().fetchServerDetails(serverId);
    }
  },

  setActiveChannel: (channelId: string) => {
    set({ activeChannelId: channelId });
  },

  addServer: (server: Server) => {
    set((state) => ({ servers: [...state.servers, server] }));
    get().setActiveServer(server.id);
  }
}));

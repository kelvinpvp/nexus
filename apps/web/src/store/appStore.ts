import { create } from 'zustand';
import { apiFetch } from '@/lib/api';
import { socket } from '@/lib/socket';

export interface Role {
  id: string;
  name: string;
  color: string;
  position: number;
  permissions: string;
  isDefault: boolean;
  mentionable: boolean;
  serverId: string;
}

export interface ChannelOverride {
  id: string;
  type: 'ROLE' | 'MEMBER';
  allow: string;
  deny: string;
  channelId: string;
  roleId?: string | null;
  memberId?: string | null;
}

export interface Channel {
  id: string;
  name: string;
  type: 'TEXT' | 'VOICE' | 'STAGE' | 'FORUM' | 'MEDIA' | 'ANNOUNCEMENT';
  topic?: string | null;
  userLimit?: number;
  categoryId?: string | null;
  serverId: string;
  overrides?: ChannelOverride[];
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
  serverMuted?: boolean;
  serverDeafened?: boolean;
}

export interface ServerMemberRole {
  id: string;
  memberId: string;
  roleId: string;
  role: Role;
}

export interface ServerMember {
  id: string;
  role: string;
  nickname?: string | null;
  serverMuted?: boolean;
  serverDeafened?: boolean;
  user: {
    id: string;
    username: string;
    displayName?: string | null;
    avatarUrl: string | null;
    status: string;
    customStatus?: string | null;
    bio?: string | null;
  };
  roles?: ServerMemberRole[];
}

export interface Server {
  id: string;
  name: string;
  iconUrl: string | null;
  description?: string | null;
  ownerId: string;
  roles?: Role[];
  categories: Category[];
  members: ServerMember[];
}

interface AppState {
  servers: Server[];
  activeServerId: string | null;
  activeChannelId: string | null;
  isLoadingServers: boolean;
  voiceStates: VoiceState[];
  isServerSettingsOpen: boolean;
  setServerSettingsOpen: (isOpen: boolean) => void;
  
  fetchServers: () => Promise<void>;
  fetchServerDetails: (serverId: string) => Promise<void>;
  setActiveServer: (serverId: string | null) => void;
  setActiveChannel: (channelId: string) => void;
  addServer: (server: Server) => void;
  setVoiceStates: (states: VoiceState[]) => void;
  isSettingsModalOpen: boolean;
  setSettingsModalOpen: (isOpen: boolean) => void;
  setupSocketListeners: () => void;
  cleanupSocketListeners: () => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  servers: [],
  activeServerId: null,
  activeChannelId: null,
  isLoadingServers: false,
  voiceStates: [],
  isSettingsModalOpen: false,
  isServerSettingsOpen: false,

  setServerSettingsOpen: (isOpen) => set({ isServerSettingsOpen: isOpen }),
  setSettingsModalOpen: (isOpen) => set({ isSettingsModalOpen: isOpen }),
  setVoiceStates: (states) => set({ voiceStates: states }),

  fetchServers: async (force = false) => {
    if (!force && get().servers.length > 0) return;
    set({ isLoadingServers: true });
    try {
      const servers = await apiFetch('/api/servers');
      set({ servers, isLoadingServers: false });
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
  },

  setupSocketListeners: () => {
    get().cleanupSocketListeners();
    socket.on('voice_states_update', (states: VoiceState[]) => {
      set({ voiceStates: states });
    });
  },

  cleanupSocketListeners: () => {
    socket.off('voice_states_update');
  }
}));

'use client';

import { useEffect } from 'react';
import { useAppStore } from '@/store/appStore';
import { useDMStore } from '@/store/dmStore';
import ServerList from '@/components/Sidebar/ServerList';
import ChannelList from '@/components/Sidebar/ChannelList';
import ChatArea from '@/components/Chat/ChatArea';
import HomeSidebar from '@/components/Home/HomeSidebar';
import HomeArea from '@/components/Home/HomeArea';
import DMArea from '@/components/Home/DMArea';
import CallManager from '@/components/Call/CallManager';
import ServerVoiceManager from '@/components/Voice/ServerVoiceManager';
import { useAuth } from '@/contexts/AuthContext';
import DesktopUpdateBanner from '@/components/Desktop/DesktopUpdateBanner';

import ServerSettingsModal from '@/components/Modals/ServerSettingsModal';

export default function App() {
  const { fetchServers, isLoadingServers, activeServerId, isServerSettingsOpen, setServerSettingsOpen } = useAppStore();
  const { activeConversationId } = useDMStore();
  const { user } = useAuth();
  const isDesktopRuntime =
    typeof window !== 'undefined' &&
    (Boolean((window as any).__TAURI_INTERNALS) || window.location.hostname === 'tauri.localhost' || window.location.protocol === 'tauri:');

  useEffect(() => {
    if (user) {
      fetchServers();
    }
  }, [user, fetchServers]);

  if (!user) return null; // AuthContext handles redirect

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-slate-950 text-slate-50">
      {/* Global Announcement Banner */}
      <DesktopUpdateBanner />
      {!isDesktopRuntime && (
        <div className="z-50 flex items-center justify-center gap-4 border-b border-cyan-300/20 bg-cyan-400/15 px-4 py-2 text-center text-sm font-semibold text-cyan-50">
          <span>🚀 O Nexus Desktop Oficial foi lançado! Tenha uma experiência muito melhor baixando o app nativo.</span>
          <a 
            href="https://github.com/kelvinpvp/nexus/releases/latest" 
            target="_blank" 
            rel="noreferrer"
            className="rounded-full bg-white px-4 py-1 text-xs font-bold text-cyan-700 transition-colors hover:bg-cyan-50"
          >
            Baixar Agora
          </a>
        </div>
      )}

      <div className="relative flex flex-1 overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(99,102,241,0.12),_transparent_30%),linear-gradient(180deg,_#070a12_0%,_#0b1020_100%)]">
        {/* 1. Server List (Leftmost) */}
        <ServerList />

        {/* 2. Channel List (Middle) */}
        {activeServerId === null ? <HomeSidebar /> : <ChannelList />}

        {/* 3. Main Chat Area (Right) */}
        {isLoadingServers ? (
          <div className="flex flex-1 items-center justify-center">
            <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-cyan-300"></div>
          </div>
        ) : activeServerId === null ? (
          activeConversationId ? <DMArea /> : <HomeArea />
        ) : (
          <ChatArea />
        )}

        {/* Global Voice Connections */}
        <ServerVoiceManager />
        <CallManager />

        {/* Server Settings Modal */}
        {isServerSettingsOpen && (
          <ServerSettingsModal onClose={() => setServerSettingsOpen(false)} />
        )}
      </div>
    </div>
  );
}

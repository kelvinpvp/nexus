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

import ServerSettingsModal from '@/components/Modals/ServerSettingsModal';

export default function App() {
  const { fetchServers, isLoadingServers, activeServerId, isServerSettingsOpen, setServerSettingsOpen } = useAppStore();
  const { activeConversationId } = useDMStore();
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchServers();
    }
  }, [user, fetchServers]);

  if (!user) return null; // AuthContext handles redirect

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Global Announcement Banner */}
      {!process.env.NEXT_PUBLIC_TAURI_ENV && (
        <div className="bg-[#5865F2] text-white py-2 px-4 text-center text-sm font-bold flex justify-center items-center gap-4 z-50">
          <span>🚀 O Nexus Desktop Oficial foi lançado! Tenha uma experiência muito melhor baixando o app nativo.</span>
          <a 
            href="https://github.com/kelvinpvp/nexus/releases/latest" 
            target="_blank" 
            rel="noreferrer"
            className="bg-white text-[#5865F2] px-4 py-1 rounded-full text-xs hover:bg-gray-100 transition-colors shadow-sm"
          >
            Baixar Agora
          </a>
        </div>
      )}

      <div className="flex flex-1 bg-[#313338] overflow-hidden relative">
        {/* 1. Server List (Leftmost) */}
        <ServerList />

        {/* 2. Channel List (Middle) */}
        {activeServerId === null ? <HomeSidebar /> : <ChannelList />}

        {/* 3. Main Chat Area (Right) */}
        {isLoadingServers ? (
          <div className="flex-1 flex items-center justify-center bg-[#313338]">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#5865F2]"></div>
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

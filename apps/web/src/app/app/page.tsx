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
    <div className="flex h-screen bg-[#313338] overflow-hidden">
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
  );
}

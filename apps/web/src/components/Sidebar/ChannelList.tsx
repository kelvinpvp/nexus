import { useAppStore } from '@/store/appStore';
import { useVoiceStore } from '@/store/voiceStore';
import { useAuth } from '@/contexts/AuthContext';
import { Hash, Volume2, Mic, MicOff, Headphones, LogOut, ChevronDown, Radio, PhoneOff, Settings } from 'lucide-react';
import { socket } from '@/lib/socket';
import { useEffect } from 'react';
import UserPanel from './UserPanel';
import { useState } from 'react';
import CreateServerInviteModal from '../Modals/CreateServerInviteModal';

import { UserPlus, Shield, Check, X } from 'lucide-react';

export default function ChannelList() {
  const { servers, activeServerId, activeChannelId, setActiveChannel, voiceStates, setVoiceStates, setSettingsModalOpen, setServerSettingsOpen } = useAppStore();
  const { connectedVoiceChannelId, connectToVoice, disconnectFromVoice } = useVoiceStore();
  const { user } = useAuth();
  const [isInviteModalOpen, setInviteModalOpen] = useState(false);
  const [isServerMenuOpen, setServerMenuOpen] = useState(false);

  const activeServer = servers.find(s => s.id === activeServerId);

  useEffect(() => {
    const onVoiceUpdate = (states: any[]) => {
      setVoiceStates(states);
    };
    socket.on('voice_states_update', onVoiceUpdate);
    return () => {
      socket.off('voice_states_update', onVoiceUpdate);
    };
  }, [setVoiceStates]);

  if (!activeServer || !activeServer.categories) {
    return (
      <div className="w-[240px] bg-[linear-gradient(180deg,#0c1426_0%,#0b1020_100%)] flex flex-col flex-shrink-0 border-r border-white/5">
        <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
          Carregando...
        </div>
      </div>
    );
  }

  // Find connected channel details for bottom status bar
  const allChannels = activeServer.categories.flatMap(c => c.channels);
  const connectedChannel = allChannels.find(c => c.id === connectedVoiceChannelId);

  const handleChannelClick = (channel: any) => {
    setActiveChannel(channel.id);
    if (channel.type === 'VOICE' || channel.type === 'STAGE') {
      connectToVoice(channel.id, activeServer.id);
    }
  };

  return (
    <div className="w-[240px] bg-[linear-gradient(180deg,#0c1426_0%,#0b1020_100%)] flex flex-col flex-shrink-0 h-full select-none relative border-r border-white/5">
      {/* Server Header Dropdown */}
      <header 
        onClick={() => setServerMenuOpen(!isServerMenuOpen)}
        className="h-12 border-b border-white/5 flex items-center justify-between px-4 hover:bg-white/6 cursor-pointer transition-colors shadow-sm relative z-20 backdrop-blur-md bg-white/3"
      >
        <h1 className="font-bold text-white text-[15px] truncate">{activeServer.name}</h1>
        <ChevronDown size={18} className={`text-slate-400 transition-transform duration-200 ${isServerMenuOpen ? 'rotate-180' : ''}`} />
      </header>

      {/* Server Menu Dropdown */}
      {isServerMenuOpen && (
        <div 
          onClick={(e) => e.stopPropagation()}
          className="absolute top-14 left-2 right-2 z-50 bg-[#0b1020] border border-white/8 rounded-2xl shadow-2xl p-1.5 space-y-1 animate-in fade-in zoom-in-95 duration-100"
        >
          <button
            onClick={() => {
              setServerMenuOpen(false);
              setInviteModalOpen(true);
            }}
            className="w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-sm text-cyan-300 font-semibold hover:bg-cyan-400/10 hover:text-white transition-colors"
          >
            <span>Convidar Pessoas</span>
            <UserPlus size={16} />
          </button>
          
          <button
            onClick={() => {
              setServerMenuOpen(false);
              setServerSettingsOpen(true);
            }}
            className="w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-sm text-slate-300 hover:bg-white/6 hover:text-white transition-colors"
          >
            <span>Configurações do Servidor</span>
            <Shield size={16} />
          </button>
        </div>
      )}

      {/* Channels List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-4 mt-2">
        {activeServer.categories.map((category) => (
          <div key={category.id}>
            <div className="flex items-center text-slate-400 hover:text-slate-100 cursor-pointer mb-1 px-1">
              <ChevronDown size={12} className="mr-1" />
              <span className="text-[11px] font-bold uppercase tracking-wider">{category.name}</span>
            </div>
            
            <div className="space-y-0.5">
              {category.channels.map(channel => {
                const isActive = channel.id === activeChannelId;
                const isVoiceConnected = channel.id === connectedVoiceChannelId;
                const Icon = channel.type === 'VOICE' ? Volume2 : Hash;
                
                return (
                  <div key={channel.id}>
                    <div 
                      onClick={() => handleChannelClick(channel)}
                      className={`flex items-center justify-between px-2 py-1.5 rounded cursor-pointer group transition-colors ${
                        isActive 
                          ? 'bg-cyan-400/12 text-white border border-cyan-300/15' 
                          : 'hover:bg-white/6 text-slate-400 hover:text-slate-100'
                      }`}
                    >
                      <div className="flex items-center truncate">
                        <Icon size={18} className={`mr-1.5 flex-shrink-0 ${isVoiceConnected ? 'text-cyan-300' : isActive ? 'text-white' : 'text-slate-500'}`} />
                        <span className={`font-medium text-[15px] truncate ${isVoiceConnected ? 'text-cyan-300 font-bold' : ''}`}>
                          {channel.name}
                        </span>
                      </div>
                      {isVoiceConnected && (
                        <Radio size={14} className="text-cyan-300 animate-pulse flex-shrink-0 ml-1" />
                      )}
                    </div>
                    {/* Render voice members if this is a voice channel */}
                    {channel.type === 'VOICE' && voiceStates.filter(vs => vs.channelId === channel.id).map(vs => (
                      <div key={vs.userId} className="flex items-center px-2 py-1 ml-6 mr-2 rounded-xl hover:bg-white/6 cursor-pointer group">
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-cyan-400 to-violet-500 flex items-center justify-center text-white text-xs font-bold mr-2 flex-shrink-0 overflow-hidden">
                          {vs.avatarUrl ? <img src={vs.avatarUrl} alt="" className="w-full h-full object-cover"/> : vs.username.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-slate-400 group-hover:text-slate-100 text-[13px] font-medium truncate flex-1">{vs.username}</span>
                        <div className="flex items-center space-x-1 flex-shrink-0">
                          {vs.isMuted && <MicOff size={14} className="text-rose-400" />}
                          {vs.isDeafened && <Headphones size={14} className="text-rose-400" />}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Voice Connected Bar (Shown when user is connected to a voice channel) */}
      {connectedVoiceChannelId && (
        <div className="bg-[#0b1020] border-t border-white/5 p-2.5 flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2 truncate">
            <Radio size={18} className="text-cyan-300 animate-pulse flex-shrink-0" />
            <div className="truncate">
              <div className="font-bold text-cyan-300 text-[12px] leading-tight">Voz Conectada</div>
              <div className="text-slate-400 text-[11px] truncate leading-tight">
                {connectedChannel ? connectedChannel.name : 'Canal de Voz'} / {activeServer.name}
              </div>
            </div>
          </div>
          <button
            onClick={disconnectFromVoice}
            className="text-slate-400 hover:text-rose-400 p-1 rounded transition-colors flex-shrink-0"
            title="Desconectar da Voz"
          >
            <PhoneOff size={18} />
          </button>
        </div>
      )}

      {/* User Panel */}
      <UserPanel />

      <CreateServerInviteModal 
        isOpen={isInviteModalOpen} 
        onClose={() => setInviteModalOpen(false)} 
        serverId={activeServer.id} 
      />
    </div>
  );
}

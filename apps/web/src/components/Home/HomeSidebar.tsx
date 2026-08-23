import { Users, X, Plus } from 'lucide-react';
import UserPanel from '../Sidebar/UserPanel';
import { useDMStore } from '@/store/dmStore';
import { useState } from 'react';
import CreateGroupDMModal from '../Modals/CreateGroupDMModal';

export default function HomeSidebar() {
  const { conversations, activeConversationId, setActiveConversation } = useDMStore();
  const [isCreateGroupModalOpen, setCreateGroupModalOpen] = useState(false);

  return (
    <div className="w-[240px] bg-[#2B2D31] flex flex-col flex-shrink-0 h-full select-none">
      {/* Search Header */}
      <header className="h-12 border-b border-[#1F2023] flex items-center px-2.5 shadow-sm">
        <button 
          onClick={() => setCreateGroupModalOpen(true)}
          className="w-full bg-[#1E1F22] text-[#949BA4] text-sm text-left px-2 py-1.5 rounded transition-colors hover:bg-[#1E1F22]/80 hover:text-[#DBDEE1]"
        >
          Encontre ou comece uma conversa
        </button>
      </header>

      {/* Main List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-2 mt-2 space-y-0.5">
        <div 
          onClick={() => setActiveConversation(null)}
          className={`flex items-center px-3 py-2.5 rounded cursor-pointer group transition-colors ${
            activeConversationId === null ? 'bg-[#404249] text-white' : 'text-[#949BA4] hover:bg-[#35373C] hover:text-[#DBDEE1]'
          }`}
        >
          <Users size={24} className="mr-3" />
          <span className="font-medium text-[15px]">Amigos</span>
        </div>

        <div className="mt-4 pt-4 border-t border-[#1F2023]/30">
          <div className="flex items-center justify-between px-2 mb-1">
            <span className="text-[11px] font-bold text-[#949BA4] hover:text-[#DBDEE1] uppercase tracking-wider cursor-pointer">
              Mensagens Diretas
            </span>
            <button 
              className="text-[#949BA4] hover:text-[#DBDEE1]"
              onClick={() => setCreateGroupModalOpen(true)}
              title="Criar DM em Grupo"
            >
              <Plus size={16} />
            </button>
          </div>
          
          {/* List of DMs */}
          <div className="space-y-0.5 mt-2">
            {conversations.map(conv => {
              const isActive = activeConversationId === conv.id;
              
              let displayName = '';
              let avatarContent = null;
              let isOnline = false;

              if (conv.type === 'DIRECT') {
                const friend = conv.recipient;
                if (!friend) return null;
                displayName = friend.displayName || friend.username;
                isOnline = friend.status === 'ONLINE';
                
                avatarContent = (
                  <div className="relative w-8 h-8 rounded-full bg-[#5865F2] flex items-center justify-center text-white font-bold shrink-0">
                    {friend.avatarUrl ? <img src={friend.avatarUrl} alt="" className="w-full h-full rounded-full object-cover"/> : friend.username.charAt(0).toUpperCase()}
                    <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-[#2B2D31] ${isActive ? 'border-[#404249]' : 'group-hover:border-[#35373C]'} ${friend.status === 'ONLINE' ? 'bg-[#23A559]' : friend.status === 'IDLE' ? 'bg-[#F0B232]' : friend.status === 'DND' ? 'bg-[#F23F43]' : 'bg-[#80848E]'}`}></div>
                  </div>
                );
              } else {
                // Group DM
                displayName = conv.name || conv.participants.map(p => p.username).join(', ');
                if (!displayName) displayName = 'Grupo Desconhecido';
                
                avatarContent = (
                  <div className="relative w-8 h-8 rounded-full bg-[#313338] flex items-center justify-center text-[#DBDEE1] shrink-0 overflow-hidden">
                    {conv.iconUrl ? (
                      <img src={conv.iconUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <Users size={18} />
                    )}
                  </div>
                );
              }
              
              return (
                <div 
                  key={conv.id}
                  onClick={() => setActiveConversation(conv.id)}
                  className={`flex items-center justify-between px-2 py-1.5 rounded cursor-pointer group transition-colors ${
                    isActive ? 'bg-[#404249] text-white' : 'text-[#949BA4] hover:bg-[#35373C] hover:text-[#DBDEE1]'
                  }`}
                >
                  <div className="flex items-center space-x-3 overflow-hidden">
                    {avatarContent}
                    <span className="font-medium text-[15px] truncate">{displayName}</span>
                  </div>
                  <button className="hidden group-hover:block text-[#949BA4] hover:text-[#DBDEE1]">
                    <X size={16} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* User Panel */}
      <UserPanel />

      <CreateGroupDMModal 
        isOpen={isCreateGroupModalOpen} 
        onClose={() => setCreateGroupModalOpen(false)} 
      />
    </div>
  );
}

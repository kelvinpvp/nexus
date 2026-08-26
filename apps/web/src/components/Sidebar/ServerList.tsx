import { useAppStore } from '@/store/appStore';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import CreateServerModal from '../Modals/CreateServerModal';

export default function ServerList() {
  const { servers, activeServerId, setActiveServer } = useAppStore();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  return (
    <>
      <div className="w-[76px] bg-[linear-gradient(180deg,#0c1020_0%,#11182e_55%,#0a0f1c_100%)] border-r border-white/5 flex flex-col items-center py-3 space-y-2 flex-shrink-0 z-20 shadow-[inset_-1px_0_0_rgba(255,255,255,0.03)]">
        
        {/* Home Button (Nexus Logo) */}
        <div className="relative group flex justify-center w-full" onClick={() => setActiveServer(null)}>
          <div className={`absolute left-0 w-1 bg-white rounded-r-lg transition-all duration-300 top-1/2 -translate-y-1/2 ${activeServerId === null ? 'h-10 opacity-100' : 'h-2 opacity-0 group-hover:h-5 group-hover:opacity-100'}`}></div>
          <div className={`w-12 h-12 transition-all duration-300 flex items-center justify-center text-white cursor-pointer shadow-lg ${activeServerId === null ? 'bg-gradient-to-br from-cyan-400 via-blue-500 to-violet-500 rounded-[16px]' : 'bg-white/8 rounded-[24px] hover:bg-gradient-to-br hover:from-cyan-400 hover:via-blue-500 hover:to-violet-500 hover:rounded-[16px]'}`}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2L2 22h20L12 2zm0 3.8l6.9 14.2H5.1L12 5.8z"/>
            </svg>
          </div>
        </div>

        <div className="w-8 h-[2px] bg-gradient-to-r from-cyan-400/60 via-white/20 to-violet-400/60 rounded mx-auto my-2"></div>

        {/* Dynamic Servers */}
        {servers.map((server) => {
          const isActive = server.id === activeServerId;
          return (
            <div key={server.id} className="relative group flex justify-center w-full" onClick={() => setActiveServer(server.id)}>
              <div className={`absolute left-0 w-1 bg-white rounded-r-lg transition-all duration-300 top-1/2 -translate-y-1/2 ${isActive ? 'h-10 opacity-100' : 'h-2 opacity-0 group-hover:h-5 group-hover:opacity-100'}`}></div>
              
              <div className={`w-12 h-12 transition-all duration-300 flex items-center justify-center text-white cursor-pointer overflow-hidden shadow-lg ${isActive ? 'bg-gradient-to-br from-cyan-400 via-blue-500 to-violet-500 rounded-[16px]' : 'bg-white/8 rounded-[24px] group-hover:bg-gradient-to-br group-hover:from-cyan-400 group-hover:via-blue-500 group-hover:to-violet-500 group-hover:rounded-[16px]'}`}>
                {server.iconUrl ? (
                  <img src={server.iconUrl} alt={server.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="font-medium text-[15px]">{server.name.charAt(0).toUpperCase()}</span>
                )}
              </div>
            </div>
          );
        })}

        {/* Add Server Button */}
        <div className="relative group flex justify-center w-full mt-2" onClick={() => setIsCreateModalOpen(true)}>
          <div className="absolute left-0 w-1 bg-white rounded-r-lg transition-all duration-300 h-2 top-1/2 -translate-y-1/2 group-hover:h-5 opacity-0 group-hover:opacity-100"></div>
          <div className="w-12 h-12 rounded-[24px] bg-white/8 hover:bg-gradient-to-br hover:from-emerald-400 hover:to-cyan-500 hover:rounded-[16px] transition-all duration-300 flex items-center justify-center text-emerald-300 hover:text-white cursor-pointer shadow-lg">
            <Plus size={24} />
          </div>
        </div>
        
      </div>

      <CreateServerModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} />
    </>
  );
}

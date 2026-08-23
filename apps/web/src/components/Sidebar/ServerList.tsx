import { useAppStore } from '@/store/appStore';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import CreateServerModal from '../Modals/CreateServerModal';

export default function ServerList() {
  const { servers, activeServerId, setActiveServer } = useAppStore();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  return (
    <>
      <div className="w-[72px] bg-[#1E1F22] flex flex-col items-center py-3 space-y-2 flex-shrink-0 z-20">
        
        {/* Home Button (Nexus Logo) */}
        <div className="relative group flex justify-center w-full" onClick={() => setActiveServer(null)}>
          <div className={`absolute left-0 w-1 bg-white rounded-r-lg transition-all duration-300 top-1/2 -translate-y-1/2 ${activeServerId === null ? 'h-10 opacity-100' : 'h-2 opacity-0 group-hover:h-5 group-hover:opacity-100'}`}></div>
          <div className={`w-12 h-12 transition-all duration-300 flex items-center justify-center text-white cursor-pointer ${activeServerId === null ? 'bg-[#5865F2] rounded-[16px]' : 'bg-[#313338] rounded-[24px] hover:bg-[#5865F2] hover:rounded-[16px]'}`}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2L2 22h20L12 2zm0 3.8l6.9 14.2H5.1L12 5.8z"/>
            </svg>
          </div>
        </div>

        <div className="w-8 h-[2px] bg-[#35363C] rounded mx-auto my-2"></div>

        {/* Dynamic Servers */}
        {servers.map((server) => {
          const isActive = server.id === activeServerId;
          return (
            <div key={server.id} className="relative group flex justify-center w-full" onClick={() => setActiveServer(server.id)}>
              <div className={`absolute left-0 w-1 bg-white rounded-r-lg transition-all duration-300 top-1/2 -translate-y-1/2 ${isActive ? 'h-10 opacity-100' : 'h-2 opacity-0 group-hover:h-5 group-hover:opacity-100'}`}></div>
              
              <div className={`w-12 h-12 transition-all duration-300 flex items-center justify-center text-white cursor-pointer overflow-hidden ${isActive ? 'bg-[#5865F2] rounded-[16px]' : 'bg-[#313338] rounded-[24px] group-hover:bg-[#5865F2] group-hover:rounded-[16px]'}`}>
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
          <div className="w-12 h-12 rounded-[24px] bg-[#313338] hover:bg-[#23A559] hover:rounded-[16px] transition-all duration-300 flex items-center justify-center text-[#23A559] hover:text-white cursor-pointer">
            <Plus size={24} />
          </div>
        </div>
        
      </div>

      <CreateServerModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} />
    </>
  );
}

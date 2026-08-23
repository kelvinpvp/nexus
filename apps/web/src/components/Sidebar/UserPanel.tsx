import { Mic, Headphones, Settings } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useState, useRef } from 'react';
import SettingsModal from '@/components/Settings/SettingsModal';
import ProfilePopout from '@/components/Profile/ProfilePopout';

import { useAppStore } from '@/store/appStore';

export default function UserPanel() {
  const { user } = useAuth();
  const { isSettingsModalOpen, setSettingsModalOpen } = useAppStore();
  const [showProfilePopout, setShowProfilePopout] = useState(false);
  const [popoutPos, setPopoutPos] = useState({ bottom: 0, left: 0 });
  const profileContainerRef = useRef<HTMLDivElement>(null);

  if (!user) return null;

  const handleProfileClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (profileContainerRef.current) {
      const rect = profileContainerRef.current.getBoundingClientRect();
      setPopoutPos({
        bottom: window.innerHeight - rect.top + 10,
        left: rect.left
      });
      setShowProfilePopout(prev => !prev);
    }
  };

  return (
    <>
      <div className="h-[52px] bg-[#232428] flex items-center px-2 flex-shrink-0 justify-between">
        <div 
          ref={profileContainerRef}
          onClick={handleProfileClick}
          className="flex items-center hover:bg-[#3F4147] p-1 rounded cursor-pointer transition-colors w-[120px]"
        >
          <div className="w-8 h-8 rounded-full bg-[#5865F2] flex items-center justify-center text-white font-bold text-sm flex-shrink-0 relative">
            {user.avatarUrl ? (
              <img src={user.avatarUrl} alt="Avatar" className="w-full h-full rounded-full object-cover" />
            ) : (
              user.username.charAt(0).toUpperCase()
            )}
            <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-[#23A559] rounded-full border-2 border-[#232428]"></div>
          </div>
          <div className="ml-2 truncate flex-1">
            <div className="text-[13px] font-bold text-white truncate leading-tight">{user.username}</div>
            <div className="text-[11px] text-[#949BA4] truncate leading-tight">Online</div>
          </div>
        </div>
        
        <div className="flex text-[#B5BAC1]">
          <button className="w-8 h-8 flex items-center justify-center hover:bg-[#3F4147] rounded hover:text-[#DBDEE1] transition-colors" title="Configurações de Áudio">
            <Mic size={20} />
          </button>
          <button className="w-8 h-8 flex items-center justify-center hover:bg-[#3F4147] rounded hover:text-[#DBDEE1] transition-colors" title="Configurações">
            <Headphones size={20} />
          </button>
          <button 
            onClick={() => setSettingsModalOpen(true)} 
            className="w-8 h-8 flex items-center justify-center hover:bg-[#3F4147] rounded hover:text-[#DBDEE1] transition-colors" 
            title="Configurações de Usuário"
          >
            <Settings size={18} />
          </button>
        </div>
      </div>

      {isSettingsModalOpen && (
        <SettingsModal onClose={() => setSettingsModalOpen(false)} initialTab="account" />
      )}

      {showProfilePopout && (
        <ProfilePopout 
          userId={user.id} 
          position={popoutPos} 
          onClose={() => setShowProfilePopout(false)} 
        />
      )}
    </>
  );
}

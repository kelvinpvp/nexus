import { Mic, Headphones, Settings } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useState, useRef } from 'react';
import SettingsModal from '@/components/Settings/SettingsModal';
import ProfilePopout from '@/components/Profile/ProfilePopout';

import { useAppStore } from '@/store/appStore';

export default function UserPanel() {
  const { user } = useAuth();
  const { isSettingsModalOpen, setSettingsModalOpen } = useAppStore();
  const [settingsTab, setSettingsTab] = useState<'account' | 'voice'>('account');
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
      <div className="h-[56px] bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))] border-t border-white/5 flex items-center px-2 flex-shrink-0 justify-between backdrop-blur-md">
        <div 
          ref={profileContainerRef}
          onClick={handleProfileClick}
          className="flex items-center hover:bg-white/6 p-1 rounded-2xl cursor-pointer transition-colors w-[124px]"
        >
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-400 via-blue-500 to-violet-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0 relative shadow-lg">
            {user.avatarUrl ? (
              <img src={user.avatarUrl} alt="Avatar" className="w-full h-full rounded-full object-cover" />
            ) : (
              user.username.charAt(0).toUpperCase()
            )}
            <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-400 rounded-full border-2 border-[#0b1020]"></div>
          </div>
          <div className="ml-2 truncate flex-1">
            <div className="text-[13px] font-bold text-white truncate leading-tight">{user.username}</div>
            <div className="text-[11px] text-[#949BA4] truncate leading-tight">Online</div>
          </div>
        </div>
        
        <div className="flex text-[#B5BAC1]">
          <button 
            onClick={() => {
              setSettingsTab('voice');
              setSettingsModalOpen(true);
            }} 
            className="w-8 h-8 flex items-center justify-center hover:bg-white/6 rounded-full hover:text-white transition-colors" 
            title="Mudar para Mudo (Voz)"
          >
            <Mic size={20} />
          </button>
          <button 
            onClick={() => {
              setSettingsTab('voice');
              setSettingsModalOpen(true);
            }} 
            className="w-8 h-8 flex items-center justify-center hover:bg-white/6 rounded-full hover:text-white transition-colors" 
            title="Ensurdecer (Áudio)"
          >
            <Headphones size={20} />
          </button>
          <button 
            onClick={() => {
              setSettingsTab('account');
              setSettingsModalOpen(true);
            }} 
            className="w-8 h-8 flex items-center justify-center hover:bg-white/6 rounded-full hover:text-white transition-colors" 
            title="Configurações de Usuário"
          >
            <Settings size={18} />
          </button>
        </div>
      </div>

      {isSettingsModalOpen && (
        <SettingsModal onClose={() => setSettingsModalOpen(false)} initialTab={settingsTab} />
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

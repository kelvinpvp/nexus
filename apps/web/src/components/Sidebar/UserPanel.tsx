import { Mic, Headphones, Settings, ChevronDown, Circle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useState, useRef } from 'react';
import SettingsModal from '@/components/Settings/SettingsModal';
import ProfilePopout from '@/components/Profile/ProfilePopout';
import { apiFetch } from '@/lib/api';

import { useAppStore } from '@/store/appStore';

export default function UserPanel() {
  const { user, setUser } = useAuth();
  const { isSettingsModalOpen, setSettingsModalOpen } = useAppStore();
  const [settingsTab, setSettingsTab] = useState<'account' | 'voice'>('account');
  const [showProfilePopout, setShowProfilePopout] = useState(false);
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [popoutPos, setPopoutPos] = useState({ bottom: 0, left: 0 });
  const profileContainerRef = useRef<HTMLDivElement>(null);

  if (!user) return null;

  const currentStatus = (user.status || 'ONLINE').toUpperCase();
  const statusLabelMap: Record<string, string> = {
    ONLINE: 'Online',
    IDLE: 'Ausente',
    DND: 'Não perturbe',
    INVISIBLE: 'Invisível',
    OFFLINE: 'Offline',
  };

  const statusColorMap: Record<string, string> = {
    ONLINE: 'bg-emerald-400',
    IDLE: 'bg-amber-400',
    DND: 'bg-rose-500',
    INVISIBLE: 'bg-slate-500',
    OFFLINE: 'bg-slate-500',
  };

  const setPresenceStatus = async (status: string) => {
    try {
      const updated = await apiFetch('/api/users/me/status', {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      setUser((current) => current ? { ...current, status: updated.status } : updated);
      setShowStatusMenu(false);
    } catch (error) {
      console.error('Failed to update status', error);
    }
  };

  const handleProfileClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (profileContainerRef.current) {
      const rect = profileContainerRef.current.getBoundingClientRect();
      setPopoutPos({
        bottom: window.innerHeight - rect.top + 10,
        left: rect.left
      });
      setShowProfilePopout(prev => !prev);
      setShowStatusMenu(false);
    }
  };

  const handleStatusClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowStatusMenu((v) => !v);
    setShowProfilePopout(false);
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
          </div>
          <div className="ml-2 truncate flex-1">
            <div className="text-[13px] font-bold text-white truncate leading-tight">{user.username}</div>
            <div className="text-[11px] text-slate-400 truncate leading-tight">{statusLabelMap[currentStatus] || 'Online'}</div>
          </div>
          <button
            type="button"
            onClick={handleStatusClick}
            className="relative ml-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full"
            title="Alterar status"
          >
            <span className={`h-3.5 w-3.5 rounded-full border-2 border-[#0b1020] ${statusColorMap[currentStatus]} shadow-sm`} />
          </button>
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

      {showStatusMenu && (
        <div className="fixed left-2 bottom-[72px] z-[120] w-56 overflow-hidden rounded-2xl border border-white/10 bg-[#0D1630] shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
          {(['ONLINE', 'IDLE', 'DND', 'INVISIBLE', 'OFFLINE'] as const).map((status) => (
            <button
              key={status}
              onClick={() => void setPresenceStatus(status)}
              className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-slate-200 hover:bg-white/6"
            >
              <Circle size={10} className={`fill-current ${statusColorMap[status]} text-current`} />
              <span>{statusLabelMap[status]}</span>
              {currentStatus === status && <span className="ml-auto text-xs text-cyan-300">Ativo</span>}
            </button>
          ))}
        </div>
      )}
    </>
  );
}

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { User, Copy, Edit2, UserPlus, Check, X, MessageSquare, Ban, Unlock } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useFriendStore } from '@/store/friendStore';
import { useAppStore } from '@/store/appStore';
import { apiFetch } from '@/lib/api';

interface ProfilePopoutProps {
  userId: string;
  position: { top?: number; bottom?: number; left: number };
  onClose: () => void;
}

export default function ProfilePopout({ userId, position, onClose }: ProfilePopoutProps) {
  const { user, setUser } = useAuth();
  const friendStore = useFriendStore();
  const popoutRef = useRef<HTMLDivElement>(null);
  const [profileData, setProfileData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const isCurrentUser = user?.id === userId;

  useEffect(() => {
    if (isCurrentUser) {
      setProfileData(user);
      setIsLoading(false);
      return;
    }

    const fetchUser = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/users/${userId}`, {
          credentials: 'include'
        });
        if (res.ok) {
          const data = await res.json();
          setProfileData(data);
        } else {
          setError('Usuário não encontrado');
        }
      } catch (e) {
        setError('Erro ao carregar perfil');
      } finally {
        setIsLoading(false);
      }
    };
    fetchUser();
  }, [userId, isCurrentUser, user]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoutRef.current && !popoutRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  if (!profileData && !isLoading) return null;

  // Relation checks
  const isFriend = friendStore.friends.some(f => f.id === userId);
  const sentRequest = friendStore.sentRequests.find(r => r.receiverId === userId);
  const receivedRequest = friendStore.receivedRequests.find(r => r.senderId === userId);
  const isBlocked = friendStore.blocks.some(b => b.blockedId === userId);

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'ONLINE': return 'bg-[#23A559]';
      case 'IDLE': return 'bg-[#F0B232]';
      case 'DND': return 'bg-[#F23F43]';
      case 'OFFLINE': 
      case 'INVISIBLE': 
      default: return 'bg-[#80848E]';
    }
  };

  const cycleStatus = async () => {
    if (!isCurrentUser) return;
    const order = ['ONLINE', 'IDLE', 'DND', 'INVISIBLE'] as const;
    const current = (profileData?.status || user?.status || 'ONLINE').toUpperCase();
    const next = order[(Math.max(0, order.indexOf(current as any)) + 1) % order.length];
    try {
      const updated = await apiFetch('/api/users/me/status', {
        method: 'PATCH',
        body: JSON.stringify({ status: next }),
      });
      setProfileData(updated);
      setUser((currentUser) => currentUser ? { ...currentUser, status: updated.status } : updated);
    } catch (error) {
      console.error('Failed to cycle status', error);
    }
  };

  const popoutContent = (
    <div 
      ref={popoutRef}
      className="fixed z-[100] w-[340px] rounded-3xl shadow-[0_24px_80px_rgba(0,0,0,0.45)] overflow-hidden animate-in zoom-in-95 duration-100 border border-white/8 bg-[linear-gradient(180deg,#0c1426_0%,#0b1020_100%)]"
      style={{
        ...(position.top !== undefined ? { top: Math.min(position.top, window.innerHeight - 380) } : { bottom: position.bottom }),
        left: Math.min(position.left, window.innerWidth - 360),
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {isLoading ? (
        <div className="h-64 flex items-center justify-center text-slate-300">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-300"></div>
        </div>
      ) : error ? (
          <div className="h-32 flex items-center justify-center text-rose-300 font-medium">{error}</div>
      ) : (
        <>
          {/* Banner */}
          <div className="h-[120px] bg-gradient-to-r from-cyan-400 via-blue-500 to-violet-500 w-full relative">
            {profileData.bannerUrl && (
              <img src={profileData.bannerUrl} alt="Banner" className="w-full h-full object-cover" />
            )}
          </div>

          <div className="px-4 pb-4 relative pt-7">
            {/* Avatar */}
            <div className="w-[80px] h-[80px] rounded-full border-[6px] border-[#0b1020] bg-[#0f172a] flex items-center justify-center overflow-hidden absolute -top-10 left-4 shadow-lg relative">
              {profileData.avatarUrl ? (
                <img src={profileData.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <span className="text-3xl font-bold text-white">
                  {profileData.displayName?.charAt(0) || profileData.username.charAt(0).toUpperCase()}
                </span>
              )}
              <button
                type="button"
                onClick={async (e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  await cycleStatus();
                }}
                className="absolute -bottom-0.5 -right-0.5 z-20 flex h-5 w-5 items-center justify-center"
                aria-label="Alterar status"
                title="Alterar status"
              >
                <span className={`h-4 w-4 rounded-full border-[3px] border-[#0b1020] ${getStatusColor(profileData.status || 'ONLINE')} shadow-md`} />
              </button>
            </div>

            {/* Buttons (Right aligned) */}
            <div className="flex justify-end pt-3 pb-2 h-12 space-x-2">
              {isCurrentUser ? (
                <button 
                  onClick={() => {
                    useAppStore.getState().setSettingsModalOpen(true);
                    onClose();
                  }}
                className="bg-white/8 hover:bg-white/15 px-3 py-1 rounded-full text-[13px] font-medium text-white transition-colors h-7 flex items-center"
                >
                  <Edit2 size={14} className="mr-1.5" />
                  Editar Perfil
                </button>
              ) : (
                <>
                  {isBlocked ? (
                    <button 
                      onClick={() => friendStore.unblockUser(userId)}
                      className="bg-[#4E5058] hover:bg-[#6D6F78] px-3 py-1 rounded text-[13px] font-medium text-white transition-colors h-7 flex items-center"
                    >
                      <Unlock size={14} className="mr-1.5" /> Desbloquear
                    </button>
                  ) : (
                    <>
                      {isFriend ? (
                        <button 
                          onClick={async () => {
                            try {
                              const dmStore = (await import('@/store/dmStore')).useDMStore;
                              const appStore = (await import('@/store/appStore')).useAppStore;
                              await dmStore.getState().openConversationWith(userId);
                              appStore.getState().setActiveServer(null);
                              onClose();
                            } catch (e) {}
                          }}
                          className="bg-[#4E5058] hover:bg-[#6D6F78] px-3 py-1 rounded text-[13px] font-medium text-white transition-colors h-7 flex items-center" 
                          title="Enviar Mensagem"
                        >
                          <MessageSquare size={14} />
                        </button>
                      ) : receivedRequest ? (
                        <button 
                          onClick={() => friendStore.acceptFriendRequest(receivedRequest.id)}
                          className="bg-[#23A559] hover:bg-[#1F924E] px-3 py-1 rounded text-[13px] font-medium text-white transition-colors h-7 flex items-center"
                        >
                          <Check size={14} className="mr-1.5" /> Aceitar
                        </button>
                      ) : sentRequest ? (
                        <button 
                          onClick={() => friendStore.cancelFriendRequest(sentRequest.id)}
                          className="bg-[#4E5058] hover:bg-[#6D6F78] px-3 py-1 rounded text-[13px] font-medium text-white transition-colors h-7 flex items-center"
                        >
                          <X size={14} className="mr-1.5" /> Cancelar Pedido
                        </button>
                      ) : (
                        <button 
                          onClick={() => friendStore.sendFriendRequest(profileData.username)}
                          className="bg-[#5865F2] hover:bg-[#4752C4] px-3 py-1 rounded text-[13px] font-medium text-white transition-colors h-7 flex items-center"
                        >
                          <UserPlus size={14} className="mr-1.5" /> Adicionar Amigo
                        </button>
                      )}
                    </>
                  )}
                </>
              )}
            </div>

            {/* User Info */}
        <div className="bg-[#0b1020] mt-2">
              <h2 className="text-xl font-bold text-white leading-tight">
                {profileData.displayName || profileData.username}
              </h2>
          <p className="text-[14px] text-slate-200">@{profileData.username}</p>
            </div>

            {/* Custom Status */}
            {profileData.customStatus && (
              <div className="mt-3 text-[14px] text-white flex items-center">
                <span className="mr-2">💭</span> {profileData.customStatus}
              </div>
            )}

            {/* Divider */}
        <div className="h-px bg-white/8 my-3 w-full" />

            {/* Bio Section */}
            <div className="mb-3">
              <h3 className="text-xs font-bold uppercase text-slate-100 mb-1">Sobre Mim</h3>
              <p className="text-[14px] text-slate-300 whitespace-pre-wrap">
                 {profileData.bio || 'Membro da comunidade Nexus!'}
              </p>
            </div>

            {/* ID Section */}
        <div className="h-px bg-white/8 my-3 w-full" />
            <div className="flex flex-col space-y-1">
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(profileData.id);
                }}
                className="w-full text-left px-2 py-1.5 hover:bg-[#35373C] text-[#DBDEE1] rounded text-[13px] flex items-center transition-colors"
              >
                <Copy size={16} className="mr-2" />
                Copiar ID do Usuário
              </button>
              
              {!isCurrentUser && !isBlocked && (
                <button 
                  onClick={() => friendStore.blockUser(userId)}
                  className="w-full text-left px-2 py-1.5 hover:bg-[#F23F43]/10 text-[#F23F43] rounded text-[13px] flex items-center transition-colors"
                >
                  <Ban size={16} className="mr-2" />
                  Bloquear Usuário
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );

  return createPortal(popoutContent, document.body);
}

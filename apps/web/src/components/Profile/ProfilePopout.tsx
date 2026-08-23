import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { User, Copy, Edit2, UserPlus, Check, X, MessageSquare, Ban, Unlock } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useFriendStore } from '@/store/friendStore';
import { useAppStore } from '@/store/appStore';

interface ProfilePopoutProps {
  userId: string;
  position: { top?: number; bottom?: number; left: number };
  onClose: () => void;
}

export default function ProfilePopout({ userId, position, onClose }: ProfilePopoutProps) {
  const { user } = useAuth();
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

  const popoutContent = (
    <div 
      ref={popoutRef}
      className="fixed z-[100] w-[340px] bg-[#111214] rounded-lg shadow-xl overflow-hidden animate-in zoom-in-95 duration-100"
      style={{
        ...(position.top !== undefined ? { top: Math.min(position.top, window.innerHeight - 380) } : { bottom: position.bottom }),
        left: Math.min(position.left, window.innerWidth - 360),
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {isLoading ? (
        <div className="h-64 flex items-center justify-center text-[#949BA4]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#5865F2]"></div>
        </div>
      ) : error ? (
        <div className="h-32 flex items-center justify-center text-[#F23F43] font-medium">{error}</div>
      ) : (
        <>
          {/* Banner */}
          <div className="h-[120px] bg-[#5865F2] w-full relative">
            {profileData.bannerUrl && (
              <img src={profileData.bannerUrl} alt="Banner" className="w-full h-full object-cover" />
            )}
          </div>

          <div className="px-4 pb-4 relative">
            {/* Avatar */}
            <div className="w-[80px] h-[80px] rounded-full border-[6px] border-[#111214] bg-[#313338] flex items-center justify-center overflow-hidden absolute -top-10 left-4">
              {profileData.avatarUrl ? (
                <img src={profileData.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <span className="text-3xl font-bold text-white">
                  {profileData.displayName?.charAt(0) || profileData.username.charAt(0).toUpperCase()}
                </span>
              )}
              {/* Status badge */}
              <div className={`absolute bottom-0 right-0 w-5 h-5 rounded-full border-[3px] border-[#111214] ${getStatusColor(profileData.status || 'ONLINE')}`}></div>
            </div>

            {/* Buttons (Right aligned) */}
            <div className="flex justify-end pt-3 pb-2 h-12 space-x-2">
              {isCurrentUser ? (
                <button 
                  onClick={() => {
                    useAppStore.getState().setSettingsModalOpen(true);
                    onClose();
                  }}
                  className="bg-[#4E5058] hover:bg-[#6D6F78] px-3 py-1 rounded text-[13px] font-medium text-white transition-colors h-7 flex items-center"
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
            <div className="bg-[#111214] mt-2">
              <h2 className="text-xl font-bold text-white leading-tight">
                {profileData.displayName || profileData.username}
              </h2>
              <p className="text-[14px] text-[#DBDEE1]">@{profileData.username}</p>
            </div>

            {/* Custom Status */}
            {profileData.customStatus && (
              <div className="mt-3 text-[14px] text-white flex items-center">
                <span className="mr-2">💭</span> {profileData.customStatus}
              </div>
            )}

            {/* Divider */}
            <div className="h-px bg-[#3F4147] my-3 w-full" />

            {/* Bio Section */}
            <div className="mb-3">
              <h3 className="text-xs font-bold uppercase text-[#F2F3F5] mb-1">Sobre Mim</h3>
              <p className="text-[14px] text-[#DBDEE1] whitespace-pre-wrap">
                 {profileData.bio || 'Membro da comunidade Nexus!'}
              </p>
            </div>

            {/* ID Section */}
            <div className="h-px bg-[#3F4147] my-3 w-full" />
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

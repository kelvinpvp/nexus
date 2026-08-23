import { useState, useRef, useEffect } from 'react';
import { useDMStore } from '@/store/dmStore';
import { useAuth } from '@/contexts/AuthContext';
import { useCallStore } from '@/store/callStore';
import { Phone, Video, Hash, Users, Smile, LogOut, UserPlus } from 'lucide-react';
import EmojiPicker, { Theme, EmojiClickData } from 'emoji-picker-react';
import ProfilePopout from '../Profile/ProfilePopout';
import GiphyPicker from '../Chat/GiphyPicker';

export default function DMArea() {
  const { activeConversationId, conversations, messages, sendMessage, isLoadingMessages, leaveGroup } = useDMStore();
  const { user } = useAuth();
  const { initiateCall, checkActiveCall, activeGroupCalls, joinActiveCall, activeCall } = useCallStore();
  const [content, setContent] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [isCalling, setIsCalling] = useState<'VOICE' | 'VIDEO' | null>(null);
  const [isLeaving, setIsLeaving] = useState(false);
  const [selectedUserPopout, setSelectedUserPopout] = useState<{ userId: string; top: number; left: number } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeConversationId) {
      checkActiveCall(activeConversationId);
    }
  }, [activeConversationId, checkActiveCall]);

  const handleUserClick = (e: React.MouseEvent, authorId: string) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    setSelectedUserPopout({
      userId: authorId,
      top: rect.bottom + 5,
      left: rect.left,
    });
  };

  const handleSendGif = async (gifUrl: string) => {
    if (!activeConversationId) return;
    try {
      await sendMessage(activeConversationId, gifUrl);
    } catch (err) {
      console.error('Error sending GIF in DM:', err);
    }
  };

  const conversation = conversations.find(c => c.id === activeConversationId);
  const currentMessages = activeConversationId ? messages[activeConversationId] || [] : [];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentMessages]);

  if (!conversation) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-[#313338] text-[#949BA4]">
        Selecione uma conversa.
      </div>
    );
  }

  const isGroup = conversation.type === 'GROUP';
  const friend = conversation.recipient; // Only for DIRECT
  
  let displayName = '';
  let avatarContent = null;
  let statusContent = null;

  if (!isGroup && friend) {
    displayName = friend.displayName || friend.username;
    avatarContent = (
      <div className="w-[80px] h-[80px] rounded-full bg-[#5865F2] flex items-center justify-center text-white text-3xl font-bold mb-4 shrink-0">
        {friend.avatarUrl ? <img src={friend.avatarUrl} alt="" className="w-full h-full rounded-full object-cover"/> : friend.username.charAt(0).toUpperCase()}
      </div>
    );
    statusContent = (
      <>
        {friend.status === 'ONLINE' && <span className="w-2 h-2 rounded-full bg-[#23A559] ml-2"></span>}
        {friend.status === 'IDLE' && <span className="w-2 h-2 rounded-full bg-[#F0B232] ml-2"></span>}
        {friend.status === 'DND' && <span className="w-2 h-2 rounded-full bg-[#F23F43] ml-2"></span>}
      </>
    );
  } else if (isGroup) {
    displayName = conversation.name || conversation.participants.map(p => p.username).join(', ');
    if (!displayName) displayName = 'Grupo Desconhecido';
    
    avatarContent = (
      <div className="w-[80px] h-[80px] rounded-full bg-[#2B2D31] flex items-center justify-center text-[#DBDEE1] shrink-0 overflow-hidden mb-4">
        {conversation.iconUrl ? (
          <img src={conversation.iconUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <Users size={40} />
        )}
      </div>
    );
  } else {
    return null; // DIRECT without recipient somehow
  }

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || !activeConversationId) return;

    const text = content.trim();
    setContent('');
    try {
      await sendMessage(activeConversationId, text);
    } catch (error) {
      setContent(text);
      console.error(error);
    }
  };

  const handleLeaveGroup = async () => {
    if (!confirm('Tem certeza que deseja sair deste grupo?')) return;
    setIsLeaving(true);
    try {
      await leaveGroup(conversation.id);
    } catch (err) {
      console.error(err);
      alert('Erro ao sair do grupo');
    } finally {
      setIsLeaving(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-[#313338] h-full">
      {/* Top Bar */}
      <div className="h-12 border-b border-[#1F2023] flex items-center justify-between px-4 shrink-0 shadow-sm">
        <div className="flex items-center text-white space-x-2">
          {isGroup ? <Users size={24} className="text-[#80848E]" /> : <Hash size={24} className="text-[#80848E]" />}
          <span className="font-bold text-[15px] truncate max-w-[400px]">{displayName}</span>
          {statusContent}
        </div>

        {/* Active Call Banner */}
        {activeConversationId && activeGroupCalls[activeConversationId] && activeGroupCalls[activeConversationId].participantCount > 0 && (
          <div className="flex items-center bg-[#23A559]/20 border border-[#23A559]/50 px-3 py-1 rounded-full text-xs text-[#23A559] font-bold space-x-2">
            <span className="w-2 h-2 rounded-full bg-[#23A559] animate-pulse" />
            <span>
              Chamada em andamento — {activeGroupCalls[activeConversationId].participantCount}{' '}
              {activeGroupCalls[activeConversationId].participantCount === 1 ? 'participante' : 'participantes'}
            </span>
            {activeCall?.conversationId !== activeConversationId && (
              <button
                onClick={() => joinActiveCall(activeGroupCalls[activeConversationId].call)}
                className="bg-[#23A559] hover:bg-[#1F924E] text-white px-2.5 py-0.5 rounded text-xs font-bold transition-colors ml-2"
              >
                Entrar
              </button>
            )}
          </div>
        )}
        
        <div className="flex items-center space-x-4 text-[#B5BAC1]">
          {isGroup && (
            <button 
              onClick={handleLeaveGroup}
              disabled={isLeaving}
              className={`transition-colors ${isLeaving ? 'text-[#949BA4] cursor-not-allowed' : 'hover:text-[#F23F43]'}`}
              title="Sair do Grupo"
            >
              <LogOut size={20} />
            </button>
          )}

          <button 
            onClick={async () => {
              if (!activeConversationId || isCalling) return;
              if (activeGroupCalls[activeConversationId]) {
                await joinActiveCall(activeGroupCalls[activeConversationId].call);
                return;
              }
              setIsCalling('VOICE');
              try { await initiateCall(activeConversationId, 'VOICE'); }
              catch (e) { console.error(e); }
              finally { setIsCalling(null); }
            }}
            disabled={!!isCalling}
            className={`transition-colors ${isCalling ? 'text-[#949BA4] cursor-not-allowed' : 'hover:text-[#DBDEE1]'}`}
            title={activeConversationId && activeGroupCalls[activeConversationId] ? "Entrar na Chamada Existente" : "Iniciar Chamada de Voz"}
          >
            {isCalling === 'VOICE' 
              ? <div className="w-6 h-6 border-2 border-[#B5BAC1] border-t-transparent rounded-full animate-spin" />
              : <Phone size={24} />}
          </button>
          <button 
            onClick={async () => {
              if (!activeConversationId || isCalling) return;
              if (activeGroupCalls[activeConversationId]) {
                await joinActiveCall(activeGroupCalls[activeConversationId].call);
                return;
              }
              setIsCalling('VIDEO');
              try { await initiateCall(activeConversationId, 'VIDEO'); }
              catch (e) { console.error(e); }
              finally { setIsCalling(null); }
            }}
            disabled={!!isCalling}
            className={`transition-colors ${isCalling ? 'text-[#949BA4] cursor-not-allowed' : 'hover:text-[#DBDEE1]'}`}
            title={activeConversationId && activeGroupCalls[activeConversationId] ? "Entrar na Chamada Existente" : "Iniciar Chamada de Vídeo"}
          >
            {isCalling === 'VIDEO'
              ? <div className="w-6 h-6 border-2 border-[#B5BAC1] border-t-transparent rounded-full animate-spin" />
              : <Video size={24} />}
          </button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar flex flex-col">
        {isLoadingMessages ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#5865F2]"></div>
          </div>
        ) : (
          <>
            <div className="mt-auto">
              <div className="mb-8">
                {avatarContent}
                <h1 className="text-white text-3xl font-bold mb-2 break-words">{displayName}</h1>
                {!isGroup && friend && <h2 className="text-[#DBDEE1] text-lg font-medium mb-1">{friend.username}</h2>}
                <p className="text-[#949BA4] text-[15px]">
                  {isGroup ? 'Este é o começo do seu histórico de mensagens com este grupo.' : `Este é o começo do seu histórico de mensagens diretas com @${friend?.username}.`}
                </p>
              </div>

              <div className="flex flex-col space-y-4">
                {currentMessages.map((msg, idx) => {
                  const showHeader = idx === 0 || 
                    currentMessages[idx - 1].authorId !== msg.authorId || 
                    (new Date(msg.createdAt).getTime() - new Date(currentMessages[idx - 1].createdAt).getTime() > 5 * 60 * 1000);

                  return (
                    <div key={msg.id} className={`flex items-start group hover:bg-[#2E3035] -mx-4 px-4 py-0.5 ${showHeader ? 'mt-4' : 'mt-0'}`}>
                      {showHeader ? (
                        <div 
                          onClick={(e) => handleUserClick(e, msg.authorId)}
                          className="w-10 h-10 rounded-full bg-[#5865F2] shrink-0 mr-4 mt-0.5 flex items-center justify-center text-white font-bold cursor-pointer hover:opacity-80 transition-opacity"
                        >
                          {msg.author.avatarUrl ? <img src={msg.author.avatarUrl} alt="" className="w-full h-full rounded-full object-cover"/> : msg.author.username.charAt(0).toUpperCase()}
                        </div>
                      ) : (
                        <div className="w-10 mr-4 shrink-0 opacity-0 group-hover:opacity-100 text-[10px] text-[#949BA4] text-right mt-1 cursor-default">
                          {new Date(msg.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      )}
                      
                      <div className="flex-1 min-w-0">
                        {showHeader && (
                          <div className="flex items-baseline mb-1">
                            <span 
                              onClick={(e) => handleUserClick(e, msg.authorId)}
                              className="font-medium text-[#F2F3F5] mr-2 cursor-pointer hover:underline text-[15px]"
                            >
                              {msg.author.displayName || msg.author.username}
                            </span>
                            <span className="text-xs text-[#949BA4] font-medium">
                              {new Date(msg.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })} às {new Date(msg.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        )}
                        <div className="text-[#DBDEE1] text-[15px] whitespace-pre-wrap leading-[1.375rem] break-words font-normal">
                          {msg.content.match(/^https?:\/\/.+\.(gif|png|jpg|jpeg|webp)($|\?)/i) || msg.content.includes('media.giphy.com') || msg.content.includes('giphy.com/media') ? (
                            <div className="mt-1 max-w-sm rounded-lg overflow-hidden border border-[#1E1F22]">
                              <img src={msg.content} alt="GIF/Imagem" className="w-full max-h-72 object-contain bg-black/20" />
                            </div>
                          ) : (
                            msg.content
                          )}
                          {msg.isEdited && <span className="text-[11px] text-[#949BA4] ml-1">(editado)</span>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input Area */}
      <div className="px-4 pb-6 pt-2 shrink-0">
        <form onSubmit={handleSend} className="bg-[#383A40] rounded-lg flex flex-col px-4 py-2.5">
          <div className="flex items-start">
            <textarea 
              value={content}
              onChange={e => setContent(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend(e);
                }
              }}
              placeholder={isGroup ? `Conversar em ${displayName}` : `Conversar em @${friend?.username}`}
              className="bg-transparent text-[#DBDEE1] placeholder-[#949BA4] focus:outline-none flex-1 resize-none overflow-y-auto max-h-[50vh] min-h-[44px] px-3 py-1.5 custom-scrollbar text-[15px]"
              rows={1}
            />
            <div className="flex items-center space-x-2 shrink-0 ml-2 relative">
              <button 
                type="button" 
                onClick={() => {
                  setShowGifPicker(!showGifPicker);
                  setShowEmojiPicker(false);
                }}
                className="text-xs font-bold bg-[#4E5058] hover:bg-[#6D6F78] text-white px-2 py-1 rounded transition-colors"
              >
                GIF
              </button>

              <button 
                type="button" 
                onClick={() => {
                  setShowEmojiPicker(!showEmojiPicker);
                  setShowGifPicker(false);
                }}
                className="text-[#B5BAC1] hover:text-[#DBDEE1] p-1 transition-colors"
              >
                <Smile size={24} />
              </button>
              
              {showGifPicker && (
                <div className="absolute bottom-12 right-0 z-50">
                  <GiphyPicker
                    onSelectGif={(gifUrl) => {
                      handleSendGif(gifUrl);
                      setShowGifPicker(false);
                    }}
                    onClose={() => setShowGifPicker(false)}
                  />
                </div>
              )}

              {showEmojiPicker && (
                <div className="absolute bottom-12 right-0 z-50">
                  <EmojiPicker
                    theme={Theme.DARK}
                    onEmojiClick={(emoji: EmojiClickData) => {
                      setContent(prev => prev + emoji.emoji);
                      setShowEmojiPicker(false);
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        </form>
      </div>

      {selectedUserPopout && (
        <ProfilePopout 
          userId={selectedUserPopout.userId} 
          position={{ top: selectedUserPopout.top, left: selectedUserPopout.left }} 
          onClose={() => setSelectedUserPopout(null)} 
        />
      )}
    </div>
  );
}

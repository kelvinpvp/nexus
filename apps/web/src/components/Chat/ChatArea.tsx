import { useAppStore } from '@/store/appStore';
import { useAuth } from '@/contexts/AuthContext';
import { Hash, Users } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { socket } from '@/lib/socket';
import { apiFetch } from '@/lib/api';
import VoiceRoom from '../Voice/VoiceRoom';
import MessageInput from './MessageInput';
import AttachmentViewer from './AttachmentViewer';

import ProfilePopout from '../Profile/ProfilePopout';
import ServerMemberList from '../Server/ServerMemberList';

interface Message {
  id: string;
  content: string;
  createdAt: string;
  author: {
    id: string;
    username: string;
    avatarUrl: string | null;
  };
  attachments?: any[];
}

export default function ChatArea() {
  const { servers, activeServerId, activeChannelId } = useAppStore();
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [showMembersList, setShowMembersList] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedUserPopout, setSelectedUserPopout] = useState<{ userId: string; top: number; left: number } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
    if (!activeChannelId) return;
    try {
      await apiFetch(`/api/channels/${activeChannelId}/messages`, {
        method: 'POST',
        body: JSON.stringify({ content: gifUrl }),
      });
    } catch (err) {
      console.error('Error sending GIF:', err);
    }
  };

  const activeServer = servers.find(s => s.id === activeServerId);
  const activeChannel = activeServer?.categories?.flatMap(c => c.channels).find(ch => ch.id === activeChannelId);

  // Fetch messages when channel changes
  useEffect(() => {
    if (!activeChannelId) return;

    const fetchMessages = async () => {
      setIsLoading(true);
      try {
        const data = await apiFetch(`/api/channels/${activeChannelId}/messages`);
        setMessages(data.reverse()); // Assume API returns latest first, we want oldest at top
      } catch (error) {
        console.error('Failed to fetch messages:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMessages();
  }, [activeChannelId]);

  // Socket.IO real-time events
  useEffect(() => {
    if (!activeChannelId) return;

    socket.connect();
    socket.emit('join_channel', activeChannelId);

    const handleNewMessage = (message: Message) => {
      setMessages(prev => [...prev, message]);
    };

    socket.on('new_message', handleNewMessage);

    return () => {
      socket.off('new_message', handleNewMessage);
      socket.emit('leave_channel', activeChannelId);
    };
  }, [activeChannelId]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || !activeChannelId) return;

    const content = inputValue.trim();
    setInputValue(''); // Optimistic clear

    try {
      // We can use REST to send message, which then triggers Socket broadcast from backend
      await apiFetch(`/api/channels/${activeChannelId}/messages`, {
        method: 'POST',
        body: JSON.stringify({ content }),
      });
    } catch (error) {
      console.error('Failed to send message:', error);
      // Revert on failure (could be improved)
      setInputValue(content);
    }
  };

  if (!activeChannel) {
    return (
      <div className="flex-1 bg-[#313338] flex flex-col items-center justify-center text-[#949BA4]">
        <Hash size={48} className="mb-4 opacity-20" />
        <p className="text-lg">Selecione um canal de texto para começar a conversar.</p>
      </div>
    );
  }

  if (activeChannel.type === 'VOICE' || activeChannel.type === 'STAGE') {
    return null; // Handled globally by ServerVoiceManager to keep connection alive when viewing text channels
  }

  return (
    <div className="flex-1 bg-[#313338] flex h-full min-w-0">
      {/* Main Chat Column */}
      <div className="flex-1 flex flex-col h-full min-w-0">
        {/* Header */}
        <header className="h-12 border-b border-[#1F2023] flex items-center justify-between px-4 shadow-sm flex-shrink-0">
          <div className="flex items-center">
            <Hash size={24} className="text-[#80848E] mr-2" />
            <h2 className="font-bold text-white text-[15px]">{activeChannel.name}</h2>
          </div>
          <div className="flex items-center space-x-3 text-[#B5BAC1]">
            <button
              onClick={() => setShowMembersList(!showMembersList)}
              className={`p-1 rounded hover:text-[#DBDEE1] hover:bg-[#35373C] transition-colors ${showMembersList ? 'text-white bg-[#35373C]' : ''}`}
              title="Lista de Membros"
            >
              <Users size={20} />
            </button>
          </div>
        </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 flex flex-col">
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#5865F2]"></div>
          </div>
        ) : (
          <>
            <div className="mt-auto flex flex-col justify-end pt-10 pb-4">
              <div className="mb-4">
                <div className="w-[68px] h-[68px] bg-[#41434A] rounded-full flex items-center justify-center mb-4">
                  <Hash size={40} className="text-white" />
                </div>
                <h1 className="text-3xl font-bold text-white mb-2">Bem-vindo ao #{activeChannel.name}!</h1>
                <p className="text-[#949BA4]">Este é o começo do canal #{activeChannel.name}.</p>
              </div>
            </div>

            <div className="space-y-4">
              {messages.map((message) => (
                <div key={message.id} className="flex hover:bg-[#2E3035] p-1 -mx-1 rounded transition-colors group">
                  <div 
                    onClick={(e) => handleUserClick(e, message.author.id)}
                    className="w-10 h-10 rounded-full bg-[#5865F2] flex-shrink-0 mt-0.5 cursor-pointer flex items-center justify-center text-white font-bold text-lg hover:opacity-80 transition-opacity"
                  >
                    {message.author.avatarUrl ? (
                      <img src={message.author.avatarUrl} alt="Avatar" className="w-full h-full rounded-full object-cover" />
                    ) : (
                      message.author.username.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="ml-4 flex-1 min-w-0">
                    <div className="flex items-baseline">
                      <span 
                        onClick={(e) => handleUserClick(e, message.author.id)}
                        className="font-medium text-[15px] text-white hover:underline cursor-pointer mr-2"
                      >
                        {message.author.username}
                      </span>
                      <span className="text-xs text-[#949BA4]">
                        {new Date(message.createdAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                      </span>
                    </div>
                    <div className="text-[#DBDEE1] text-[15px] leading-[22px] whitespace-pre-wrap break-words">
                      {message.content.match(/^https?:\/\/.+\.(gif|png|jpg|jpeg|webp)($|\?)/i) || message.content.includes('media.giphy.com') || message.content.includes('giphy.com/media') ? (
                        <div className="mt-1 max-w-sm rounded-lg overflow-hidden border border-[#1E1F22]">
                          <img src={message.content} alt="GIF/Imagem" className="w-full max-h-72 object-contain bg-black/20" />
                        </div>
                      ) : message.content.includes('/invite/') ? (
                        <div>
                          <span>{message.content}</span>
                          <div className="mt-2 p-3 bg-[#2B2D31] border border-[#1E1F22] rounded-lg max-w-sm flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <div className="w-10 h-10 rounded-xl bg-[#5865F2] flex items-center justify-center text-white font-bold">
                                🚀
                              </div>
                              <div>
                                <p className="text-xs font-bold text-[#949BA4] uppercase">CONVITE PARA SERVIDOR</p>
                                <p className="text-sm font-semibold text-white">Clique para entrar no Servidor</p>
                              </div>
                            </div>
                            <a 
                              href={message.content.match(/https?:\/\/[^\s]+/)?.[0] || '#'} 
                              target="_blank"
                              rel="noreferrer"
                              className="bg-[#23A559] hover:bg-[#1A7C43] text-white text-xs font-bold px-3 py-1.5 rounded transition-colors"
                            >
                              Entrar
                            </a>
                          </div>
                        </div>
                      ) : (
                        message.content
                      )}
                    </div>
                    {message.attachments && message.attachments.length > 0 && (
                      <div className="mt-2 space-y-2">
                        {message.attachments.map((att: any) => (
                          <AttachmentViewer key={att.id} attachment={att} />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          </>
        )}
      </div>

      {/* Input */}
      <div className="px-4 pb-6 pt-1 flex-shrink-0">
        <MessageInput 
          contextId={activeChannelId}
          contextType="SERVER_CHANNEL"
          placeholder={`Conversar em #${activeChannel.name}`}
          onSendMessage={async (content, attachmentIds) => {
            await apiFetch(`/api/channels/${activeChannelId}/messages`, {
              method: 'POST',
              body: JSON.stringify({ content, attachmentIds }),
            });
          }}
        />
      </div>

      </div>

      {/* Right Server Member List Sidebar */}
      {showMembersList && activeServer?.members && (
        <ServerMemberList members={activeServer.members} />
      )}

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

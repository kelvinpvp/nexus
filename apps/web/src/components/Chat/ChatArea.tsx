import { useAppStore } from '@/store/appStore';
import { useAuth } from '@/contexts/AuthContext';
import { Hash, PlusCircle, Smile, Send } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { socket } from '@/lib/socket';
import { apiFetch } from '@/lib/api';
import VoiceRoom from '../Voice/VoiceRoom';
import EmojiPicker, { Theme, EmojiClickData } from 'emoji-picker-react';
import GiphyPicker from './GiphyPicker';

import ProfilePopout from '../Profile/ProfilePopout';

interface Message {
  id: string;
  content: string;
  createdAt: string;
  author: {
    id: string;
    username: string;
    avatarUrl: string | null;
  };
}

export default function ChatArea() {
  const { servers, activeServerId, activeChannelId } = useAppStore();
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showGifPicker, setShowGifPicker] = useState(false);
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
    return <VoiceRoom channelName={activeChannel.name} />;
  }

  return (
    <div className="flex-1 bg-[#313338] flex flex-col h-full min-w-0">
      {/* Header */}
      <header className="h-12 border-b border-[#1F2023] flex items-center px-4 shadow-sm flex-shrink-0">
        <Hash size={24} className="text-[#80848E] mr-2" />
        <h2 className="font-bold text-white text-[15px]">{activeChannel.name}</h2>
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
        <form onSubmit={handleSendMessage} className="bg-[#383A40] rounded-lg flex items-center px-4 py-2.5">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={`Conversar em #${activeChannel.name}`}
            className="bg-transparent border-none outline-none text-[#DBDEE1] flex-1 text-[15px] placeholder-[#80848E]"
          />
          <div className="flex items-center space-x-3 ml-3 relative">
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
              className="text-[#B5BAC1] hover:text-[#DBDEE1] transition-colors"
            >
              <Smile size={22} />
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
                    setInputValue(prev => prev + emoji.emoji);
                    setShowEmojiPicker(false);
                  }}
                />
              </div>
            )}
            
            <button 
              type="submit" 
              disabled={!inputValue.trim()}
              className={`${inputValue.trim() ? 'text-[#5865F2]' : 'text-[#80848E]'} transition-colors`}
            >
              <Send size={20} />
            </button>
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

import { Users, UserPlus, Inbox, HelpCircle, Check, X, MessageSquare, MoreVertical, XCircle, Slash } from 'lucide-react';
import { useState, FormEvent } from 'react';
import { useFriendStore } from '@/store/friendStore';
import { useAuth } from '@/contexts/AuthContext';
import { useDMStore } from '@/store/dmStore';

export default function HomeArea() {
  const [activeTab, setActiveTab] = useState<'online' | 'all' | 'pending' | 'blocked' | 'add'>('online');
  const [addUsername, setAddUsername] = useState('');
  const [addError, setAddError] = useState('');
  const [addSuccess, setAddSuccess] = useState('');
  
  const { user } = useAuth();
  const { 
    friends, 
    sentRequests, 
    receivedRequests, 
    blocks,
    sendFriendRequest,
    acceptFriendRequest,
    rejectFriendRequest,
    cancelFriendRequest,
    removeFriend,
    unblockUser
  } = useFriendStore();

  const onlineFriends = friends.filter(f => f.status.toLowerCase() === 'online' || f.status.toLowerCase() === 'idle' || f.status.toLowerCase() === 'dnd');
  const pendingCount = sentRequests.length + receivedRequests.length;

  const handleAddFriend = async (e: FormEvent) => {
    e.preventDefault();
    if (!addUsername.trim()) return;
    setAddError('');
    setAddSuccess('');
    try {
      await sendFriendRequest(addUsername.trim());
      setAddSuccess(`Pedido de amizade enviado para ${addUsername}`);
      setAddUsername('');
    } catch (error: any) {
      setAddError(error.message || 'Erro ao enviar pedido.');
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-[#313338] h-full">
      {/* Top Bar */}
      <div className="h-12 border-b border-[#1F2023] flex items-center px-4 shrink-0 shadow-sm">
        <div className="flex items-center text-white mr-4">
          <Users size={24} className="text-[#80848E] mr-2" />
          <span className="font-bold text-[15px]">Amigos</span>
        </div>
        
        <div className="w-[1px] h-6 bg-[#3F4147] mx-2"></div>

        <div className="flex items-center space-x-4 ml-4">
          <button 
            onClick={() => setActiveTab('online')}
            className={`px-2 py-1 rounded transition-colors text-[15px] font-medium ${activeTab === 'online' ? 'bg-[#3F4147] text-white' : 'text-[#949BA4] hover:bg-[#35373C] hover:text-[#DBDEE1]'}`}
          >
            Online
          </button>
          <button 
            onClick={() => setActiveTab('all')}
            className={`px-2 py-1 rounded transition-colors text-[15px] font-medium ${activeTab === 'all' ? 'bg-[#3F4147] text-white' : 'text-[#949BA4] hover:bg-[#35373C] hover:text-[#DBDEE1]'}`}
          >
            Todos
          </button>
          <button 
            onClick={() => setActiveTab('pending')}
            className={`px-2 py-1 rounded transition-colors text-[15px] font-medium flex items-center space-x-1 ${activeTab === 'pending' ? 'bg-[#3F4147] text-white' : 'text-[#949BA4] hover:bg-[#35373C] hover:text-[#DBDEE1]'}`}
          >
            <span>Pendentes</span>
            {pendingCount > 0 && (
              <span className="bg-[#F23F43] text-white text-[11px] font-bold px-1.5 py-0.5 rounded-full min-w-[16px] text-center">
                {pendingCount}
              </span>
            )}
          </button>
          <button 
            onClick={() => setActiveTab('blocked')}
            className={`px-2 py-1 rounded transition-colors text-[15px] font-medium ${activeTab === 'blocked' ? 'bg-[#3F4147] text-white' : 'text-[#949BA4] hover:bg-[#35373C] hover:text-[#DBDEE1]'}`}
          >
            Bloqueados
          </button>
          <button 
            onClick={() => setActiveTab('add')}
            className={`px-2 py-1 rounded transition-colors text-[15px] font-medium text-white ${activeTab === 'add' ? 'bg-transparent text-[#23A559]' : 'bg-[#23A559] hover:bg-[#1A7C43]'}`}
          >
            Adicionar Amigo
          </button>
        </div>

        <div className="flex-1"></div>

        <div className="flex items-center space-x-3 text-[#B5BAC1]">
          <button className="hover:text-[#DBDEE1] transition-colors" title="Caixa de Entrada">
            <Inbox size={24} />
          </button>
          <button className="hover:text-[#DBDEE1] transition-colors" title="Ajuda">
            <HelpCircle size={24} />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex bg-[#313338] overflow-hidden">
        
        {/* Left Side (Friends List / Search) */}
        <div className="flex-1 flex flex-col p-4 pr-0 sm:pr-4 overflow-y-auto custom-scrollbar">
          {activeTab === 'online' && (
            <>
              {onlineFriends.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-[#949BA4]">
                  <div className="w-[200px] h-[200px] bg-[#2B2D31] rounded-lg mb-4 flex items-center justify-center">
                    <Users size={64} className="text-[#1E1F22]" />
                  </div>
                  <p className="text-[#949BA4] text-[15px]">Ninguém está jogando com você no momento.</p>
                </div>
              ) : (
                <>
                  <div className="text-[#949BA4] text-sm uppercase font-bold tracking-wider mb-2 px-2 border-b border-[#3F4147] pb-4">
                    Online — {onlineFriends.length}
                  </div>
                  <div className="flex flex-col space-y-0.5">
                    {onlineFriends.map(friend => {
                      const fStatus = friend.status.toLowerCase();
                      return (
                      <div key={friend.id} className="flex items-center justify-between p-2 hover:bg-[#35373C] rounded-lg cursor-pointer group border-t border-[#3F4147] first:border-t-0">
                        <div className="flex items-center space-x-3">
                          <div className="relative w-8 h-8 rounded-full bg-[#5865F2] flex items-center justify-center text-white font-bold shrink-0">
                            {friend.avatarUrl ? <img src={friend.avatarUrl} alt="" className="w-full h-full rounded-full object-cover"/> : friend.username.charAt(0).toUpperCase()}
                            <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-[#313338] group-hover:border-[#35373C] ${fStatus === 'online' ? 'bg-[#23A559]' : fStatus === 'idle' ? 'bg-[#F0B232]' : 'bg-[#F23F43]'}`}></div>
                          </div>
                          <div>
                            <div className="font-bold text-white text-[15px]">{friend.username}</div>
                            <div className="text-[13px] text-[#949BA4]">Online</div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button 
                            onClick={async () => {
                              try {
                                await useDMStore.getState().openConversationWith(friend.id);
                              } catch(e) {}
                            }}
                            className="w-9 h-9 rounded-full bg-[#2B2D31] flex items-center justify-center text-[#B5BAC1] hover:text-[#DBDEE1] transition-colors"
                          >
                            <MessageSquare size={20} />
                          </button>
                          <button className="w-9 h-9 rounded-full bg-[#2B2D31] flex items-center justify-center text-[#B5BAC1] hover:text-[#DBDEE1] transition-colors">
                            <MoreVertical size={20} />
                          </button>
                        </div>
                      </div>
                      );
                    })}
                  </div>
                </>
              )}
            </>
          )}

          {activeTab === 'all' && (
            <>
              <div className="text-[#949BA4] text-sm uppercase font-bold tracking-wider mb-2 px-2 border-b border-[#3F4147] pb-4">
                Todos os Amigos — {friends.length}
              </div>
              <div className="flex flex-col space-y-0.5">
                {friends.map(friend => {
                  const fStatus = friend.status.toLowerCase();
                  return (
                  <div key={friend.id} className="flex items-center justify-between p-2 hover:bg-[#35373C] rounded-lg cursor-pointer group border-t border-[#3F4147] first:border-t-0">
                    <div className="flex items-center space-x-3">
                      <div className="relative w-8 h-8 rounded-full bg-[#5865F2] flex items-center justify-center text-white font-bold shrink-0">
                        {friend.avatarUrl ? <img src={friend.avatarUrl} alt="" className="w-full h-full rounded-full object-cover"/> : friend.username.charAt(0).toUpperCase()}
                        <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-[#313338] group-hover:border-[#35373C] ${fStatus === 'online' ? 'bg-[#23A559]' : fStatus === 'idle' ? 'bg-[#F0B232]' : fStatus === 'dnd' ? 'bg-[#F23F43]' : 'bg-[#80848E]'}`}></div>
                      </div>
                      <div>
                        <div className="font-bold text-white text-[15px]">{friend.username}</div>
                        <div className="text-[13px] text-[#949BA4]">{fStatus === 'offline' ? 'Offline' : 'Online'}</div>
                      </div>
                    </div>
                        <div className="flex items-center space-x-2">
                          <button 
                            onClick={async () => {
                              try {
                                await useDMStore.getState().openConversationWith(friend.id);
                              } catch(e) {}
                            }}
                            className="w-9 h-9 rounded-full bg-[#2B2D31] flex items-center justify-center text-[#B5BAC1] hover:text-[#DBDEE1] transition-colors"
                            title="Enviar Mensagem"
                          >
                            <MessageSquare size={20} />
                          </button>
                          <button 
                            onClick={() => useFriendStore.getState().blockUser(friend.id)} 
                            className="w-9 h-9 rounded-full bg-[#2B2D31] flex items-center justify-center text-[#B5BAC1] hover:text-[#F23F43] transition-colors"
                            title="Bloquear Usuário"
                          >
                            <Slash size={18} />
                          </button>
                          <button 
                            onClick={() => removeFriend(friend.id)} 
                            className="w-9 h-9 rounded-full bg-[#2B2D31] flex items-center justify-center text-[#B5BAC1] hover:text-[#F23F43] transition-colors"
                            title="Remover Amigo"
                          >
                            <XCircle size={20} />
                          </button>
                        </div>
                  </div>
                  );
                })}
              </div>
            </>
          )}

          {activeTab === 'pending' && (
            <>
              <div className="text-[#949BA4] text-sm uppercase font-bold tracking-wider mb-2 px-2 border-b border-[#3F4147] pb-4">
                Pendentes — {pendingCount}
              </div>
              <div className="flex flex-col space-y-0.5">
                {/* Received Requests */}
                {receivedRequests.map(req => (
                  <div key={req.id} className="flex items-center justify-between p-2 hover:bg-[#35373C] rounded-lg group border-t border-[#3F4147] first:border-t-0">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-full bg-[#5865F2] flex items-center justify-center text-white font-bold shrink-0">
                        {req.sender?.avatarUrl ? <img src={req.sender.avatarUrl} alt="" className="w-full h-full rounded-full object-cover"/> : req.sender?.username.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-bold text-white text-[15px]">{req.sender?.username}</div>
                        <div className="text-[13px] text-[#949BA4]">Pedido recebido</div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button onClick={() => acceptFriendRequest(req.id)} className="w-9 h-9 rounded-full bg-[#2B2D31] flex items-center justify-center text-[#B5BAC1] hover:text-[#23A559] transition-colors" title="Aceitar">
                        <Check size={20} />
                      </button>
                      <button onClick={() => rejectFriendRequest(req.id)} className="w-9 h-9 rounded-full bg-[#2B2D31] flex items-center justify-center text-[#B5BAC1] hover:text-[#F23F43] transition-colors" title="Recusar">
                        <X size={20} />
                      </button>
                    </div>
                  </div>
                ))}

                {/* Sent Requests */}
                {sentRequests.map(req => (
                  <div key={req.id} className="flex items-center justify-between p-2 hover:bg-[#35373C] rounded-lg group border-t border-[#3F4147] first:border-t-0">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-full bg-[#5865F2] flex items-center justify-center text-white font-bold shrink-0">
                        {req.receiver?.avatarUrl ? <img src={req.receiver.avatarUrl} alt="" className="w-full h-full rounded-full object-cover"/> : req.receiver?.username.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-bold text-white text-[15px]">{req.receiver?.username}</div>
                        <div className="text-[13px] text-[#949BA4]">Pedido enviado</div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button onClick={() => cancelFriendRequest(req.id)} className="w-9 h-9 rounded-full bg-[#2B2D31] flex items-center justify-center text-[#B5BAC1] hover:text-[#F23F43] transition-colors" title="Cancelar pedido">
                        <X size={20} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {activeTab === 'blocked' && (
            <>
              <div className="text-[#949BA4] text-sm uppercase font-bold tracking-wider mb-2 px-2 border-b border-[#3F4147] pb-4">
                Bloqueados — {blocks.length}
              </div>
              <div className="flex flex-col space-y-0.5">
                {blocks.map(block => (
                  <div key={block.id} className="flex items-center justify-between p-2 hover:bg-[#35373C] rounded-lg group border-t border-[#3F4147] first:border-t-0">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-full bg-[#5865F2] flex items-center justify-center text-white font-bold shrink-0">
                        {block.blocked?.avatarUrl ? <img src={block.blocked.avatarUrl} alt="" className="w-full h-full rounded-full object-cover"/> : block.blocked?.username.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-bold text-white text-[15px]">{block.blocked?.username}</div>
                        <div className="text-[13px] text-[#949BA4]">Bloqueado</div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button onClick={() => unblockUser(block.blockedId)} className="w-9 h-9 rounded-full bg-[#2B2D31] flex items-center justify-center text-[#B5BAC1] hover:text-[#F23F43] transition-colors" title="Desbloquear">
                        <Slash size={16} /> {/* Unblock icon representation */}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {activeTab === 'add' && (
            <div className="flex flex-col px-4 pt-4">
              <h2 className="text-white font-bold text-[15px] mb-2 uppercase">Adicionar Amigo</h2>
              <p className="text-[#949BA4] text-[13px] mb-4">
                Você pode adicionar amigos usando o username.
              </p>
              
              <form onSubmit={handleAddFriend} className="relative flex items-center w-full max-w-[800px] bg-[#1E1F22] rounded-lg border border-[#1E1F22] focus-within:border-[#5865F2] transition-colors p-3">
                <input 
                  type="text" 
                  value={addUsername}
                  onChange={e => setAddUsername(e.target.value)}
                  placeholder="Você pode adicionar amigos usando o username"
                  className="bg-transparent border-none outline-none text-white flex-1 text-[15px] placeholder-[#80848E]"
                />
                <button 
                  type="submit"
                  disabled={!addUsername.trim()}
                  className="bg-[#5865F2] hover:bg-[#4752C4] text-white px-4 py-1.5 rounded transition-colors text-sm font-medium ml-4 shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Enviar pedido de amizade
                </button>
              </form>
              
              {addSuccess && <div className="mt-2 text-[#23A559] text-sm">{addSuccess}</div>}
              {addError && <div className="mt-2 text-[#F23F43] text-sm">{addError}</div>}
            </div>
          )}
        </div>

        {/* Right Side (Active Now pane) - Hide on smaller screens */}
        <div className="w-[360px] border-l border-[#3F4147] p-4 hidden lg:block bg-[#313338]">
          <h3 className="font-bold text-white text-[19px] mb-4">Ativo Agora</h3>
          <div className="text-center text-[#949BA4] mt-8 text-[15px] p-4 font-medium">
            Por enquanto, está quieto por aqui...
            <br />
            Quando um amigo começar a jogar ou entrar no voz, mostraremos aqui!
          </div>
        </div>

      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { useFriendStore } from '@/store/friendStore';
import { useDMStore } from '@/store/dmStore';
import { X, Check } from 'lucide-react';

interface CreateGroupDMModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CreateGroupDMModal({ isOpen, onClose }: CreateGroupDMModalProps) {
  const { friends, fetchFriends } = useFriendStore();
  const { createGroupDM } = useDMStore();
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchFriends();
      setSelectedUserIds(new Set());
      setName('');
      setError('');
    }
  }, [isOpen, fetchFriends]);

  if (!isOpen) return null;

  const toggleUser = (userId: string) => {
    const newSet = new Set(selectedUserIds);
    if (newSet.has(userId)) {
      newSet.delete(userId);
    } else {
      if (newSet.size >= 9) {
        setError('Você pode selecionar no máximo 9 amigos.');
        return;
      }
      newSet.add(userId);
      setError('');
    }
    setSelectedUserIds(newSet);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedUserIds.size === 0) {
      setError('Selecione pelo menos um amigo.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await createGroupDM(Array.from(selectedUserIds), name.trim() || undefined);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erro ao criar grupo');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-[#313338] w-[440px] rounded-lg shadow-2xl flex flex-col transform transition-all">
        <div className="p-4 flex justify-between items-center border-b border-[#1F2023]/30">
          <h2 className="text-xl font-bold text-[#F2F3F5]">Selecionar Amigos</h2>
          <button onClick={onClose} className="text-[#949BA4] hover:text-[#DBDEE1]">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 max-h-[60vh]">
          <div className="px-4 py-4 space-y-4">
            <div>
              <label className="text-xs font-bold text-[#B5BAC1] uppercase mb-1 block">Nome do Grupo (Opcional)</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Grupo dos amigos"
                className="w-full bg-[#1E1F22] text-[#DBDEE1] rounded-[3px] p-2.5 focus:outline-none focus:ring-1 focus:ring-[#00A8FC]"
                maxLength={100}
              />
            </div>

            <div className="flex justify-between items-center text-xs font-bold text-[#B5BAC1] uppercase">
              <span>Amigos</span>
              <span>{selectedUserIds.size} / 9</span>
            </div>

            {error && <p className="text-[#F23F42] text-xs font-medium">{error}</p>}

            <div className="overflow-y-auto custom-scrollbar flex-1 -mx-2 px-2 max-h-[250px] space-y-1">
              {friends.length === 0 ? (
                <div className="text-center text-[#949BA4] py-4 text-sm">
                  Você não tem amigos adicionados ainda.
                </div>
              ) : (
                friends.map((friend) => {
                  const isSelected = selectedUserIds.has(friend.id);
                  return (
                    <div 
                      key={friend.id}
                      onClick={() => toggleUser(friend.id)}
                      className="flex items-center justify-between p-2 rounded hover:bg-[#35373C] cursor-pointer transition-colors"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-full bg-[#5865F2] flex items-center justify-center text-white font-bold shrink-0">
                          {friend.avatarUrl ? <img src={friend.avatarUrl} alt="" className="w-full h-full rounded-full object-cover"/> : friend.username.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium text-[#DBDEE1] text-[15px] truncate">
                          {friend.displayName || friend.username}
                        </span>
                      </div>
                      <div className={`w-5 h-5 rounded border flex items-center justify-center ${isSelected ? 'bg-[#5865F2] border-[#5865F2]' : 'border-[#949BA4] hover:border-[#DBDEE1]'}`}>
                        {isSelected && <Check size={14} className="text-white" />}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="bg-[#2B2D31] p-4 flex justify-end items-center rounded-b-lg border-t border-[#1F2023]/30">
            <button
              type="submit"
              disabled={isLoading || selectedUserIds.size === 0}
              className="w-full bg-[#5865F2] hover:bg-[#4752C4] text-white px-6 py-2.5 rounded-[3px] text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Criando...' : 'Criar Grupo DM'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { useAppStore } from '@/store/appStore';
import { apiFetch } from '@/lib/api';

interface CreateServerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CreateServerModal({ isOpen, onClose }: CreateServerModalProps) {
  const { addServer } = useAppStore();
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsLoading(true);
    setError('');

    try {
      const server = await apiFetch('/api/servers', {
        method: 'POST',
        body: JSON.stringify({ name }),
      });
      addServer(server);
      setName('');
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erro ao criar servidor');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-[#313338] w-[440px] rounded-lg shadow-2xl flex flex-col transform transition-all">
        <div className="p-6 text-center">
          <h2 className="text-2xl font-bold text-[#F2F3F5] mb-2">Personalize seu servidor</h2>
          <p className="text-[#B5BAC1] text-[15px] leading-relaxed">
            Dê uma identidade ao seu novo servidor com um nome e um ícone. Você pode mudar isso depois.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="px-6 flex flex-col flex-1">
          <label className="text-xs font-bold text-[#B5BAC1] uppercase mb-2">Nome do servidor <span className="text-[#F23F42]">*</span></label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="bg-[#1E1F22] text-[#DBDEE1] rounded-[3px] p-2.5 focus:outline-none focus:ring-1 focus:ring-[#00A8FC] mb-2"
            maxLength={100}
            autoFocus
          />
          {error && <p className="text-[#F23F42] text-xs font-medium">{error}</p>}
          
          <div className="mt-8 mb-4 text-xs text-[#949BA4]">
            Ao criar um servidor, você concorda com as Diretrizes da Comunidade do Nexus.
          </div>

          <div className="bg-[#2B2D31] -mx-6 px-6 py-4 flex justify-between items-center rounded-b-lg">
            <button
              type="button"
              onClick={onClose}
              className="text-sm font-medium text-[#F2F3F5] hover:underline"
            >
              Voltar
            </button>
            <button
              type="submit"
              disabled={isLoading || !name.trim()}
              className="bg-[#5865F2] hover:bg-[#4752C4] text-white px-6 py-2.5 rounded-[3px] text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Criando...' : 'Criar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

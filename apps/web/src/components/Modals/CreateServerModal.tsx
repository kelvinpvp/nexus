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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md">
      <div className="w-[460px] overflow-hidden rounded-[28px] border border-cyan-400/10 bg-gradient-to-b from-[#0D1630] via-[#111827] to-[#090D18] shadow-[0_30px_120px_rgba(0,0,0,0.5)] flex flex-col transform transition-all">
        <div className="p-7 text-center">
          <h2 className="mb-2 text-[28px] font-black tracking-[-0.03em] text-white">Personalize seu servidor</h2>
          <p className="text-slate-400 text-[15px] leading-relaxed">
            Dê uma identidade ao seu novo servidor com um nome e um ícone. Você pode mudar isso depois.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="px-6 flex flex-col flex-1">
          <label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 mb-2">Nome do servidor <span className="text-rose-300">*</span></label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mb-2 rounded-2xl border border-white/10 bg-slate-950/40 p-3 text-white outline-none focus:border-cyan-400/30"
            maxLength={100}
            autoFocus
          />
          {error && <p className="text-rose-300 text-xs font-medium">{error}</p>}
          
          <div className="mt-8 mb-4 text-xs text-slate-500">
            Ao criar um servidor, você concorda com as Diretrizes da Comunidade do Nexus.
          </div>

          <div className="border-t border-white/6 bg-black/10 -mx-6 px-6 py-4 flex justify-between items-center">
            <button
              type="button"
              onClick={onClose}
              className="rounded-2xl px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-white/6"
            >
              Voltar
            </button>
            <button
              type="submit"
              disabled={isLoading || !name.trim()}
              className="rounded-2xl bg-cyan-400 px-6 py-2.5 text-sm font-semibold text-slate-950 transition-colors hover:bg-cyan-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Criando...' : 'Criar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

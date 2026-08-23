import { useState } from 'react';
import { X, Copy, Check } from 'lucide-react';
import { apiFetch } from '@/lib/api';

interface CreateServerInviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  serverId: string;
}

export default function CreateServerInviteModal({ isOpen, onClose, serverId }: CreateServerInviteModalProps) {
  const [expiresIn, setExpiresIn] = useState<number>(86400); // 1 dia
  const [maxUses, setMaxUses] = useState<number>(0); // Ilimitado
  const [inviteUrl, setInviteUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleGenerate = async () => {
    setIsLoading(true);
    setError('');
    try {
      const invite = await apiFetch(`/api/servers/${serverId}/invites`, {
        method: 'POST',
        body: JSON.stringify({ expiresIn, maxUses })
      });
      const baseUrl = window.location.origin;
      setInviteUrl(`${baseUrl}/invite/${invite.code}`);
      setCopied(false);
    } catch (err: any) {
      setError(err.message || 'Erro ao gerar convite. Você precisa ser administrador ou dono.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    if (inviteUrl) {
      navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleClose = () => {
    setInviteUrl('');
    setCopied(false);
    setError('');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-[#313338] w-[440px] rounded-lg shadow-2xl flex flex-col transform transition-all">
        <div className="p-4 flex justify-between items-center border-b border-[#1F2023]/30">
          <h2 className="text-xl font-bold text-[#F2F3F5]">Convidar amigos para o servidor</h2>
          <button onClick={handleClose} className="text-[#949BA4] hover:text-[#DBDEE1]">
            <X size={24} />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {!inviteUrl ? (
            <>
              <div>
                <label className="text-xs font-bold text-[#B5BAC1] uppercase mb-1 block">Expirar após</label>
                <select
                  value={expiresIn}
                  onChange={(e) => setExpiresIn(Number(e.target.value))}
                  className="w-full bg-[#1E1F22] text-[#DBDEE1] rounded-[3px] p-2.5 focus:outline-none focus:ring-1 focus:ring-[#00A8FC]"
                >
                  <option value={1800}>30 Minutos</option>
                  <option value={3600}>1 Hora</option>
                  <option value={21600}>6 Horas</option>
                  <option value={43200}>12 Horas</option>
                  <option value={86400}>1 Dia</option>
                  <option value={604800}>7 Dias</option>
                  <option value={0}>Nunca</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-[#B5BAC1] uppercase mb-1 block">Número máximo de usos</label>
                <select
                  value={maxUses}
                  onChange={(e) => setMaxUses(Number(e.target.value))}
                  className="w-full bg-[#1E1F22] text-[#DBDEE1] rounded-[3px] p-2.5 focus:outline-none focus:ring-1 focus:ring-[#00A8FC]"
                >
                  <option value={0}>Ilimitado</option>
                  <option value={1}>1 Uso</option>
                  <option value={5}>5 Usos</option>
                  <option value={10}>10 Usos</option>
                  <option value={25}>25 Usos</option>
                  <option value={50}>50 Usos</option>
                  <option value={100}>100 Usos</option>
                </select>
              </div>

              {error && <p className="text-[#F23F42] text-xs font-medium">{error}</p>}
            </>
          ) : (
            <div>
              <label className="text-xs font-bold text-[#B5BAC1] uppercase mb-1 block">Envie este link para um amigo</label>
              <div className="flex bg-[#1E1F22] rounded-[3px] overflow-hidden">
                <input
                  type="text"
                  readOnly
                  value={inviteUrl}
                  className="bg-transparent text-[#DBDEE1] p-2.5 flex-1 focus:outline-none text-sm"
                />
                <button
                  onClick={handleCopy}
                  className={`px-4 flex items-center justify-center font-medium text-sm transition-colors ${copied ? 'bg-[#23A559] text-white' : 'bg-[#5865F2] hover:bg-[#4752C4] text-white'}`}
                >
                  {copied ? 'Copiado' : 'Copiar'}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="bg-[#2B2D31] p-4 flex justify-between items-center rounded-b-lg border-t border-[#1F2023]/30">
          {!inviteUrl ? (
            <button
              onClick={handleGenerate}
              disabled={isLoading}
              className="w-full bg-[#5865F2] hover:bg-[#4752C4] text-white px-6 py-2.5 rounded-[3px] text-sm font-medium transition-colors disabled:opacity-50"
            >
              {isLoading ? 'Gerando...' : 'Gerar novo link'}
            </button>
          ) : (
            <p className="text-xs text-[#949BA4] text-center w-full">
              Este link dará acesso ao seu servidor. Compartilhe com cuidado.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

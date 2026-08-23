'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { apiFetch } from '@/lib/api';
import { Users } from 'lucide-react';
import { useAppStore } from '@/store/appStore';

export default function InvitePage({ params }: { params: { code: string } }) {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const { fetchServers } = useAppStore();
  
  const [invite, setInvite] = useState<any>(null);
  const [error, setError] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // If not authenticated, redirect to login with callback
    if (!authLoading && !user) {
      router.push(`/login?callbackUrl=/invite/${params.code}`);
      return;
    }

    if (!authLoading && user) {
      // Fetch invite info
      apiFetch(`/api/invites/${params.code}`)
        .then(data => {
          setInvite(data);
          setIsLoading(false);
        })
        .catch(err => {
          setError(err.message || 'Convite inválido ou expirado.');
          setIsLoading(false);
        });
    }
  }, [user, authLoading, params.code, router]);

  const handleJoin = async () => {
    setIsJoining(true);
    setError('');
    try {
      const result = await apiFetch(`/api/invites/${params.code}/join`, { method: 'POST' });
      await fetchServers(); // Refresh server list
      router.push('/');
    } catch (err: any) {
      setError(err.message || 'Erro ao entrar no servidor.');
      setIsJoining(false);
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-[#313338] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#5865F2]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cover bg-center flex items-center justify-center relative" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=2070&auto=format&fit=crop')" }}>
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm"></div>
      
      <div className="bg-[#313338] w-[480px] rounded-lg shadow-2xl p-8 relative z-10 flex flex-col items-center text-center">
        {error ? (
          <>
            <div className="w-16 h-16 rounded-full bg-[#F23F43]/20 flex items-center justify-center mb-4">
              <Users size={32} className="text-[#F23F43]" />
            </div>
            <h1 className="text-white text-2xl font-bold mb-2">Ops! Algo deu errado.</h1>
            <p className="text-[#B5BAC1] mb-6">{error}</p>
            <button
              onClick={() => router.push('/')}
              className="bg-[#5865F2] hover:bg-[#4752C4] text-white px-8 py-3 rounded-[3px] font-medium transition-colors w-full"
            >
              Voltar ao Início
            </button>
          </>
        ) : invite ? (
          <>
            {invite.server.iconUrl ? (
              <img src={invite.server.iconUrl} alt={invite.server.name} className="w-20 h-20 rounded-2xl shadow-lg mb-4 object-cover bg-[#2B2D31]" />
            ) : (
              <div className="w-20 h-20 rounded-2xl bg-[#2B2D31] flex items-center justify-center mb-4 shadow-lg text-white font-bold text-3xl">
                {invite.server.name.charAt(0).toUpperCase()}
              </div>
            )}
            
            <p className="text-[#B5BAC1] text-sm uppercase font-bold tracking-wider mb-2">
              Você foi convidado a entrar no servidor
            </p>
            <h1 className="text-white text-3xl font-bold mb-2">{invite.server.name}</h1>
            
            <div className="flex items-center space-x-4 text-[#B5BAC1] mb-8 mt-2">
              <div className="flex items-center">
                <div className="w-2.5 h-2.5 rounded-full bg-[#B5BAC1] mr-2"></div>
                <span>{invite.server.memberCount} Membros</span>
              </div>
            </div>

            <button
              onClick={handleJoin}
              disabled={isJoining}
              className="bg-[#5865F2] hover:bg-[#4752C4] text-white px-8 py-3.5 rounded-[3px] font-bold text-lg transition-colors w-full disabled:opacity-50"
            >
              {isJoining ? 'Entrando...' : 'Aceitar Convite'}
            </button>
          </>
        ) : null}
      </div>
    </div>
  );
}

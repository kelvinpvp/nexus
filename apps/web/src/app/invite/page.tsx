'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { apiFetch } from '@/lib/api';
import { Users } from 'lucide-react';
import { useAppStore } from '@/store/appStore';

function InviteContent() {
  const searchParams = useSearchParams();
  const code = searchParams.get('code');
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const { fetchServers } = useAppStore();
  
  const [invite, setInvite] = useState<any>(null);
  const [error, setError] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!code) {
      setError('Código de convite ausente.');
      setIsLoading(false);
      return;
    }

    // If not authenticated, redirect to login with callback
    if (!authLoading && !user) {
      router.push(`/login?callbackUrl=/invite/${code}`);
      return;
    }

    if (!authLoading && user) {
      // Fetch invite info
      apiFetch(`/api/invites/${code}`)
        .then(data => {
          setInvite(data);
          setIsLoading(false);
        })
        .catch(err => {
          setError(err.message || 'Convite inválido ou expirado.');
          setIsLoading(false);
        });
    }
  }, [user, authLoading, code, router]);

  const handleJoin = async () => {
    setIsJoining(true);
    setError('');
    try {
      const result = await apiFetch(`/api/invites/${code}/join`, { method: 'POST' });
      await fetchServers(); // Refresh server list
      router.push('/');
    } catch (err: any) {
      setError(err.message || 'Erro ao entrar no servidor.');
      setIsJoining(false);
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0B1020] via-[#0F172A] to-[#090D18] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-300"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.15),_transparent_32%),linear-gradient(180deg,#050816_0%,#0b1020_45%,#090d18_100%)] flex items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(59,130,246,0.14),transparent_35%,rgba(168,85,247,0.12)_70%,transparent_100%)] backdrop-blur-sm"></div>
      
      <div className="w-[500px] rounded-[30px] border border-cyan-400/10 bg-[#0D1630]/95 shadow-[0_30px_100px_rgba(0,0,0,0.55)] p-8 relative z-10 flex flex-col items-center text-center">
        {error ? (
          <>
            <div className="w-16 h-16 rounded-full bg-rose-500/15 flex items-center justify-center mb-4">
              <Users size={32} className="text-rose-300" />
            </div>
            <h1 className="text-white text-2xl font-bold mb-2">Ops! Algo deu errado.</h1>
            <p className="text-slate-400 mb-6">{error}</p>
            <button
              onClick={() => router.push('/')}
              className="w-full rounded-2xl bg-cyan-400 px-8 py-3 font-semibold text-slate-950 transition-colors hover:bg-cyan-300"
            >
              Voltar ao Início
            </button>
          </>
        ) : invite ? (
          <>
            {invite.server.iconUrl ? (
              <img src={invite.server.iconUrl} alt={invite.server.name} className="w-20 h-20 rounded-3xl shadow-lg mb-4 object-cover bg-slate-900 ring-1 ring-white/10" />
            ) : (
              <div className="w-20 h-20 rounded-3xl bg-slate-900 flex items-center justify-center mb-4 shadow-lg text-white font-bold text-3xl ring-1 ring-white/10">
                {invite.server.name.charAt(0).toUpperCase()}
              </div>
            )}
            
            <p className="text-slate-400 text-sm uppercase font-semibold tracking-[0.22em] mb-2">
              Você foi convidado a entrar no servidor
            </p>
            <h1 className="text-white text-3xl font-bold mb-2">{invite.server.name}</h1>
            
            <div className="flex items-center space-x-4 text-slate-400 mb-8 mt-2">
              <div className="flex items-center">
                <div className="w-2.5 h-2.5 rounded-full bg-cyan-300 mr-2"></div>
                <span>{invite.server.memberCount} Membros</span>
              </div>
            </div>

            <button
              onClick={handleJoin}
              disabled={isJoining}
              className="w-full rounded-2xl bg-cyan-400 px-8 py-3.5 text-lg font-bold text-slate-950 transition-colors hover:bg-cyan-300 disabled:opacity-50"
            >
              {isJoining ? 'Entrando...' : 'Aceitar Convite'}
            </button>
          </>
        ) : null}
      </div>
    </div>
  );
}

export default function InvitePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gradient-to-br from-[#0B1020] via-[#0F172A] to-[#090D18] flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-300"></div></div>}>
      <InviteContent />
    </Suspense>
  );
}

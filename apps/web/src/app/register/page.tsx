"use client";
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, BadgeCheck, Hexagon, Sparkles } from 'lucide-react';
import { getApiBaseUrl } from '@/lib/api';

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const formatRegisterError = async (res: Response) => {
    try {
      const data = await res.json();
      if (data?.error === 'DATABASE_UNAVAILABLE') {
        return 'O servidor de cadastro está indisponível agora. Tente novamente em alguns instantes.';
      }
      if (data?.error === 'AUTH_EMAIL_TAKEN') {
        return 'Esse e-mail já está em uso.';
      }
      if (data?.error === 'AUTH_USERNAME_TAKEN') {
        return 'Esse nome de usuário já está em uso.';
      }
      return data?.error || 'Erro ao fazer registro';
    } catch {
      return 'Erro ao fazer registro';
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    try {
      const res = await fetch(`${getApiBaseUrl()}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, username, password }),
      });
      
      if (res.ok) {
        router.push('/login'); 
      } else {
        setError(await formatRegisterError(res));
      }
    } catch (err: any) {
      setError('Não foi possível falar com o servidor agora.');
    }
  };

  return (
    <div className="min-h-screen overflow-hidden bg-[#090B14] text-white selection:bg-[#8B95FF] selection:text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(35,165,89,0.25),_transparent_30%),radial-gradient(circle_at_bottom_left,_rgba(139,149,255,0.38),_transparent_34%),linear-gradient(135deg,_#090B14_0%,_#10162A_58%,_#17304B_100%)]" />
      <div className="relative mx-auto flex min-h-screen max-w-7xl items-center px-4 py-8">
        <div className="grid w-full overflow-hidden rounded-[28px] border border-white/10 bg-white/5 shadow-[0_24px_120px_rgba(0,0,0,0.45)] backdrop-blur-xl lg:grid-cols-[0.95fr_1.05fr]">
          <section className="bg-[#111520] p-6 sm:p-10">
            <div className="mx-auto max-w-md">
              <div className="mb-8 flex items-center justify-between lg:hidden">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-[#8B95FF]">Nexus</p>
                  <h1 className="text-2xl font-black">Criar conta</h1>
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#5865F2]">
                  <Hexagon size={22} />
                </div>
              </div>

              <p className="mb-2 text-xs font-bold uppercase tracking-[0.22em] text-[#8B95FF]">Comece aqui</p>
              <h1 className="text-3xl font-black">Construa seu espaço no Nexus</h1>
              <p className="mt-2 text-sm leading-6 text-[#B5BAC1]">Uma conta nova para entrar em comunidades, chamadas e perfis com mais personalidade.</p>

              <form onSubmit={handleRegister} className="mt-8 space-y-4">
                <div>
                  <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.22em] text-[#949BA4]">
                    E-mail
                  </label>
                  <input 
                    type="email" 
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-2xl border border-white/8 bg-[#0B0F18] px-4 py-3.5 text-[#F2F3F5] outline-none transition focus:border-[#5865F2] focus:ring-2 focus:ring-[#5865F2]/25"
                    placeholder="voce@exemplo.com"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.22em] text-[#949BA4]">
                    Nome de usuário
                  </label>
                  <input 
                    type="text" 
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full rounded-2xl border border-white/8 bg-[#0B0F18] px-4 py-3.5 text-[#F2F3F5] outline-none transition focus:border-[#5865F2] focus:ring-2 focus:ring-[#5865F2]/25"
                    placeholder="seu_nome"
                  />
                </div>
                
                <div>
                  <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.22em] text-[#949BA4]">
                    Senha
                  </label>
                  <input 
                    type="password" 
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-2xl border border-white/8 bg-[#0B0F18] px-4 py-3.5 text-[#F2F3F5] outline-none transition focus:border-[#5865F2] focus:ring-2 focus:ring-[#5865F2]/25"
                    placeholder="Crie uma senha forte"
                  />
                </div>

                {error && (
                  <div className="rounded-2xl border border-[#F23F43]/30 bg-[#F23F43]/10 px-4 py-3 text-sm text-[#FFB3B5]">
                    {error}
                  </div>
                )}

                <button 
                  type="submit"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#5865F2] px-4 py-3.5 font-semibold text-white transition hover:bg-[#4752C4]"
                >
                  Continuar <ArrowRight size={16} />
                </button>
                
                <div className="pt-2 text-sm text-[#B5BAC1]">
                  Já tem uma conta?{' '}
                  <Link href="/login" className="font-semibold text-[#8B95FF] hover:text-white">
                    Entrar
                  </Link>
                </div>
              </form>
            </div>
          </section>

          <aside className="hidden flex-col justify-between bg-[#0E1327] p-10 lg:flex">
            <div className="space-y-8">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#5865F2] text-white shadow-lg">
                  <Hexagon size={22} />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#8B95FF]">Nexus</p>
                  <h2 className="text-2xl font-black">Nova conta</h2>
                </div>
              </div>
              <div className="max-w-md space-y-4">
                <p className="text-4xl font-black leading-tight">Comece com um espaço que já parece vivo.</p>
                <p className="text-sm leading-6 text-[#B5BAC1]">Registro pensado para entrar rápido e depois deixar o resto do app respirar.</p>
              </div>
            </div>
            <div className="grid gap-3 text-sm text-[#DBDEE1]">
              <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-4">
                <BadgeCheck size={18} className="text-[#23A559]" />
                Tudo pronto para perfis e voz
              </div>
              <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-4">
                <Sparkles size={18} className="text-[#F0B232]" />
                Visual mais refinado e menos genérico
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

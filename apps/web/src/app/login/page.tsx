"use client";
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Shield, Sparkles, ArrowRight, CheckCircle2, Hexagon } from 'lucide-react';
import { getApiBaseUrl } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const { login } = useAuth();

  const formatAuthError = async (res: Response) => {
    try {
      const data = await res.json();
      if (data?.error === 'DATABASE_UNAVAILABLE') {
        return 'O servidor de autenticação está indisponível agora. Tente novamente em alguns instantes.';
      }
      if (data?.error === 'AUTH_INVALID_CREDENTIALS') {
        return 'E-mail ou senha incorretos.';
      }
      return data?.error || 'Erro ao fazer login';
    } catch {
      return 'Erro ao fazer login';
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    try {
      const res = await fetch(`${getApiBaseUrl()}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });
      
      if (res.ok) {
        const data = await res.json();
        login(data.user);
      } else {
        setError(await formatAuthError(res));
      }
    } catch (err: any) {
      setError('Não foi possível falar com o servidor agora.');
    }
  };

  return (
    <div className="min-h-screen overflow-hidden bg-[#090B14] text-white selection:bg-[#8B95FF] selection:text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(139,149,255,0.35),_transparent_30%),radial-gradient(circle_at_bottom_right,_rgba(35,165,89,0.22),_transparent_34%),linear-gradient(135deg,_#090B14_0%,_#0D1020_55%,_#131B3A_100%)]" />
      <div className="relative mx-auto flex min-h-screen max-w-7xl items-center px-4 py-8">
        <div className="grid w-full overflow-hidden rounded-[28px] border border-white/10 bg-white/5 shadow-[0_24px_120px_rgba(0,0,0,0.45)] backdrop-blur-xl lg:grid-cols-[1.05fr_0.95fr]">
          <aside className="hidden flex-col justify-between bg-[#0E1327] p-10 lg:flex">
            <div className="space-y-8">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#5865F2] text-white shadow-lg">
                  <Hexagon size={22} />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#8B95FF]">Nexus</p>
                  <h2 className="text-2xl font-black">Communication OS</h2>
                </div>
              </div>
              <div className="max-w-md space-y-4">
                <p className="text-4xl font-black leading-tight">Um centro social mais vivo, mais limpo e menos pesado.</p>
                <p className="text-sm leading-6 text-[#B5BAC1]">Chamadas, grupos, perfis e voz com uma interface própria. Mais direta, mais elegante e sem parecer cópia.</p>
              </div>
            </div>
            <div className="grid gap-3 text-sm text-[#DBDEE1]">
              <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-4">
                <Shield size={18} className="text-[#8B95FF]" />
                Login seguro e fluxo contínuo
              </div>
              <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-4">
                <Sparkles size={18} className="text-[#23A559]" />
                Áudio, perfis e chamadas mais limpos
              </div>
              <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-4">
                <CheckCircle2 size={18} className="text-[#F0B232]" />
                Feito para virar produto de verdade
              </div>
            </div>
          </aside>

          <section className="bg-[#111520] p-6 sm:p-10">
            <div className="mb-8 flex items-center justify-between lg:hidden">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-[#8B95FF]">Nexus</p>
                <h1 className="text-2xl font-black">Entrar</h1>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#5865F2]">
                <Hexagon size={22} />
              </div>
            </div>

            <div className="mx-auto max-w-md">
              <div className="mb-8">
                <p className="mb-2 text-xs font-bold uppercase tracking-[0.22em] text-[#8B95FF]">Bem-vindo de volta</p>
                <h1 className="text-3xl font-black">Entre no Nexus</h1>
                <p className="mt-2 text-sm leading-6 text-[#B5BAC1]">Uma nova casa para conversas, voz e comunidade.</p>
              </div>

              <form onSubmit={handleLogin} className="space-y-4">
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
                    Senha
                  </label>
                  <input 
                    type="password" 
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-2xl border border-white/8 bg-[#0B0F18] px-4 py-3.5 text-[#F2F3F5] outline-none transition focus:border-[#5865F2] focus:ring-2 focus:ring-[#5865F2]/25"
                    placeholder="Sua senha"
                  />
                  <Link href="#" className="mt-2 inline-flex text-xs font-medium text-[#8B95FF] hover:text-white">
                    Esqueceu sua senha?
                  </Link>
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
                  Entrar <ArrowRight size={16} />
                </button>
                
                <div className="pt-2 text-sm text-[#B5BAC1]">
                  Precisando de uma conta?{' '}
                  <Link href="/register" className="font-semibold text-[#8B95FF] hover:text-white">
                    Registre-se
                  </Link>
                </div>
              </form>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

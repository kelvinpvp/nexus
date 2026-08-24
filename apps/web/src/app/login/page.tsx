"use client";
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const { login } = useAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });
      
      const data = await res.json();
      if (res.ok) {
        login(data.user); // Redireciona para o Nexus principal via contexto
      } else {
        setError(data.error || 'Erro ao fazer login');
      }
    } catch (err: any) {
      setError(`Erro de conexão: ${err.message || 'Desconhecido'}. A API é: ${process.env.NEXT_PUBLIC_API_URL}`);
    }
  };

  return (
    <div className="min-h-screen bg-[#5865F2] flex items-center justify-center p-4 selection:bg-[#5865F2] selection:text-white relative">
      {/* Background artwork placeholder */}
      
      <div className="bg-[#313338] text-[#DBDEE1] p-8 rounded-lg shadow-2xl w-full max-w-[784px] flex z-10">
        
        {/* Left side: Login form */}
        <div className="w-full sm:w-[414px] flex flex-col">
          <div className="text-center sm:text-left mb-8">
            <h1 className="text-2xl font-bold text-white mb-2">Boas-vindas de volta!</h1>
            <p className="text-[#B5BAC1]">Estamos muito animados em te ver novamente!</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-[#B5BAC1] uppercase tracking-wide mb-2">
                E-mail <span className="text-red-500">*</span>
              </label>
              <input 
                type="email" 
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[#1E1F22] text-[#DBDEE1] p-2.5 rounded focus:outline-none focus:ring-1 focus:ring-[#5865F2]"
              />
            </div>
            
            <div>
              <label className="block text-xs font-bold text-[#B5BAC1] uppercase tracking-wide mb-2">
                Senha <span className="text-red-500">*</span>
              </label>
              <input 
                type="password" 
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#1E1F22] text-[#DBDEE1] p-2.5 rounded focus:outline-none focus:ring-1 focus:ring-[#5865F2]"
              />
              <Link href="#" className="text-xs text-[#00A8FC] hover:underline mt-2 inline-block">
                Esqueceu sua senha?
              </Link>
            </div>

            {error && (
              <div className="text-red-400 text-sm mt-2 font-medium">{error}</div>
            )}

            <button 
              type="submit"
              className="w-full bg-[#5865F2] text-white py-2.5 rounded font-medium hover:bg-[#4752C4] transition-colors mt-6"
            >
              Entrar
            </button>
            
            <div className="text-sm text-[#949BA4] mt-4">
              Precisando de uma conta? {' '}
              <Link href="/register" className="text-[#00A8FC] hover:underline">
                Registre-se
              </Link>
            </div>
          </form>
        </div>

        {/* QR Code placeholder was removed to avoid fake features */}
      </div>
    </div>
  );
}

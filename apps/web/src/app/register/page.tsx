"use client";
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, username, password }),
      });
      
      const data = await res.json();
      if (res.ok) {
        // Redireciona para o login ou direto pro app dependendo do fluxo
        router.push('/login'); 
      } else {
        setError(data.error || 'Erro ao fazer registro');
      }
    } catch (err: any) {
      setError(`Erro de conexão: ${err.message || 'Desconhecido'}. A API é: ${process.env.NEXT_PUBLIC_API_URL}`);
    }
  };

  return (
    <div className="min-h-screen bg-[#5865F2] flex items-center justify-center p-4 selection:bg-[#5865F2] selection:text-white relative">
      <div className="bg-[#313338] text-[#DBDEE1] p-8 rounded-lg shadow-2xl w-full max-w-[480px] flex z-10 flex-col">
        
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-white mb-2">Criar uma conta</h1>
        </div>

        <form onSubmit={handleRegister} className="space-y-4">
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
              Nome de Usuário <span className="text-red-500">*</span>
            </label>
            <input 
              type="text" 
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
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
          </div>

          {error && (
            <div className="text-red-400 text-sm mt-2 font-medium">{error}</div>
          )}

          <button 
            type="submit"
            className="w-full bg-[#5865F2] text-white py-2.5 rounded font-medium hover:bg-[#4752C4] transition-colors mt-6"
          >
            Continuar
          </button>
          
          <div className="text-sm text-[#00A8FC] mt-4 hover:underline cursor-pointer" onClick={() => router.push('/login')}>
            Já tem uma conta?
          </div>
        </form>
      </div>
    </div>
  );
}

import React, { useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Camera } from 'lucide-react';

export default function AccountSettings() {
  const { user, setUser, logout } = useAuth();
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);

  const [editingField, setEditingField] = useState<'displayName' | 'username' | 'email' | 'password' | null>(null);
  const [editValue, setEditValue] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const bannerInputRef = useRef<HTMLInputElement>(null);

  if (!user) return null;

  const openEditModal = (field: 'displayName' | 'username' | 'email' | 'password') => {
    setEditingField(field);
    setEditValue(field !== 'password' ? user[field as keyof typeof user] || '' : '');
    setCurrentPassword('');
  };

  const handleSaveEdit = async () => {
    setIsSavingEdit(true);
    try {
      const payload: any = {};
      payload[editingField!] = editValue;
      if (editingField === 'password') {
        payload.currentPassword = currentPassword;
      }

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users/me`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Erro ao salvar alterações');
      }

      const updatedUser = await res.json();
      setUser(updatedUser);
      setEditingField(null);
    } catch (error: any) {
      alert(error.message);
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('A imagem do avatar deve ter menos que 5MB.');
      return;
    }

    setIsUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append('avatar', file);

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users/me/avatar`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Erro ao enviar avatar');
      }

      const data = await res.json();
      setUser((prev) => prev ? { ...prev, avatarUrl: data.avatarUrl } : null);
    } catch (error: any) {
      alert(error.message);
    } finally {
      setIsUploadingAvatar(false);
      if (avatarInputRef.current) avatarInputRef.current.value = '';
    }
  };

  const handleBannerChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alert('A imagem do banner deve ter menos que 10MB.');
      return;
    }

    setIsUploadingBanner(true);
    try {
      const formData = new FormData();
      formData.append('banner', file);

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users/me/banner`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Erro ao enviar banner');
      }

      const data = await res.json();
      setUser((prev) => prev ? { ...prev, bannerUrl: data.bannerUrl } : null);
    } catch (error: any) {
      alert(error.message);
    } finally {
      setIsUploadingBanner(false);
      if (bannerInputRef.current) bannerInputRef.current.value = '';
    }
  };

  return (
    <div className="text-white max-w-2xl">
      <h2 className="text-[20px] font-bold mb-6">Minha Conta</h2>

      <div className="bg-[#1E1F22] rounded-lg mb-6 relative">
        {/* Banner */}
        <div 
          className="h-24 bg-[#5865F2] rounded-t-lg w-full relative group cursor-pointer overflow-hidden"
          onClick={() => bannerInputRef.current?.click()}
        >
          {user.bannerUrl && (
            <img src={user.bannerUrl} alt="Banner" className="w-full h-full object-cover group-hover:opacity-60 transition-opacity" />
          )}
          
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
            {isUploadingBanner ? (
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
            ) : (
              <>
                <Camera size={24} className="text-white mb-1" />
                <span className="text-[10px] font-bold text-white uppercase">Mudar Banner</span>
              </>
            )}
          </div>
        </div>
        <input 
          type="file" 
          ref={bannerInputRef} 
          className="hidden" 
          accept="image/png, image/jpeg, image/gif, image/webp" 
          onChange={handleBannerChange}
        />
        
        {/* Profile Info */}
        <div className="px-4 pb-4 flex justify-between items-start">
          <div className="flex items-end space-x-4">
            {/* Avatar overlapping banner */}
            <div 
              className="w-[92px] h-[92px] rounded-full border-[6px] border-[#1E1F22] bg-[#313338] flex items-center justify-center overflow-hidden -mt-[46px] relative z-10 group cursor-pointer transition-opacity"
              onClick={() => avatarInputRef.current?.click()}
            >
              {isUploadingAvatar ? (
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
              ) : user.avatarUrl ? (
                <img src={user.avatarUrl} alt="Avatar" className="w-full h-full object-cover group-hover:opacity-60 transition-opacity" />
              ) : (
                <span className="text-3xl font-bold group-hover:opacity-60 transition-opacity">{user.displayName?.charAt(0) || user.username.charAt(0).toUpperCase()}</span>
              )}
              
              {!isUploadingAvatar && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera size={24} className="text-white mb-1" />
                  <span className="text-[10px] font-bold text-white uppercase">Mudar</span>
                </div>
              )}
            </div>
            <input 
              type="file" 
              ref={avatarInputRef} 
              className="hidden" 
              accept="image/png, image/jpeg, image/gif, image/webp" 
              onChange={handleAvatarChange}
            />

            <div className="pb-1">
              <h3 className="text-xl font-bold leading-tight">{user.displayName || user.username}</h3>
              <p className="text-sm text-[#DBDEE1]">@{user.username}</p>
            </div>
          </div>
          <button className="bg-[#5865F2] hover:bg-[#4752C4] px-4 py-1.5 rounded text-sm font-medium transition-colors mt-4">
            Editar Perfil
          </button>
        </div>

        {/* Details card */}
        <div className="px-4 pb-4">
          <div className="bg-[#2B2D31] rounded-lg p-4 space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <div className="text-xs font-bold uppercase text-[#949BA4] mb-1">Nome de Exibição</div>
                <div className="text-[15px]">{user.displayName || user.username}</div>
              </div>
              <button 
                onClick={() => openEditModal('displayName')}
                className="bg-[#4E5058] hover:bg-[#6D6F78] px-4 py-1.5 rounded text-sm font-medium transition-colors"
              >
                Editar
              </button>
            </div>
            
            <div className="flex justify-between items-center">
              <div>
                <div className="text-xs font-bold uppercase text-[#949BA4] mb-1">Nome de Usuário</div>
                <div className="text-[15px]">{user.username}</div>
              </div>
              <button 
                onClick={() => openEditModal('username')}
                className="bg-[#4E5058] hover:bg-[#6D6F78] px-4 py-1.5 rounded text-sm font-medium transition-colors"
              >
                Editar
              </button>
            </div>

            <div className="flex justify-between items-center">
              <div>
                <div className="text-xs font-bold uppercase text-[#949BA4] mb-1">E-mail</div>
                <div className="text-[15px]">{user.email.replace(/(.{2})(.*)(@.*)/, '$1***$3')}</div>
              </div>
              <button 
                onClick={() => openEditModal('email')}
                className="bg-[#4E5058] hover:bg-[#6D6F78] px-4 py-1.5 rounded text-sm font-medium transition-colors"
              >
                Editar
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="h-px bg-[#3F4147] my-6" />

      <div>
        <h3 className="text-xs font-bold uppercase text-[#949BA4] mb-4">Senha e Autenticação</h3>
        <button 
          onClick={() => setEditingField('password')}
          className="bg-[#5865F2] hover:bg-[#4752C4] px-4 py-2 rounded text-sm font-medium transition-colors mb-6"
        >
          Alterar Senha
        </button>

        <div className="h-px bg-[#3F4147] my-6" />

        <h3 className="text-xs font-bold uppercase text-[#949BA4] mb-4">Gerenciamento de Conta</h3>
        <button 
          onClick={logout}
          className="text-[#F23F43] border border-[#F23F43] hover:bg-[#F23F43]/10 px-4 py-2 rounded text-sm font-medium transition-colors"
        >
          Sair da Conta
        </button>
      </div>

      {editingField && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center animate-in fade-in duration-200">
          <div className="bg-[#313338] w-full max-w-md rounded-lg shadow-xl animate-in zoom-in-95 duration-200 overflow-hidden flex flex-col">
            <div className="p-4 flex flex-col items-center text-center pb-2">
              <h2 className="text-2xl font-bold text-white mb-2">Alterar {
                editingField === 'displayName' ? 'Nome de Exibição' :
                editingField === 'username' ? 'Nome de Usuário' :
                editingField === 'email' ? 'E-mail' :
                'Senha'
              }</h2>
              <p className="text-[#DBDEE1] text-[15px]">Insira o novo valor desejado abaixo.</p>
            </div>
            
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-[#B5BAC1] mb-2">
                  Novo {
                    editingField === 'displayName' ? 'Nome de Exibição' :
                    editingField === 'username' ? 'Nome de Usuário' :
                    editingField === 'email' ? 'E-mail' :
                    'Senha'
                  }
                </label>
                <input 
                  type={editingField === 'password' ? 'password' : editingField === 'email' ? 'email' : 'text'}
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="w-full bg-[#1E1F22] text-[#DBDEE1] p-2.5 rounded focus:outline-none focus:ring-1 focus:ring-[#5865F2]"
                  placeholder={`Digite ${editingField === 'password' ? 'a nova senha' : 'o novo valor'}`}
                />
              </div>

              {/* Se for senha, precisa de senha atual */}
              {editingField === 'password' && (
                <div>
                  <label className="block text-xs font-bold uppercase text-[#B5BAC1] mb-2">
                    Senha Atual
                  </label>
                  <input 
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full bg-[#1E1F22] text-[#DBDEE1] p-2.5 rounded focus:outline-none focus:ring-1 focus:ring-[#5865F2]"
                  />
                </div>
              )}
            </div>

            <div className="p-4 bg-[#2B2D31] flex justify-end space-x-3 mt-2">
              <button 
                onClick={() => setEditingField(null)}
                className="text-white hover:underline px-4 py-2 text-sm font-medium"
              >
                Cancelar
              </button>
              <button 
                onClick={handleSaveEdit}
                disabled={isSavingEdit || !editValue}
                className="bg-[#5865F2] hover:bg-[#4752C4] px-4 py-2 rounded text-white text-sm font-medium transition-colors disabled:opacity-50 flex items-center"
              >
                {isSavingEdit ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                ) : null}
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

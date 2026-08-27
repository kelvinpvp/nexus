import React, { useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Camera, RefreshCw } from 'lucide-react';
import ImageCropperModal from './ImageCropperModal';

export default function AccountSettings() {
  const { user, setUser, logout } = useAuth();
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);

  const [cropModalConfig, setCropModalConfig] = useState<{ isOpen: boolean; imageSrc: string; isAvatar: boolean } | null>(null);
  const [pendingUploadFile, setPendingUploadFile] = useState<{ file: File; isAvatar: boolean } | null>(null);

  const [editingField, setEditingField] = useState<'displayName' | 'username' | 'email' | 'password' | null>(null);
  const [editValue, setEditValue] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const bannerInputRef = useRef<HTMLInputElement>(null);
  const releaseUrl = 'https://github.com/kelvinpvp/nexus/releases/latest';

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
      if (editingField === 'password' || editingField === 'email') {
        payload.currentPassword = currentPassword;
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const res = await fetch(`${apiUrl}/api/users/me`, {
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
      setUser((current) => current ? { ...current, ...updatedUser } : updatedUser);
      setEditingField(null);
    } catch (error: any) {
      alert(error.message);
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, isAvatar: boolean) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Se for um GIF animado, não vamos cortar para não perder a animação (Canvas só pega o 1º frame)
    if (file.type === 'image/gif') {
      uploadCroppedImage(file, isAvatar);
      e.target.value = '';
      return;
    }

    // We allow larger sizes here because we will crop/compress it before upload
    const url = URL.createObjectURL(file);
    setCropModalConfig({ isOpen: true, imageSrc: url, isAvatar });
    setPendingUploadFile({ file, isAvatar });
    
    // reset input
    e.target.value = '';
  };

  const handleCheckUpdate = async () => {
    if (isCheckingUpdate) return;
    setIsCheckingUpdate(true);
    try {
      const isDesktopRuntime =
        typeof window !== 'undefined' &&
        (
          Boolean((window as any).__TAURI_INTERNALS) ||
          window.location.hostname === 'tauri.localhost' ||
          window.location.protocol === 'tauri:'
        );

      if (!isDesktopRuntime) {
        window.open(releaseUrl, '_blank', 'noreferrer');
        return;
      }

      const { check } = await import('@tauri-apps/plugin-updater');
      const update = await check();
      if (!update) {
        alert('Você já está na versão mais recente.');
        return;
      }

      const confirmed = window.confirm(`Atualização encontrada: ${update.version}\n\nQuer instalar agora?`);
      if (!confirmed) return;

      await update.downloadAndInstall();
      window.location.reload();
    } catch (error) {
      console.error('Failed to check/apply update', error);
      window.open(releaseUrl, '_blank', 'noreferrer');
    } finally {
      setIsCheckingUpdate(false);
    }
  };

  const uploadCroppedImage = async (blob: Blob, overrideIsAvatar?: boolean) => {
    const isAvatar = overrideIsAvatar !== undefined ? overrideIsAvatar : pendingUploadFile?.isAvatar;
    if (isAvatar === undefined) return;
    
    // We send as webp or jpeg, or gif
    const mimeType = blob.type;
    const sizeBytes = blob.size;

    if (isAvatar) setIsUploadingAvatar(true);
    else setIsUploadingBanner(true);
    
    setCropModalConfig(null);
    setPendingUploadFile(null);

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
    const endpoints = {
      presign: isAvatar ? '/api/users/me/avatar/presign' : '/api/users/me/banner/presign',
      confirm: isAvatar ? '/api/users/me/avatar/confirm' : '/api/users/me/banner/confirm'
    };

    try {
      // 1. Get Presigned URL
      const presignRes = await fetch(`${apiUrl}${endpoints.presign}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ mimeType, sizeBytes })
      });

      if (!presignRes.ok) throw new Error('Erro ao preparar upload.');
      const { uploadUrl, fileUrl, storageKey } = await presignRes.json();

      // 2. Upload to Object Storage
      const uploadRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': mimeType },
        body: blob
      });

      if (!uploadRes.ok) throw new Error('Erro ao enviar imagem para o storage.');

      // 3. Confirm with Backend
      const confirmRes = await fetch(`${apiUrl}${endpoints.confirm}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ fileUrl, storageKey })
      });

      if (!confirmRes.ok) throw new Error('Erro ao confirmar imagem.');

      const data = await confirmRes.json();
      if (isAvatar) {
        setUser((prev) => prev ? { ...prev, avatarUrl: data.avatarUrl } : null);
      } else {
        setUser((prev) => prev ? { ...prev, bannerUrl: data.bannerUrl } : null);
      }
    } catch (e: any) {
      alert(e.message || 'Erro durante o upload da imagem.');
    } finally {
      if (isAvatar) setIsUploadingAvatar(false);
      else setIsUploadingBanner(false);
    }
  };

  const fieldLabelClass = 'text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400';
  const fieldValueClass = 'text-[15px] text-slate-100';
  const primaryButtonClass = 'bg-cyan-500/90 hover:bg-cyan-400 text-slate-950 shadow-[0_10px_30px_rgba(34,211,238,0.18)]';
  const secondaryButtonClass = 'bg-white/6 hover:bg-white/12 text-slate-100 border border-white/10';
  const destructiveButtonClass = 'text-rose-300 border border-rose-500/70 hover:bg-rose-500/12';

  return (
    <div className="text-white max-w-2xl pb-8">
      <div className="mb-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-cyan-300/80 mb-2">Configurações</p>
        <h2 className="text-[24px] font-black tracking-[-0.04em] text-white">Minha Conta</h2>
        <p className="text-sm text-slate-400 mt-1">Seu perfil, segurança e identidade no Nexus.</p>
      </div>

      <div className="relative overflow-hidden rounded-[28px] border border-cyan-400/10 bg-gradient-to-b from-[#0D1630] via-[#111827] to-[#0B1020] shadow-[0_24px_90px_rgba(0,0,0,0.35)]">
        {/* Banner */}
        <div 
          className="h-28 bg-gradient-to-r from-cyan-500 via-indigo-500 to-violet-500 w-full relative group cursor-pointer overflow-hidden"
          onClick={() => bannerInputRef.current?.click()}
        >
          {user.bannerUrl && (
            <img src={user.bannerUrl} alt="Banner" className="w-full h-full object-cover group-hover:opacity-60 transition-opacity" />
          )}
          
          <div className="absolute inset-0 bg-gradient-to-br from-slate-950/15 via-transparent to-slate-950/55" />
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/35 opacity-0 group-hover:opacity-100 transition-opacity">
            {isUploadingBanner ? (
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
            ) : (
              <>
                <Camera size={24} className="text-white mb-1" />
                <span className="text-[10px] font-bold text-white uppercase tracking-[0.2em]">Mudar banner</span>
              </>
            )}
          </div>
        </div>
        <input 
          type="file" 
          ref={bannerInputRef} 
          className="hidden" 
          accept="image/png, image/jpeg, image/gif, image/webp" 
          onChange={(e) => handleFileSelect(e, false)}
        />
        
        {/* Profile Info */}
        <div className="px-5 pb-5 flex justify-between items-start gap-4">
          <div className="flex items-end space-x-4">
            {/* Avatar overlapping banner */}
            <div 
              className="w-[96px] h-[96px] rounded-full border-[6px] border-[#0D1630] bg-[#111827] flex items-center justify-center overflow-hidden -mt-[48px] relative z-10 group cursor-pointer transition-all shadow-[0_18px_50px_rgba(0,0,0,0.35)] ring-1 ring-white/10"
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
                  <span className="text-[10px] font-bold text-white uppercase tracking-[0.2em]">Mudar</span>
                </div>
              )}
            </div>
            <input 
              type="file" 
              ref={avatarInputRef} 
              className="hidden" 
              accept="image/png, image/jpeg, image/gif, image/webp" 
              onChange={(e) => handleFileSelect(e, true)}
            />

            <div className="pb-1">
              <h3 className="text-[22px] font-black leading-tight tracking-[-0.03em]">{user.displayName || user.username}</h3>
              <p className="text-sm text-cyan-200/80">@{user.username}</p>
            </div>
          </div>
          <span className="mt-4 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs font-semibold text-cyan-200">
            Avatar e banner
          </span>
        </div>

        {/* Details card */}
        <div className="px-5 pb-5">
          <div className="rounded-2xl border border-white/6 bg-white/[0.03] p-4 space-y-4 backdrop-blur-sm">
            <div className="flex justify-between items-center gap-4 rounded-2xl border border-white/5 bg-slate-950/20 px-4 py-4">
              <div>
                <div className={fieldLabelClass}>Nome de exibição</div>
                <div className={fieldValueClass}>{user.displayName || user.username}</div>
              </div>
              <button 
                onClick={() => openEditModal('displayName')}
                className={`rounded-xl px-4 py-2 text-sm font-semibold transition-all ${secondaryButtonClass}`}
              >
                Editar
              </button>
            </div>
            
            <div className="flex justify-between items-center gap-4 rounded-2xl border border-white/5 bg-slate-950/20 px-4 py-4">
              <div>
                <div className={fieldLabelClass}>Nome de usuário</div>
                <div className={fieldValueClass}>{user.username}</div>
              </div>
              <button 
                onClick={() => openEditModal('username')}
                className={`rounded-xl px-4 py-2 text-sm font-semibold transition-all ${secondaryButtonClass}`}
              >
                Editar
              </button>
            </div>

            <div className="flex justify-between items-center gap-4 rounded-2xl border border-white/5 bg-slate-950/20 px-4 py-4">
              <div>
                <div className={fieldLabelClass}>E-mail</div>
                <div className={fieldValueClass}>{user.email.replace(/(.{2})(.*)(@.*)/, '$1***$3')}</div>
              </div>
              <button 
                onClick={() => openEditModal('email')}
                className={`rounded-xl px-4 py-2 text-sm font-semibold transition-all ${secondaryButtonClass}`}
              >
                Editar
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="my-6 h-px bg-gradient-to-r from-transparent via-cyan-400/20 to-transparent" />

      <div className="rounded-[24px] border border-white/6 bg-white/[0.03] p-5 shadow-[0_18px_50px_rgba(0,0,0,0.18)]">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400 mb-4">Senha e autenticação</h3>
        <div className="flex flex-wrap gap-3">
          <button 
            onClick={() => openEditModal('password')}
            className={`rounded-2xl px-4 py-2.5 text-sm font-semibold transition-all ${primaryButtonClass}`}
          >
            Alterar Senha
          </button>

          <button
            onClick={handleCheckUpdate}
            disabled={isCheckingUpdate}
            className="inline-flex items-center gap-2 rounded-2xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-2.5 text-sm font-semibold text-cyan-100 transition-all hover:bg-cyan-400/15 disabled:opacity-60"
          >
            {isCheckingUpdate ? <RefreshCw size={16} className="animate-spin" /> : <RefreshCw size={16} />}
            Buscar atualização
          </button>
        </div>

        <div className="my-6 h-px bg-white/8" />

        <h3 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400 mb-4">Gerenciamento de conta</h3>
        <button 
          onClick={logout}
          className={`rounded-2xl px-4 py-2.5 text-sm font-semibold transition-all ${destructiveButtonClass}`}
        >
          Sair da Conta
        </button>
      </div>

      {editingField && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200 px-4">
          <div className="flex w-full max-w-md flex-col overflow-hidden rounded-[24px] border border-white/10 bg-[#0D1630] shadow-[0_30px_120px_rgba(0,0,0,0.55)] animate-in zoom-in-95 duration-200">
            <div className="p-5 flex flex-col items-center text-center pb-3">
              <h2 className="text-2xl font-black tracking-[-0.03em] text-white mb-2">Alterar {
                editingField === 'displayName' ? 'Nome de Exibição' :
                editingField === 'username' ? 'Nome de Usuário' :
                editingField === 'email' ? 'E-mail' :
                'Senha'
              }</h2>
              <p className="text-slate-400 text-[15px]">Insira o novo valor desejado abaixo.</p>
            </div>
            
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 mb-2">
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
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-slate-100 outline-none transition focus:border-cyan-400/40 focus:ring-2 focus:ring-cyan-400/20"
                  placeholder={`Digite ${editingField === 'password' ? 'a nova senha' : 'o novo valor'}`}
                />
              </div>

              {/* Alterações sensíveis exigem confirmação. */}
              {(editingField === 'password' || editingField === 'email') && (
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 mb-2">
                    Senha Atual
                  </label>
                  <input 
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-slate-100 outline-none transition focus:border-cyan-400/40 focus:ring-2 focus:ring-cyan-400/20"
                  />
                </div>
              )}
            </div>

            <div className="mt-2 flex justify-end space-x-3 border-t border-white/6 bg-black/10 p-4">
              <button 
                onClick={() => setEditingField(null)}
                className="rounded-2xl px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-white/8"
              >
                Cancelar
              </button>
              <button 
                onClick={handleSaveEdit}
                disabled={isSavingEdit || !editValue || ((editingField === 'password' || editingField === 'email') && !currentPassword)}
                className={`flex items-center rounded-2xl px-4 py-2 text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed ${primaryButtonClass}`}
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
      {cropModalConfig && cropModalConfig.isOpen && (
        <ImageCropperModal
          imageSrc={cropModalConfig.imageSrc}
          isAvatar={cropModalConfig.isAvatar}
          onClose={() => {
            setCropModalConfig(null);
            setPendingUploadFile(null);
          }}
          onApply={uploadCroppedImage}
        />
      )}
    </div>
  );
}

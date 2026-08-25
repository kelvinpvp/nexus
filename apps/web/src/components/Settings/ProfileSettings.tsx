import { useEffect, useState } from 'react';
import { CheckCircle2, Loader2, Save, Sparkles } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function ProfileSettings() {
  const { user, setUser } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [customStatus, setCustomStatus] = useState('');
  const [bio, setBio] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) return;
    setDisplayName(user.displayName || '');
    setCustomStatus(user.customStatus || '');
    setBio(user.bio || '');
  }, [user]);

  if (!user) return null;

  const saveProfile = async () => {
    setIsSaving(true);
    setSaved(false);
    setError('');

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const response = await fetch(apiUrl + '/api/users/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          displayName: displayName.trim() || null,
          customStatus: customStatus.trim() || null,
          bio: bio.trim() || null,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Não foi possível salvar o perfil.');

      setUser((current) => current ? { ...current, ...data } : data);
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2500);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Não foi possível salvar o perfil.');
    } finally {
      setIsSaving(false);
    }
  };

  const previewName = displayName.trim() || user.username;
  const previewStatus = customStatus.trim();

  return (
    <div className="max-w-3xl pb-12 text-white">
      <div className="mb-7">
        <p className="mb-1 text-xs font-bold uppercase tracking-[0.14em] text-[#5865F2]">Identidade</p>
        <h2 className="text-2xl font-bold">Perfil</h2>
        <p className="mt-2 text-sm leading-6 text-[#B5BAC1]">Defina como você aparece em conversas, servidores e chamadas.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <section className="space-y-5 rounded-xl border border-[#3F4147] bg-[#2B2D31] p-5">
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-wide text-[#B5BAC1]">Nome de exibição</span>
            <input
              value={displayName}
              maxLength={50}
              onChange={(event) => setDisplayName(event.target.value)}
              placeholder={user.username}
              className="mt-2 w-full rounded-lg border border-[#111214] bg-[#1E1F22] p-3 text-[#F2F3F5] outline-none focus:border-[#5865F2]"
            />
            <span className="mt-1 block text-right text-xs text-[#949BA4]">{displayName.length}/50</span>
          </label>

          <label className="block">
            <span className="text-xs font-bold uppercase tracking-wide text-[#B5BAC1]">Status personalizado</span>
            <input
              value={customStatus}
              maxLength={128}
              onChange={(event) => setCustomStatus(event.target.value)}
              placeholder="O que está acontecendo?"
              className="mt-2 w-full rounded-lg border border-[#111214] bg-[#1E1F22] p-3 text-[#F2F3F5] outline-none focus:border-[#5865F2]"
            />
            <span className="mt-1 block text-right text-xs text-[#949BA4]">{customStatus.length}/128</span>
          </label>

          <label className="block">
            <span className="text-xs font-bold uppercase tracking-wide text-[#B5BAC1]">Sobre mim</span>
            <textarea
              value={bio}
              maxLength={190}
              rows={5}
              onChange={(event) => setBio(event.target.value)}
              placeholder="Conte um pouco sobre você."
              className="mt-2 w-full resize-none rounded-lg border border-[#111214] bg-[#1E1F22] p-3 text-[#F2F3F5] outline-none focus:border-[#5865F2]"
            />
            <span className="mt-1 block text-right text-xs text-[#949BA4]">{bio.length}/190</span>
          </label>

          {error && <p className="rounded-lg bg-[#F23F43]/10 p-3 text-sm text-[#FF8A8D]">{error}</p>}

          <div className="flex items-center justify-end gap-3">
            {saved && <span className="flex items-center gap-1.5 text-sm text-[#23A559]"><CheckCircle2 size={16} /> Salvo</span>}
            <button
              type="button"
              onClick={saveProfile}
              disabled={isSaving}
              className="flex items-center gap-2 rounded-lg bg-[#5865F2] px-4 py-2 text-sm font-semibold hover:bg-[#4752C4] disabled:opacity-60"
            >
              {isSaving ? <Loader2 size={17} className="animate-spin" /> : <Save size={17} />}
              Salvar alterações
            </button>
          </div>
        </section>

        <aside>
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-[#B5BAC1]">Prévia</p>
          <div className="overflow-hidden rounded-xl border border-[#3F4147] bg-[#111214] shadow-xl">
            <div className="h-24 bg-[#5865F2]">
              {user.bannerUrl && <img src={user.bannerUrl} alt="" className="h-full w-full object-cover" />}
            </div>
            <div className="relative px-4 pb-5 pt-12">
              <div className="absolute -top-10 left-4 h-20 w-20 overflow-hidden rounded-full border-[5px] border-[#111214] bg-[#313338]">
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="flex h-full items-center justify-center text-2xl font-bold">{previewName.charAt(0).toUpperCase()}</span>
                )}
              </div>
              <h3 className="truncate text-xl font-bold">{previewName}</h3>
              <p className="text-sm text-[#B5BAC1]">@{user.username}</p>
              {previewStatus && <p className="mt-3 flex items-start gap-2 text-sm"><Sparkles size={15} className="mt-0.5 shrink-0 text-[#F0B232]" />{previewStatus}</p>}
              <div className="my-4 h-px bg-[#3F4147]" />
              <p className="text-xs font-bold uppercase text-[#F2F3F5]">Sobre mim</p>
              <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-5 text-[#DBDEE1]">{bio.trim() || 'Adicione uma apresentação ao seu perfil.'}</p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

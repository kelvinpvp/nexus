'use client';

import { useEffect, useState } from 'react';
import { Download, RefreshCw, TriangleAlert, X } from 'lucide-react';

type UpdateState = 'idle' | 'checking' | 'available' | 'downloading' | 'error';

export default function DesktopUpdateBanner() {
  const [state, setState] = useState<UpdateState>('idle');
  const [message, setMessage] = useState('');
  const [version, setVersion] = useState('');
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const desktopRuntime =
      typeof window !== 'undefined' &&
      (
        Boolean((window as any).__TAURI_INTERNALS) ||
        window.location.hostname === 'tauri.localhost' ||
        window.location.protocol === 'tauri:'
      );

    setIsDesktop(desktopRuntime);
    if (!desktopRuntime) return;

    let cancelled = false;

    (async () => {
      try {
        setState('checking');
        setMessage('Verificando se existe uma versão mais nova...');
        const { check } = await import('@tauri-apps/plugin-updater');
        const update = await check();
        if (cancelled) return;

        if (!update) {
          setState('idle');
          return;
        }

        setVersion(update.version);
        setMessage(update.body || 'Uma nova versão do Nexus Desktop está disponível.');
        setState('available');
      } catch (error) {
        if (cancelled) return;
        setState('error');
        setMessage('Não foi possível verificar atualizações agora.');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  if (!isDesktop) return null;
  if (state === 'idle' || state === 'checking') {
    return (
      <div className="mx-auto mt-3 flex w-[min(100%-1rem,56rem)] items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200 shadow-xl backdrop-blur-xl">
        <div className="flex items-start gap-3">
          <RefreshCw size={18} className="mt-0.5 shrink-0 animate-spin text-cyan-200" />
          <div>
            <div className="font-semibold">Atualizações do Nexus Desktop</div>
            <div className="text-xs leading-5 opacity-90">{message || 'Verificando atualizações...'}</div>
          </div>
        </div>
      </div>
    );
  }

  const handleInstall = async () => {
    try {
      setState('downloading');
      const { check } = await import('@tauri-apps/plugin-updater');
      const update = await check();
      if (!update) {
        setState('idle');
        return;
      }

      await update.downloadAndInstall();
      window.location.reload();
    } catch {
      setState('error');
      setMessage('Falha ao instalar a atualização.');
    }
  };

  return (
    <div className={`mx-auto mt-3 flex w-[min(100%-1rem,56rem)] items-center justify-between gap-4 rounded-2xl border px-4 py-3 text-sm shadow-xl backdrop-blur-xl ${state === 'error' ? 'border-rose-400/25 bg-rose-400/10 text-rose-100' : 'border-cyan-300/20 bg-cyan-400/10 text-cyan-50'}`}>
      <div className="flex items-start gap-3">
        {state === 'error' ? <TriangleAlert size={18} className="mt-0.5 shrink-0 text-rose-300" /> : <Download size={18} className="mt-0.5 shrink-0 text-cyan-200" />}
        <div>
          <div className="font-semibold">
            {state === 'error' ? 'Não foi possível verificar atualizações' : `Nova versão disponível${version ? `: ${version}` : ''}`}
          </div>
          <div className="text-xs leading-5 opacity-90">{message}</div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {state !== 'error' && (
          <button
            type="button"
            onClick={handleInstall}
            disabled={state === 'downloading'}
            className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-bold text-slate-950 transition hover:bg-cyan-100 disabled:opacity-60"
          >
            {state === 'downloading' ? <RefreshCw size={14} className="animate-spin" /> : null}
            Atualizar agora
          </button>
        )}
        <button
          type="button"
          onClick={() => setState('idle')}
          className="rounded-full border border-white/15 p-2 text-white/80 transition hover:bg-white/5 hover:text-white"
          aria-label="Fechar aviso de atualização"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}

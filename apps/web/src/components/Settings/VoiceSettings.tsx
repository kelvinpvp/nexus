import React, { useCallback, useEffect, useState } from 'react';
import { Check, Headphones, Mic2, MonitorUp, RefreshCw, ShieldCheck, Volume2 } from 'lucide-react';
import { useSettingsStore, UserPreferences } from '@/store/settingsStore';

interface ToggleProps {
  checked: boolean;
  onChange: () => void;
  label: string;
  description: string;
  disabled?: boolean;
}

function Toggle({ checked, onChange, label, description, disabled = false }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={onChange}
      className="flex w-full items-center justify-between gap-5 rounded-xl px-3 py-3 text-left transition-colors hover:bg-white/6 disabled:cursor-not-allowed disabled:opacity-50"
    >
      <span>
        <span className="block text-[15px] font-medium text-white">{label}</span>
        <span className="mt-0.5 block text-sm leading-5 text-slate-400">{description}</span>
      </span>
      <span className={'relative h-6 w-11 shrink-0 rounded-full transition-colors ' + (checked ? 'bg-emerald-400' : 'bg-slate-600')}>
        <span className={'absolute top-1 flex h-4 w-4 items-center justify-center rounded-full bg-white transition-all ' + (checked ? 'left-6' : 'left-1')}>
          {checked && <Check size={11} className="text-emerald-500" />}
        </span>
      </span>
    </button>
  );
}

export default function VoiceSettings() {
  const { preferences, updatePreferences } = useSettingsStore();
  const [audioInputs, setAudioInputs] = useState<MediaDeviceInfo[]>([]);
  const [audioOutputs, setAudioOutputs] = useState<MediaDeviceInfo[]>([]);
  const [deviceError, setDeviceError] = useState('');
  const [isRefreshingDevices, setIsRefreshingDevices] = useState(false);
  const [krispSupported, setKrispSupported] = useState(false);
  const outputSelectionSupported = typeof HTMLMediaElement !== 'undefined' && 'setSinkId' in HTMLMediaElement.prototype;

  const refreshDevices = useCallback(async (requestPermission = false) => {
    if (!navigator.mediaDevices?.enumerateDevices) {
      setDeviceError('Este ambiente não oferece seleção de dispositivos de áudio.');
      return;
    }

    setIsRefreshingDevices(true);
    setDeviceError('');
    let permissionStream: MediaStream | null = null;

    try {
      if (requestPermission) {
        permissionStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      }
      const devices = await navigator.mediaDevices.enumerateDevices();
      setAudioInputs(devices.filter((device) => device.kind === 'audioinput'));
      setAudioOutputs(devices.filter((device) => device.kind === 'audiooutput'));
    } catch (error) {
      setDeviceError('Não foi possível listar os dispositivos. Verifique a permissão do microfone.');
      console.error('[SETTINGS] Falha ao listar dispositivos de áudio:', error);
    } finally {
      permissionStream?.getTracks().forEach((track) => track.stop());
      setIsRefreshingDevices(false);
    }
  }, []);

  useEffect(() => {
    import('@livekit/krisp-noise-filter')
      .then(({ isKrispNoiseFilterSupported }) => setKrispSupported(isKrispNoiseFilterSupported()))
      .catch(() => setKrispSupported(false));
  }, []);

  useEffect(() => {
    let cancelled = false;

    refreshDevices(false);
    const handleDeviceChange = () => {
      if (!cancelled) void refreshDevices(false);
    };
    navigator.mediaDevices?.addEventListener?.('devicechange', handleDeviceChange);

    return () => {
      cancelled = true;
      navigator.mediaDevices?.removeEventListener?.('devicechange', handleDeviceChange);
    };
  }, [refreshDevices]);

  if (!preferences) {
    return (
      <div className="flex min-h-60 items-center justify-center text-slate-400">
        <RefreshCw size={20} className="mr-3 animate-spin" />
        Carregando preferências de voz…
      </div>
    );
  }

  const update = (changes: Partial<UserPreferences>) => {
    void updatePreferences(changes);
  };

  return (
    <div className="max-w-3xl pb-12 text-white">
      <div className="mb-7">
        <p className="mb-1 text-xs font-bold uppercase tracking-[0.14em] text-cyan-300">Áudio e vídeo</p>
        <h2 className="text-2xl font-bold">Voz, câmera e transmissão</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
          Escolha os dispositivos usados no Nexus e controle como sua voz e o áudio compartilhado retornam para você.
        </p>
      </div>

      <section className="mb-5 rounded-2xl border border-white/8 bg-white/5 p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-3">
          <div className="rounded-lg bg-cyan-400/15 p-2 text-cyan-300"><Headphones size={20} /></div>
          <div>
            <h3 className="font-semibold text-white">Dispositivos</h3>
            <p className="text-sm text-slate-400">As mudanças são aplicadas às salas conectadas sem precisar recarregar.</p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-xs font-bold uppercase tracking-wide text-[#B5BAC1]">
            Entrada
            <select
              value={preferences.audioInputDeviceId || 'default'}
              onChange={(event) => update({ audioInputDeviceId: event.target.value })}
              className="mt-2 w-full rounded-xl border border-white/8 bg-[#09111f] p-3 text-sm font-normal normal-case text-white outline-none focus:border-cyan-300/50"
            >
              <option value="default">Padrão do sistema</option>
              {audioInputs.filter((device) => device.deviceId !== 'default').map((device, index) => (
                <option key={device.deviceId} value={device.deviceId}>
                  {device.label || 'Microfone ' + (index + 1)}
                </option>
              ))}
            </select>
          </label>

          <label className="text-xs font-bold uppercase tracking-wide text-[#B5BAC1]">
            Saída
            <select
              value={preferences.audioOutputDeviceId || 'default'}
              disabled={!outputSelectionSupported}
              onChange={(event) => update({ audioOutputDeviceId: event.target.value })}
              className="mt-2 w-full rounded-xl border border-white/8 bg-[#09111f] p-3 text-sm font-normal normal-case text-white outline-none focus:border-cyan-300/50 disabled:opacity-50"
            >
              <option value="default">Padrão do sistema</option>
              {audioOutputs.filter((device) => device.deviceId !== 'default').map((device, index) => (
                <option key={device.deviceId} value={device.deviceId}>
                  {device.label || 'Saída ' + (index + 1)}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => refreshDevices(true)}
            disabled={isRefreshingDevices}
            className="inline-flex items-center gap-2 rounded-full bg-cyan-400/15 px-3 py-2 text-sm font-semibold text-cyan-100 transition-colors hover:bg-cyan-400/25 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw size={15} className={isRefreshingDevices ? 'animate-spin' : ''} />
            Detectar dispositivos
          </button>
          <p className="text-xs leading-5 text-slate-400">
            O Nexus nao mantem uma captura aberta apenas para preencher esta lista.
          </p>
        </div>

        {deviceError && <p className="mt-3 text-sm text-rose-300">{deviceError}</p>}
        {!outputSelectionSupported && (
          <p className="mt-3 text-sm text-amber-300">A seleção de saída não é suportada por este navegador; será usada a saída do sistema.</p>
        )}
        {isRefreshingDevices && <p className="mt-3 text-xs text-slate-400">Atualizando dispositivos…</p>}
      </section>

      <section className="mb-5 rounded-2xl border border-white/8 bg-white/5 p-2">
        <div className="flex items-center gap-3 px-3 pb-2 pt-3">
          <div className="rounded-lg bg-emerald-400/15 p-2 text-emerald-300"><Volume2 size={20} /></div>
          <div>
            <h3 className="font-semibold text-white">Retorno durante transmissões</h3>
            <p className="text-sm text-slate-400">Use fones de ouvido para evitar microfonia.</p>
          </div>
        </div>
        <Toggle
          checked={preferences.monitorOwnVoice ?? false}
          onChange={() => update({ monitorOwnVoice: !(preferences.monitorOwnVoice ?? false) })}
          label="Ouvir minha própria voz"
          description="Mantém desligado por padrão para evitar eco e repetição."
        />
        <Toggle
          checked={preferences.monitorOwnScreenShareAudio ?? false}
          onChange={() => update({ monitorOwnScreenShareAudio: !(preferences.monitorOwnScreenShareAudio ?? false) })}
          label="Ouvir o áudio que estou transmitindo"
          description="Monitora a faixa de áudio da tela ou janela compartilhada."
        />
      </section>

      <section className="mb-5 rounded-2xl border border-white/8 bg-white/5 p-2">
        <div className="flex items-center gap-3 px-3 pb-2 pt-3">
          <div className="rounded-lg bg-cyan-400/15 p-2 text-cyan-300"><Mic2 size={20} /></div>
          <h3 className="font-semibold text-white">Comportamento ao entrar</h3>
        </div>
        <Toggle
          checked={preferences.joinMuted}
          onChange={() => update({ joinMuted: !preferences.joinMuted })}
          label="Entrar com o microfone desligado"
          description="Evita publicar áudio automaticamente ao entrar em canais de voz."
        />
        <Toggle
          checked={preferences.joinDeafened}
          onChange={() => update({ joinDeafened: !preferences.joinDeafened })}
          label="Entrar ensurdecido"
          description="Silencia voz e transmissões recebidas e também desliga seu microfone."
        />
        <Toggle
          checked={preferences.noiseSuppressionEnabled ?? true}
          disabled={!krispSupported}
          onChange={() => update({ noiseSuppressionEnabled: !(preferences.noiseSuppressionEnabled ?? true) })}
          label="Supressão de ruído por IA"
          description={krispSupported ? 'Reduz ruídos contínuos do microfone em tempo real.' : 'Não disponível neste navegador ou WebView.'}
        />
      </section>

      <section className="rounded-2xl border border-white/8 bg-white/5 p-5">
        <div className="mb-4 flex items-center gap-3">
          <div className="rounded-lg bg-amber-400/15 p-2 text-amber-300"><MonitorUp size={20} /></div>
          <div>
            <h3 className="font-semibold text-white">Qualidade de vídeo</h3>
            <p className="text-sm text-slate-400">Resoluções maiores exigem mais upload e processamento.</p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-xs font-bold uppercase tracking-wide text-[#B5BAC1]">
            Câmera
            <select
              value={preferences.cameraQuality || 'AUTO'}
              onChange={(event) => update({ cameraQuality: event.target.value as UserPreferences['cameraQuality'] })}
              className="mt-2 w-full rounded-lg border border-[#111214] bg-[#1E1F22] p-3 text-sm font-normal normal-case text-[#F2F3F5]"
            >
              <option value="AUTO">Automática</option>
              <option value="P720">720p</option>
              <option value="P1080">1080p</option>
            </select>
          </label>
          <label className="text-xs font-bold uppercase tracking-wide text-[#B5BAC1]">
            Transmissão
            <select
              value={preferences.screenShareQuality || 'AUTO'}
              onChange={(event) => update({ screenShareQuality: event.target.value as UserPreferences['screenShareQuality'] })}
              className="mt-2 w-full rounded-lg border border-[#111214] bg-[#1E1F22] p-3 text-sm font-normal normal-case text-[#F2F3F5]"
            >
              <option value="AUTO">Automática</option>
              <option value="P720_30">720p · 30 FPS</option>
              <option value="P1080_30">1080p · 30 FPS</option>
              <option value="P1080_60">1080p · 60 FPS</option>
              <option value="MAX">Máxima disponível</option>
            </select>
          </label>
        </div>
        <div className="mt-4 flex items-start gap-2 rounded-xl bg-[#09111f] p-3 text-xs leading-5 text-slate-300">
          <ShieldCheck size={16} className="mt-0.5 shrink-0 text-emerald-300" />
          O Nexus solicita áudio do sistema quando o navegador ou WebView oferece essa opção. Compartilhar uma guia costuma evitar eco de outros participantes.
        </div>
      </section>
    </div>
  );
}

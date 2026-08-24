import React, { useEffect, useState } from 'react';
import { useSettingsStore } from '@/store/settingsStore';
import { Check } from 'lucide-react';

export default function VoiceSettings() {
  const { preferences, updatePreferences } = useSettingsStore();

  const [joinMuted, setJoinMuted] = useState(preferences?.joinMuted ?? false);
  const [joinDeafened, setJoinDeafened] = useState(preferences?.joinDeafened ?? false);
  const [cameraQuality, setCameraQuality] = useState<"AUTO" | "P720" | "P1080">(preferences?.cameraQuality ?? 'AUTO');
  const [screenShareQuality, setScreenShareQuality] = useState<"AUTO" | "P720_30" | "P1080_30" | "P1080_60" | "MAX">(preferences?.screenShareQuality ?? 'AUTO');
  const [audioInputId, setAudioInputId] = useState<string>(preferences?.audioInputDeviceId ?? 'default');
  const [audioOutputId, setAudioOutputId] = useState<string>(preferences?.audioOutputDeviceId ?? 'default');

  const [audioInputs, setAudioInputs] = useState<MediaDeviceInfo[]>([]);
  const [audioOutputs, setAudioOutputs] = useState<MediaDeviceInfo[]>([]);

  // Sync state if store updates
  useEffect(() => {
    if (preferences) {
      setJoinMuted(preferences.joinMuted);
      setJoinDeafened(preferences.joinDeafened);
      setCameraQuality(preferences.cameraQuality || 'AUTO');
      setScreenShareQuality(preferences.screenShareQuality || 'AUTO');
      setAudioInputId(preferences.audioInputDeviceId || 'default');
      setAudioOutputId(preferences.audioOutputDeviceId || 'default');
    }
  }, [preferences]);

  useEffect(() => {
    async function getDevices() {
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true });
        const devices = await navigator.mediaDevices.enumerateDevices();
        setAudioInputs(devices.filter(d => d.kind === 'audioinput'));
        setAudioOutputs(devices.filter(d => d.kind === 'audiooutput'));
      } catch (err) {
        console.error('Failed to get media devices:', err);
      }
    }
    getDevices();
  }, []);

  const toggleJoinMuted = () => {
    const newValue = !joinMuted;
    setJoinMuted(newValue);
    updatePreferences({ joinMuted: newValue });
  };

  const toggleJoinDeafened = () => {
    const newValue = !joinDeafened;
    setJoinDeafened(newValue);
    updatePreferences({ joinDeafened: newValue });
  };

  const handleCameraQualityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newValue = e.target.value as "AUTO" | "P720" | "P1080";
    setCameraQuality(newValue);
    updatePreferences({ cameraQuality: newValue });
  };

  const handleScreenShareQualityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newValue = e.target.value as "AUTO" | "P720_30" | "P1080_30" | "P1080_60" | "MAX";
    setScreenShareQuality(newValue);
    updatePreferences({ screenShareQuality: newValue });
  };

  const handleAudioInputChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newValue = e.target.value;
    setAudioInputId(newValue);
    updatePreferences({ audioInputDeviceId: newValue });
  };

  const handleAudioOutputChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newValue = e.target.value;
    setAudioOutputId(newValue);
    updatePreferences({ audioOutputDeviceId: newValue });
  };

  return (
    <div className="text-white max-w-2xl">
      <h2 className="text-[20px] font-bold mb-6">Configurações de Voz e Vídeo</h2>

      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase text-[#949BA4] mb-2">Dispositivo de Entrada</label>
            <select 
              value={audioInputId}
              onChange={handleAudioInputChange}
              className="w-full bg-[#1E1F22] border border-[#1E1F22] rounded p-2 text-sm outline-none text-[#DBDEE1]"
            >
              <option value="default">Default (Padrão do Sistema)</option>
              {audioInputs.map(device => (
                <option key={device.deviceId} value={device.deviceId}>
                  {device.label || `Microfone ${device.deviceId.substring(0, 5)}...`}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold uppercase text-[#949BA4] mb-2">Dispositivo de Saída</label>
            <select 
              value={audioOutputId}
              onChange={handleAudioOutputChange}
              className="w-full bg-[#1E1F22] border border-[#1E1F22] rounded p-2 text-sm outline-none text-[#DBDEE1]"
            >
              <option value="default">Default (Padrão do Sistema)</option>
              {audioOutputs.map(device => (
                <option key={device.deviceId} value={device.deviceId}>
                  {device.label || `Alto-falante ${device.deviceId.substring(0, 5)}...`}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="h-px bg-[#3F4147] my-6" />

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase text-[#949BA4] mb-2">Qualidade da Câmera</label>
            <select 
              value={cameraQuality}
              onChange={handleCameraQualityChange}
              className="w-full bg-[#1E1F22] border border-[#1E1F22] rounded p-2 text-sm outline-none text-[#DBDEE1]"
            >
              <option value="AUTO">Automático</option>
              <option value="P720">720p</option>
              <option value="P1080">1080p</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold uppercase text-[#949BA4] mb-2">Qualidade do Compartilhamento (Screen Share)</label>
            <select 
              value={screenShareQuality}
              onChange={handleScreenShareQualityChange}
              className="w-full bg-[#1E1F22] border border-[#1E1F22] rounded p-2 text-sm outline-none text-[#DBDEE1]"
            >
              <option value="AUTO">Automático</option>
              <option value="P720_30">720p 30 FPS</option>
              <option value="P1080_30">1080p 30 FPS</option>
              <option value="P1080_60">1080p 60 FPS</option>
              <option value="MAX">Qualidade Máxima</option>
            </select>
          </div>
        </div>

        <div className="h-px bg-[#3F4147] my-6" />

        <div>
          <h3 className="text-xs font-bold uppercase text-[#949BA4] mb-4">Comportamento de Entrada em Chamadas</h3>
          
          <div className="space-y-4">
            <label className="flex items-center justify-between cursor-pointer group">
              <div>
                <div className="font-medium text-[16px] text-[#DBDEE1]">Entrar mutado</div>
                <div className="text-sm text-[#949BA4]">O microfone ficará desligado automaticamente ao entrar em um canal de voz.</div>
              </div>
              <div 
                onClick={toggleJoinMuted}
                className={`w-10 h-6 rounded-full transition-colors relative flex items-center ${joinMuted ? 'bg-[#23A559]' : 'bg-[#80848E]'}`}
              >
                <div className={`absolute w-4 h-4 bg-white rounded-full transition-all flex items-center justify-center ${joinMuted ? 'left-[22px]' : 'left-1'}`}>
                  {joinMuted && <Check size={12} className="text-[#23A559]" />}
                </div>
              </div>
            </label>

            <label className="flex items-center justify-between cursor-pointer group">
              <div>
                <div className="font-medium text-[16px] text-[#DBDEE1]">Entrar ensurdecido</div>
                <div className="text-sm text-[#949BA4]">Você não ouvirá outros usuários ao entrar em um canal de voz até desativar o deafen.</div>
              </div>
              <div 
                onClick={toggleJoinDeafened}
                className={`w-10 h-6 rounded-full transition-colors relative flex items-center ${joinDeafened ? 'bg-[#23A559]' : 'bg-[#80848E]'}`}
              >
                <div className={`absolute w-4 h-4 bg-white rounded-full transition-all flex items-center justify-center ${joinDeafened ? 'left-[22px]' : 'left-1'}`}>
                  {joinDeafened && <Check size={12} className="text-[#23A559]" />}
                </div>
              </div>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}

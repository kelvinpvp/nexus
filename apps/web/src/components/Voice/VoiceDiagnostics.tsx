import React from 'react';
import { useVoiceDiagnostics } from '@/hooks/useVoiceDiagnostics';
import { X, Copy, Activity } from 'lucide-react';

interface VoiceDiagnosticsProps {
  onClose: () => void;
}

export const VoiceDiagnostics: React.FC<VoiceDiagnosticsProps> = ({ onClose }) => {
  const diagnostics = useVoiceDiagnostics(2000);

  const formatBitrate = (bps: number) => {
    if (bps === 0) return '0 kbps';
    return (bps / 1000).toFixed(1) + ' kbps';
  };

  const copyToClipboard = () => {
    let text = 'Nexus Voice Diagnostics\n\n';
    diagnostics.forEach(p => {
      text += `Participant: ${p.identity} ${p.isLocal ? '(Local)' : ''}\n`;
      p.tracks.forEach(t => {
        text += `  Source: ${t.source} (${t.kind})\n`;
        text += `  Codec: ${t.codec}\n`;
        text += `  Bitrate: ${formatBitrate(t.bitrate)}\n`;
        text += `  Packet Loss: ${t.packetLoss}\n`;
        text += `  Jitter: ${t.jitter}\n`;
        text += `  RTT: ${t.rtt}ms\n\n`;
      });
    });
    navigator.clipboard.writeText(text);
    alert('Diagnóstico copiado para a área de transferência!');
  };

  if (diagnostics.length === 0) {
    return null;
  }

  return (
    <div className="absolute top-16 left-4 z-50 bg-[#1E1F22] border border-[#2B2D31] rounded-lg shadow-xl w-80 text-xs font-mono flex flex-col max-h-[80vh] overflow-hidden">
      <div className="p-2 border-b border-[#2B2D31] flex justify-between items-center bg-[#2B2D31]/50">
        <div className="flex items-center gap-2 text-white/90">
          <Activity size={14} className="text-[#23A559]" />
          <span className="font-semibold">Voice Diagnostics</span>
        </div>
        <div className="flex gap-2">
          <button onClick={copyToClipboard} className="text-[#B5BAC1] hover:text-white" title="Copiar Diagnóstico">
            <Copy size={14} />
          </button>
          <button onClick={onClose} className="text-[#B5BAC1] hover:text-white" title="Fechar">
            <X size={14} />
          </button>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-2 space-y-4">
        {diagnostics.map(p => (
          <div key={p.identity} className="bg-[#2B2D31] rounded p-2 border border-white/5">
            <div className="text-[#DBDEE1] font-bold mb-2 flex items-center gap-2">
              <span className="truncate">{p.identity}</span>
              {p.isLocal && <span className="bg-indigo-500 text-white px-1.5 py-0.5 rounded text-[10px]">LOCAL</span>}
            </div>
            
            {p.tracks.length === 0 ? (
              <div className="text-[#80848E] italic">Sem media tracks</div>
            ) : (
              <div className="space-y-3">
                {p.tracks.map(t => (
                  <div key={t.trackSid} className="space-y-1">
                    <div className="text-white/80 font-semibold border-b border-white/10 pb-1 mb-1">
                      {t.source.toUpperCase()} <span className="text-[#80848E]">({t.kind})</span>
                    </div>
                    <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[#B5BAC1]">
                      <div>Codec: <span className="text-[#DBDEE1]">{t.codec}</span></div>
                      <div>Bitrate: <span className="text-[#DBDEE1]">{formatBitrate(t.bitrate)}</span></div>
                      <div>P.Loss: <span className={t.packetLoss > 10 ? "text-[#F23F43]" : "text-[#DBDEE1]"}>{t.packetLoss}</span></div>
                      <div>Jitter: <span className="text-[#DBDEE1]">{t.jitter.toFixed(3)}</span></div>
                      <div>RTT: <span className="text-[#DBDEE1]">{t.rtt ? `${t.rtt}ms` : 'N/A'}</span></div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

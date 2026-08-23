import { useCallStore } from '@/store/callStore';
import { useAuth } from '@/contexts/AuthContext';
import { Phone, PhoneOff, Video, VideoOff, X, PhoneCall, Mic, MicOff, Monitor, MonitorOff } from 'lucide-react';
import { 
  LiveKitRoom, 
  RoomAudioRenderer, 
  useTracks, 
  VideoTrack,
  useConnectionState,
  useLocalParticipant
} from '@livekit/components-react';
import { Track } from 'livekit-client';
import { useState } from 'react';
import '@livekit/components-styles';

export default function CallManager() {
  const { user } = useAuth();
  const { 
    incomingCall, 
    activeCall, 
    isCallModalOpen, 
    liveKitToken, 
    roomName,
    acceptCall, 
    declineCall, 
    endCall,
    setCallModalOpen
  } = useCallStore();

  const isRinging = activeCall && activeCall.status === 'RINGING';
  const isActive   = activeCall && activeCall.status === 'ACTIVE' && liveKitToken && roomName;

  return (
    <>
      {/* Incoming Call Toast */}
      {incomingCall && !activeCall && (
        <div className="fixed top-4 right-4 z-50 bg-[#1E1F22] border border-[#313338] shadow-xl rounded-lg p-4 w-80 animate-in slide-in-from-right-10">
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-full bg-[#5865F2] flex items-center justify-center text-white font-bold text-2xl mb-3 shadow-lg">
              {incomingCall.initiator?.avatarUrl ? (
                <img src={incomingCall.initiator.avatarUrl} alt="Avatar" className="w-full h-full rounded-full object-cover" />
              ) : (
                incomingCall.initiator?.username.charAt(0).toUpperCase()
              )}
            </div>
            <h3 className="text-white font-bold text-lg mb-1">{incomingCall.initiator?.displayName || incomingCall.initiator?.username}</h3>
            <p className="text-[#949BA4] text-sm mb-4">
              Chamada de {incomingCall.type === 'VIDEO' ? 'Vídeo' : 'Voz'} recebida
            </p>
            <div className="flex justify-center space-x-4 w-full">
              <button 
                onClick={() => declineCall(incomingCall.id)}
                className="flex-1 bg-[#DA373C] hover:bg-[#A12828] text-white py-2 rounded transition-colors flex items-center justify-center font-medium"
              >
                <PhoneOff size={20} className="mr-2" /> Recusar
              </button>
              <button 
                onClick={() => acceptCall(incomingCall.id)}
                className="flex-1 bg-[#23A559] hover:bg-[#1A7C43] text-white py-2 rounded transition-colors flex items-center justify-center font-medium"
              >
                {incomingCall.type === 'VIDEO' ? <Video size={20} className="mr-2" /> : <Phone size={20} className="mr-2" />} 
                Aceitar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Caller: Calling... UI while RINGING */}
      {isCallModalOpen && activeCall && isRinging && (
        <div className="fixed top-4 right-4 z-50 bg-[#1E1F22] border border-[#313338] shadow-xl rounded-lg p-5 w-72 animate-in slide-in-from-right-10">
          <div className="flex flex-col items-center text-center">
            <div className="relative mb-3">
              <div className="w-16 h-16 rounded-full bg-[#5865F2] flex items-center justify-center text-white font-bold text-2xl">
                <PhoneCall size={28} className="animate-pulse" />
              </div>
              <span className="absolute -bottom-1 -right-1 w-5 h-5 bg-[#23A559] rounded-full border-2 border-[#1E1F22] flex items-center justify-center">
                <span className="w-2 h-2 bg-white rounded-full animate-ping" />
              </span>
            </div>
            <p className="text-[#949BA4] text-sm mb-1">Chamando...</p>
            <p className="text-white font-semibold text-base mb-4">
              {activeCall.type === 'VIDEO' ? '📹 Vídeo' : '📞 Voz'}
            </p>
            <button 
              onClick={() => endCall(activeCall.id)}
              className="w-full bg-[#DA373C] hover:bg-[#A12828] text-white py-2 rounded transition-colors flex items-center justify-center font-medium"
            >
              <PhoneOff size={18} className="mr-2" /> Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Active Call Room (LiveKit) - Keep mounted to avoid disconnection */}
      {isActive && (
        <LiveKitRoom
          video={activeCall.type === 'VIDEO'}
          audio={true}
          token={liveKitToken}
          serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL}
          onDisconnected={() => {
            endCall(activeCall.id);
          }}
          style={{ display: 'none' }}
        >
          <DiscordCallWrapper 
            isModalOpen={isCallModalOpen} 
            setModalOpen={setCallModalOpen} 
            endCall={() => endCall(activeCall.id)}
            activeCall={activeCall}
          />
          <RoomAudioRenderer />
        </LiveKitRoom>
      )}
    </>
  );
}

interface DiscordCallWrapperProps {
  isModalOpen: boolean;
  setModalOpen: (open: boolean) => void;
  endCall: () => void;
  activeCall: any;
}

function DiscordCallWrapper({ isModalOpen, setModalOpen, endCall, activeCall }: DiscordCallWrapperProps) {
  const connectionState = useConnectionState();

  if (!isModalOpen) {
    return (
      <div 
        onClick={() => setModalOpen(true)}
        className="fixed bottom-20 right-6 z-50 bg-[#2B2D31] hover:bg-[#35373C] border border-[#1E1F22] shadow-2xl rounded-xl p-3 flex items-center space-x-3 cursor-pointer transition-all duration-200 group animate-in slide-in-from-bottom-10"
      >
        <div className="relative">
          <div className="w-10 h-10 rounded-full bg-[#5865F2] flex items-center justify-center text-white font-bold">
            {activeCall.type === 'VIDEO' ? <Video size={18} /> : <Phone size={18} />}
          </div>
          <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-[#23A559] rounded-full border border-[#2B2D31] animate-pulse" />
        </div>
        <div className="pr-2">
          <p className="text-white text-xs font-bold">Chamada em andamento</p>
          <p className="text-[#949BA4] text-[10px]">Clique para expandir</p>
        </div>
        <button 
          onClick={(e) => {
            e.stopPropagation();
            endCall();
          }}
          className="bg-[#DA373C] hover:bg-[#A12828] text-white p-2 rounded-full transition-colors ml-1"
          title="Desconectar"
        >
          <PhoneOff size={14} />
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#111214] p-0 sm:p-4">
      <div className="bg-[#1E1F22] w-full h-full sm:max-w-6xl sm:h-[85vh] sm:rounded-xl flex flex-col overflow-hidden shadow-2xl border border-[#2B2D31]">
        
        {/* Header */}
        <div className="h-14 bg-[#1E1F22] flex items-center justify-between px-6 border-b border-[#111214] shrink-0">
          <div className="flex items-center text-white font-semibold">
            <div className="w-2 h-2 rounded-full bg-[#23A559] mr-3 animate-pulse" />
            <span>Chamada de {activeCall.type === 'VIDEO' ? 'Vídeo' : 'Voz'}</span>
          </div>
          <div className="flex items-center space-x-3">
            <button 
              onClick={() => setModalOpen(false)}
              className="text-[#949BA4] hover:text-[#DBDEE1] hover:bg-[#35373C] p-2 rounded-full transition-all"
              title="Minimizar chamada"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Main Area */}
        <div className="flex-1 bg-[#111214] relative overflow-hidden">
          {connectionState !== 'connected' && (
            <div className="absolute inset-0 z-50 bg-[#111214]/90 flex flex-col items-center justify-center text-white">
              <div className="w-12 h-12 border-4 border-[#5865F2] border-t-transparent rounded-full animate-spin mb-4" />
              <p className="text-lg font-medium text-[#949BA4]">Conectando à chamada...</p>
            </div>
          )}
          <DiscordCallLayout endCall={endCall} isVideoCall={activeCall.type === 'VIDEO'} />
        </div>
      </div>
    </div>
  );
}

interface DiscordCallLayoutProps {
  endCall: () => void;
  isVideoCall: boolean;
}

function DiscordCallLayout({ endCall, isVideoCall }: DiscordCallLayoutProps) {
  const [isMuted, setIsMuted] = useState(false);
  const [isCamEnabled, setIsCamEnabled] = useState(isVideoCall);
  const [isScreenSharing, setIsScreenSharing] = useState(false);

  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false }
    ],
    { onlySubscribed: false }
  );

  const connectionState = useConnectionState();

  return (
    <div className="flex flex-col h-full justify-between p-4 relative">
      
      {connectionState !== 'connected' && (
        <div className="absolute inset-0 z-50 bg-[#111214]/90 flex flex-col items-center justify-center text-white">
          <div className="w-12 h-12 border-4 border-[#5865F2] border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-lg font-medium text-[#949BA4]">Conectando à chamada...</p>
        </div>
      )}

      <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4 items-center justify-center p-2 overflow-y-auto max-h-[calc(100%-80px)]">
        {tracks.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center text-[#949BA4] h-64">
            <div className="w-20 h-20 rounded-full bg-[#313338] flex items-center justify-center mb-4">
              <Phone size={36} className="text-[#5865F2] animate-bounce" />
            </div>
            <p className="text-lg font-medium text-white">Aguardando participantes...</p>
          </div>
        ) : (
          tracks.map((trackRef) => {
            const isLocal = trackRef.participant.isLocal;
            const hasVideo = trackRef.publication && !trackRef.publication.isMuted;
            const displayName = trackRef.participant.name || trackRef.participant.identity;
            
            return (
              <div 
                key={`${trackRef.participant.sid}-${trackRef.source}`}
                className="relative bg-[#2B2D31] rounded-xl overflow-hidden aspect-video shadow-md border-2 border-transparent hover:border-[#5865F2]/50 transition-all flex items-center justify-center group"
              >
                {trackRef.source === Track.Source.Camera && hasVideo ? (
                  <VideoTrack trackRef={trackRef} className="w-full h-full object-cover" />
                ) : (
                  <div className="flex flex-col items-center justify-center">
                    <div className="w-24 h-24 rounded-full bg-[#5865F2] flex items-center justify-center text-white text-3xl font-bold shadow-lg ring-4 ring-transparent group-hover:ring-[#5865F2]/40 transition-all">
                      {displayName.charAt(0).toUpperCase()}
                    </div>
                  </div>
                )}

                <div className="absolute bottom-3 left-3 bg-[#111214]/60 backdrop-blur-md px-3 py-1.5 rounded-md text-white text-xs font-semibold flex items-center">
                  <span className="max-w-[120px] truncate">{displayName}</span>
                  {isLocal && <span className="ml-1.5 text-[10px] text-[#949BA4]">(Você)</span>}
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="h-20 shrink-0 flex items-center justify-center">
        <div className="bg-[#1E1F22] px-6 py-3 rounded-full flex items-center space-x-4 border border-[#2B2D31] shadow-2xl">
          <button 
            onClick={() => setIsMuted(!isMuted)}
            className={`p-3.5 rounded-full transition-all duration-200 ${isMuted ? 'bg-[#DA373C] text-white hover:bg-[#A12828]' : 'bg-[#313338] text-[#DBDEE1] hover:bg-[#35373C]'}`}
            title={isMuted ? "Desativar Mudo" : "Ativar Mudo"}
          >
            {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
          </button>

          <button 
            onClick={() => setIsCamEnabled(!isCamEnabled)}
            className={`p-3.5 rounded-full transition-all duration-200 ${!isCamEnabled ? 'bg-[#DA373C] text-white hover:bg-[#A12828]' : 'bg-[#313338] text-[#DBDEE1] hover:bg-[#35373C]'}`}
            title={isCamEnabled ? "Desativar Câmera" : "Ativar Câmera"}
          >
            {isCamEnabled ? <Video size={20} /> : <VideoOff size={20} />}
          </button>

          <button 
            onClick={() => setIsScreenSharing(!isScreenSharing)}
            className={`p-3.5 rounded-full transition-all duration-200 ${isScreenSharing ? 'bg-[#23A559] text-white hover:bg-[#1A7C43]' : 'bg-[#313338] text-[#DBDEE1] hover:bg-[#35373C]'}`}
            title="Compartilhar Tela"
          >
            {isScreenSharing ? <MonitorOff size={20} /> : <Monitor size={20} />}
          </button>

          <button 
            onClick={endCall}
            className="p-3.5 rounded-full bg-[#DA373C] hover:bg-[#A12828] text-white transition-all duration-200 shadow-lg transform hover:scale-105 active:scale-95"
            title="Desconectar"
          >
            <PhoneOff size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}

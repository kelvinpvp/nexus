import { useCallStore } from '@/store/callStore';
import { useAuth } from '@/contexts/AuthContext';
import { useSettingsStore } from '@/store/settingsStore';
import { useKrispNoiseSuppression } from '@/hooks/useKrispNoiseSuppression';
import { useVoiceStore } from '@/store/voiceStore';
import { UserContextMenu } from '../Voice/VoiceRoom';
import { Phone, PhoneOff, Video, VideoOff, X, PhoneCall, Mic, MicOff, Monitor, MonitorOff } from 'lucide-react';
import { 
  LiveKitRoom, 
  useTracks, 
  VideoTrack,
  AudioTrack,
  useConnectionState,
  useLocalParticipant,
  useParticipants,
  useTrackToggle
} from '@livekit/components-react';
import { Track } from 'livekit-client';
import { useState, useEffect } from 'react';
import { playSound } from '@/utils/sounds';
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
    leaveCall,
    endCallForEveryone,
    setCallModalOpen
  } = useCallStore();

  const isRinging = activeCall && activeCall.status === 'RINGING';
  const isActive   = activeCall && activeCall.status === 'ACTIVE' && liveKitToken && roomName;

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (incomingCall || (isCallModalOpen && isRinging)) {
      playSound('ring');
      interval = setInterval(() => playSound('ring'), 2500);
    }
    return () => clearInterval(interval);
  }, [incomingCall, isRinging, isCallModalOpen]);

  useEffect(() => {
    if (isActive) {
      playSound('join');
    }
  }, [isActive]);

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
                onClick={() => { playSound('leave'); declineCall(incomingCall.id); }}
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
              onClick={() => { playSound('leave'); leaveCall(activeCall.id); }}
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
          options={{
            publishDefaults: {
              simulcast: true,
              screenShareEncoding: { maxBitrate: 1500000, maxFramerate: 30 }
            }
          }}
          onDisconnected={() => {
            playSound('leave');
            leaveCall(activeCall.id);
          }}
          style={{ display: 'contents' }}
        >
          <DiscordCallWrapper 
            isModalOpen={isCallModalOpen} 
            setModalOpen={setCallModalOpen} 
            leaveCall={() => leaveCall(activeCall.id)}
            endCallForEveryone={() => endCallForEveryone(activeCall.id)}
            activeCall={activeCall}
          />
        </LiveKitRoom>
      )}
    </>
  );
}

interface DiscordCallWrapperProps {
  isModalOpen: boolean;
  setModalOpen: (open: boolean) => void;
  leaveCall: () => void;
  endCallForEveryone: () => void;
  activeCall: any;
}

function DiscordCallWrapper({ isModalOpen, setModalOpen, leaveCall, endCallForEveryone, activeCall }: DiscordCallWrapperProps) {
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
            playSound('leave');
            leaveCall();
          }}
          className="bg-[#DA373C] hover:bg-[#A12828] text-white p-2 rounded-full transition-colors ml-1"
          title="Sair da Chamada"
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
          <DiscordCallLayout 
            leaveCall={leaveCall} 
            endCallForEveryone={endCallForEveryone}
            isVideoCall={activeCall.type === 'VIDEO'} 
          />
        </div>
      </div>
    </div>
  );
}

interface DiscordCallLayoutProps {
  leaveCall: () => void;
  endCallForEveryone: () => void;
  isVideoCall: boolean;
}

function DiscordCallLayout({ leaveCall, endCallForEveryone, isVideoCall }: DiscordCallLayoutProps) {
  const { user } = useAuth();
  const { preferences } = useSettingsStore();
  const { localParticipant } = useLocalParticipant();
  const isMicEnabled = localParticipant?.isMicrophoneEnabled ?? false;

  // Krisp AI noise suppression
  useKrispNoiseSuppression(localParticipant as any, preferences?.noiseSuppressionEnabled ?? true);

  const { toggle: toggleCam, enabled: isCamEnabled } = useTrackToggle({
    source: Track.Source.Camera,
  });

  const isScreenEnabled = localParticipant?.isScreenShareEnabled ?? false;

  const { participantAudioPreferences } = useVoiceStore();
  const [contextMenuUser, setContextMenuUser] = useState<{ userId: string; username: string; x: number; y: number } | null>(null);

  const tracks = useTracks(
    [
      Track.Source.Camera,
      Track.Source.ScreenShare,
      Track.Source.Microphone,
      Track.Source.ScreenShareAudio
    ],
    { onlySubscribed: false }
  );

  const participants = useParticipants();

  // Create visual tracks array
  const visualTracks: any[] = [];
  
  // Add all screen shares
  tracks.filter(t => t.source === Track.Source.ScreenShare).forEach(t => visualTracks.push(t));
  
  // Add exactly one main card per participant (Camera if available, otherwise just use the participant data)
  participants.forEach(p => {
    const camTrack = tracks.find(t => t.participant.identity === p.identity && t.source === Track.Source.Camera);
    if (camTrack) {
      visualTracks.push(camTrack);
    } else {
      // Create a dummy track ref for the avatar card
      visualTracks.push({
        participant: p,
        source: Track.Source.Microphone, // acts as a fallback for avatar
        publication: p.getTrackPublication(Track.Source.Microphone)
      });
    }
  });

  const [focusedTrackId, setFocusedTrackId] = useState<string | null>(null);

  let displayFocusedTrackId = focusedTrackId;
  const screenShareTrack = visualTracks.find(t => t.source === Track.Source.ScreenShare);
  if (!displayFocusedTrackId && screenShareTrack) {
    displayFocusedTrackId = `${screenShareTrack.participant.sid}-${screenShareTrack.source}`;
  }

  const focusedTrack = displayFocusedTrackId ? visualTracks.find(t => `${t.participant.sid}-${t.source}` === displayFocusedTrackId) : null;
  const otherTracks = displayFocusedTrackId ? visualTracks.filter(t => `${t.participant.sid}-${t.source}` !== displayFocusedTrackId) : visualTracks;

  const renderTrack = (trackRef: any, isThumbnail: boolean = false) => {
    const isLocal = trackRef.participant.isLocal;
    const hasVideo = trackRef.publication && !trackRef.publication.isMuted;
    const displayName = trackRef.participant.name || trackRef.participant.identity;
    const isScreen = trackRef.source === Track.Source.ScreenShare;
    const trackId = `${trackRef.participant.sid}-${trackRef.source}`;
    
    let avatarUrl = '';
    try {
      if (trackRef.participant.metadata) {
        const parsed = JSON.parse(trackRef.participant.metadata);
        avatarUrl = parsed.avatarUrl || '';
      }
    } catch (e) {}

    // Fallback to local user avatarUrl if local participant
    if (isLocal && !avatarUrl && user?.avatarUrl) {
      avatarUrl = user.avatarUrl;
    }
    
    return (
      <div 
        key={trackId}
        onClick={() => {
          if (focusedTrackId === trackId) setFocusedTrackId(null);
          else setFocusedTrackId(trackId);
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (!isLocal) {
            setContextMenuUser({
              userId: trackRef.participant.identity,
              username: displayName,
              x: e.clientX,
              y: e.clientY,
            });
          }
        }}
        className={`relative bg-[#2B2D31] rounded-xl overflow-hidden shadow-md border-2 ${displayFocusedTrackId === trackId && !isThumbnail ? 'border-[#5865F2]' : 'border-transparent hover:border-[#5865F2]/50'} transition-all flex items-center justify-center group cursor-pointer ${isThumbnail ? 'aspect-video sm:h-32 w-full shrink-0' : 'w-full h-full'}`}
      >
        <div className="absolute inset-0 z-0 cursor-context-menu" />
        
        {trackRef.source === Track.Source.Camera && hasVideo ? (
          <div className="w-full h-full pointer-events-none z-0">
            <VideoTrack trackRef={trackRef as any} className="w-full h-full object-cover" />
          </div>
        ) : isScreen ? (
          <div className="w-full h-full pointer-events-none z-0">
            <VideoTrack trackRef={trackRef as any} className="w-full h-full object-contain bg-black" />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center z-0 pointer-events-none">
            <div className={`${isThumbnail ? 'w-12 h-12 text-xl' : 'w-24 h-24 text-3xl'} rounded-full bg-[#5865F2] flex items-center justify-center text-white font-bold shadow-lg ring-4 ring-transparent group-hover:ring-[#5865F2]/40 transition-all overflow-hidden`}>
              {avatarUrl ? (
                <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover pointer-events-none" />
              ) : (
                displayName.charAt(0).toUpperCase()
              )}
            </div>
          </div>
        )}

        <div className="absolute bottom-3 left-3 bg-[#111214]/60 backdrop-blur-md px-3 py-1.5 rounded-md text-white text-xs font-semibold flex items-center">
          <span className="max-w-[120px] truncate">{displayName}</span>
          {isLocal && <span className="ml-1.5 text-[10px] text-[#949BA4]">(Você)</span>}
          {isScreen && (
            <span className="ml-2 bg-[#5865F2] text-white text-[9px] px-1 rounded">TELA</span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full justify-between p-4 relative select-none">
      
      {/* Audio Engine */}
      <div className="hidden">
        {tracks.filter(t => t.source === Track.Source.Microphone && !t.participant.isLocal).map((t) => {
          const participant = t.participant;
          const pScreenAudio = tracks.find(st => st.participant.sid === participant.sid && st.source === Track.Source.ScreenShareAudio);
          
          const isLocallyMuted = !!participantAudioPreferences[participant.identity]?.voiceMuted;
          const localVolume = participantAudioPreferences[participant.identity]?.voiceVolume ?? 1;
          const isStreamMuted = !!participantAudioPreferences[participant.identity]?.screenShareMuted;
          const streamVolume = participantAudioPreferences[participant.identity]?.screenShareVolume ?? 1;

          return (
            <div key={`audio-${participant.sid}`}>
              <AudioTrack trackRef={t} volume={isLocallyMuted ? 0 : localVolume} muted={isLocallyMuted} />
              {pScreenAudio && (
                <AudioTrack trackRef={pScreenAudio} volume={isStreamMuted ? 0 : streamVolume} muted={isStreamMuted} />
              )}
            </div>
          );
        })}
      </div>

      {contextMenuUser && (
        <UserContextMenu
          user={contextMenuUser}
          onClose={() => setContextMenuUser(null)}
        />
      )}

      <div className="flex-1 w-full overflow-hidden flex flex-col max-h-[calc(100%-80px)]">
        {visualTracks.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-[#949BA4]">
            <div className="w-20 h-20 rounded-full bg-[#313338] flex items-center justify-center mb-4">
              <Phone size={36} className="text-[#5865F2] animate-bounce" />
            </div>
            <p className="text-lg font-medium text-white">Aguardando participantes...</p>
          </div>
        ) : focusedTrack ? (
          <div className="flex-1 flex flex-col sm:flex-row gap-4 h-full overflow-hidden">
            <div className="flex-1 h-full min-h-[200px]">
              {renderTrack(focusedTrack, false)}
            </div>
            {otherTracks.length > 0 && (
              <div className="flex sm:flex-col gap-3 overflow-x-auto sm:overflow-y-auto w-full sm:w-56 shrink-0 h-32 sm:h-full pb-2 sm:pb-0 sm:pr-2">
                {otherTracks.map(t => renderTrack(t, true))}
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-center justify-center h-full overflow-y-auto p-1">
            {visualTracks.map(t => renderTrack(t, false))}
          </div>
        )}
      </div>

      <div className="h-20 shrink-0 flex items-center justify-center">
        <div className="bg-[#1E1F22] px-6 py-3 rounded-full flex items-center space-x-4 border border-[#2B2D31] shadow-2xl">
          <button 
            onClick={async () => {
              playSound(isMicEnabled ? 'mute' : 'unmute');
              try {
                const deviceId = preferences?.audioInputDeviceId && preferences.audioInputDeviceId !== 'default'
                  ? preferences.audioInputDeviceId
                  : undefined;
                await localParticipant?.setMicrophoneEnabled(!isMicEnabled, deviceId ? { deviceId } : undefined);
              } catch (err) {
                console.error('[CALL] Error toggling mic:', err);
              }
            }}
            className={`p-3.5 rounded-full transition-all duration-200 ${!isMicEnabled ? 'bg-[#DA373C] text-white hover:bg-[#A12828]' : 'bg-[#313338] text-[#DBDEE1] hover:bg-[#35373C]'}`}
            title={!isMicEnabled ? "Ativar Microfone" : "Mudar para Mudo"}
          >
            {!isMicEnabled ? <MicOff size={20} /> : <Mic size={20} />}
          </button>

          <button 
            onClick={() => toggleCam()}
            className={`p-3.5 rounded-full transition-all duration-200 ${!isCamEnabled ? 'bg-[#DA373C] text-white hover:bg-[#A12828]' : 'bg-[#313338] text-[#DBDEE1] hover:bg-[#35373C]'}`}
            title={isCamEnabled ? "Desativar Câmera" : "Ativar Câmera"}
          >
            {isCamEnabled ? <Video size={20} /> : <VideoOff size={20} />}
          </button>

          <button 
            onClick={async () => {
              try {
                if (localParticipant) {
                  await localParticipant.setScreenShareEnabled(!isScreenEnabled, {
                    audio: {
                      echoCancellation: false,
                      noiseSuppression: false,
                      autoGainControl: false,
                      systemAudio: 'include',
                      selfBrowserSurface: 'include',
                    } as any,
                  });
                }
              } catch (err: any) {
                if (err.name !== 'NotAllowedError') {
                  console.error('Error toggling screen share:', err);
                }
              }
            }}
            className={`p-3.5 rounded-full transition-all duration-200 ${isScreenEnabled ? 'bg-[#23A559] text-white hover:bg-[#1A7C43]' : 'bg-[#313338] text-[#DBDEE1] hover:bg-[#35373C]'}`}
            title={isScreenEnabled ? "Parar Compartilhamento" : "Compartilhar Tela"}
          >
            {isScreenEnabled ? <MonitorOff size={20} /> : <Monitor size={20} />}
          </button>

          <button 
            onClick={() => { playSound('leave'); leaveCall(); }}
            className="p-3.5 rounded-full bg-[#DA373C] hover:bg-[#A12828] text-white transition-all duration-200 shadow-lg transform hover:scale-105 active:scale-95"
            title="Sair da Chamada"
          >
            <PhoneOff size={20} />
          </button>

          <button 
            onClick={() => {
              if (confirm('Tem certeza que deseja encerrar a chamada para todos os participantes?')) {
                playSound('leave');
                endCallForEveryone();
              }
            }}
            className="px-3 py-1.5 text-xs font-semibold bg-[#2B2D31] hover:bg-[#DA373C] text-[#949BA4] hover:text-white rounded-lg transition-colors border border-[#3F4147]"
            title="Encerrar Chamada para Todos (Apenas Autorizado)"
          >
            Encerrar p/ Todos
          </button>
        </div>
      </div>
    </div>
  );
}

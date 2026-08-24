'use client';

import React, { useState, useEffect } from 'react';
import {
  LiveKitRoom,
  useParticipants,
  useLocalParticipant,
  useTracks,
  VideoTrack,
  AudioTrack,
  useConnectionState,
  useTrackToggle,
} from '@livekit/components-react';
import { Track, ConnectionState, Participant, LocalParticipant, RoomEvent } from 'livekit-client';
import { useVoiceStore } from '@/store/voiceStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useAuth } from '@/contexts/AuthContext';
import SettingsModal from '@/components/Settings/SettingsModal';
import { VoiceDiagnostics } from './VoiceDiagnostics';
import { useKrispNoiseSuppression } from '@/hooks/useKrispNoiseSuppression';
import { useSearchParams } from 'next/navigation';
import { socket } from '@/lib/socket';
import {
  Mic,
  MicOff,
  Headphones,
  Video,
  VideoOff,
  Monitor,
  PhoneOff,
  Settings,
  Volume2,
  VolumeX,
  Minimize2,
  Shield,
  UserX,
  AlertTriangle,
  Radio,
  ChevronUp,
} from 'lucide-react';

interface VoiceRoomProps {
  channelName: string;
}

export default function VoiceRoom({ channelName }: VoiceRoomProps) {
  const { token, wsUrl } = useVoiceStore();
  const { preferences, isLoading, fetchPreferences } = useSettingsStore();

  useEffect(() => {
    if (!preferences && !isLoading) {
      fetchPreferences();
    }
  }, [preferences, isLoading, fetchPreferences]);

  if (!token || !wsUrl || !preferences) {
    return (
      <div className="flex-1 bg-[#313338] flex flex-col items-center justify-center text-[#949BA4]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#5865F2] mb-4"></div>
        <p>{!preferences ? 'Carregando preferências...' : 'Conectando ao canal de voz...'}</p>
      </div>
    );
  }

  return (
    <LiveKitRoom
      serverUrl={wsUrl}
      token={token}
      connect={true}
      audio={false}
      video={false}
      className="flex-1 bg-[#111214] flex flex-col h-full relative overflow-hidden"
    >
      <VoiceRoomInner channelName={channelName} />
    </LiveKitRoom>
  );
}

function VoiceRoomInner({ channelName }: VoiceRoomProps) {
  const { disconnectFromVoice, participantAudioPreferences, setAudioPreference, connectedVoiceChannelId } = useVoiceStore();
  const participants = useParticipants();
  const { user } = useAuth();
  const { localParticipant, isMicrophoneEnabled, isCameraEnabled, isScreenShareEnabled } = useLocalParticipant();
  const connectionState = useConnectionState();
  const { preferences } = useSettingsStore();

  const [isDeafened, setIsDeafened] = useState(preferences?.joinDeafened || false);
  const [contextMenuUser, setContextMenuUser] = useState<{ userId: string; username: string; x: number; y: number } | null>(null);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [isInitialMicActivating, setIsInitialMicActivating] = useState(false);
  const [hasAttemptedInitialMic, setHasAttemptedInitialMic] = useState(false);
  const searchParams = useSearchParams();

  // Krisp AI noise suppression
  useKrispNoiseSuppression(
    localParticipant as any,
    preferences?.noiseSuppressionEnabled ?? true
  );

  useEffect(() => {
    participants.forEach((p) => {
      if (!participantAudioPreferences[p.identity]) {
        // Initialize preferences implicitly, no need to dispatch if we just read defaults in the component
      }
    });
  }, [participants, participantAudioPreferences]);

  // Initial Microphone State (based on joinMuted preference)
  useEffect(() => {
    if (connectionState === ConnectionState.Connected && localParticipant && preferences) {
      if (!preferences.joinMuted && !isMicrophoneEnabled && !hasAttemptedInitialMic) {
        setHasAttemptedInitialMic(true);
        setIsInitialMicActivating(true);
        const deviceId = preferences.audioInputDeviceId && preferences.audioInputDeviceId !== 'default'
          ? preferences.audioInputDeviceId
          : undefined;
        localParticipant.setMicrophoneEnabled(true, deviceId ? { deviceId } : undefined).catch(err => {
          console.error('[VOICE DEBUG] Failed initial mic auto-enable:', err);
          const errMsg = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
          alert('Não foi possível ativar o microfone automaticamente:\n' + errMsg);
        }).finally(() => {
          setIsInitialMicActivating(false);
        });
      } else if (preferences.joinMuted && !hasAttemptedInitialMic) {
        setHasAttemptedInitialMic(true);
      }
    }
  }, [connectionState, localParticipant, preferences, isMicrophoneEnabled, hasAttemptedInitialMic]);

  // Sync Global Voice State
  useEffect(() => {
    if (user && connectionState === ConnectionState.Connected && connectedVoiceChannelId) {
      socket.emit('join_voice', { channelId: connectedVoiceChannelId, user });
    }
    return () => {
      socket.emit('leave_voice');
    };
  }, [user, connectedVoiceChannelId, connectionState]);

  useEffect(() => {
    if (connectionState === ConnectionState.Connected) {
      socket.emit('update_voice_state', { isMuted: !isMicrophoneEnabled, isDeafened });
    }
  }, [isMicrophoneEnabled, isDeafened, connectionState]);

  // Tracks (Camera, Screen Share, Microphone, and Screen Share Audio)
  const tracks = useTracks([
    Track.Source.Camera, 
    Track.Source.ScreenShare, 
    Track.Source.Microphone, 
    Track.Source.ScreenShareAudio
  ], { onlySubscribed: false });

  const localScreenSharePub = localParticipant?.getTrackPublication(Track.Source.ScreenShare);
  const localScreenShareTrack = localScreenSharePub?.track;

  const screenShareTracks = tracks.filter((t) => t.source === Track.Source.ScreenShare);
  if (localScreenShareTrack) {
    // Evitar duplicação se o useTracks já incluiu a trilha local
    if (!screenShareTracks.some(t => t.participant.sid === localParticipant.sid)) {
      screenShareTracks.push({
        participant: localParticipant,
        source: Track.Source.ScreenShare,
        track: localScreenShareTrack,
        reference: localScreenSharePub
      } as any);
    }
  }

  const [focusedTrack, setFocusedTrack] = useState<any | null>(null);
  const [autoFocusedTrackIds, setAutoFocusedTrackIds] = useState<Set<string>>(new Set());

  // Auto-focus new screen shares
  useEffect(() => {
    if (screenShareTracks.length > 0) {
      const latestTrack = screenShareTracks[screenShareTracks.length - 1];
      const trackId = latestTrack.publication?.trackSid || latestTrack.participant.sid;
      if (trackId && !autoFocusedTrackIds.has(trackId)) {
        setFocusedTrack(latestTrack);
        setAutoFocusedTrackIds(prev => new Set(prev).add(trackId));
      }
    }
    
    // If the focused track was removed, go back to grid
    if (focusedTrack) {
      const stillExists = screenShareTracks.some(t => t.participant.sid === focusedTrack.participant.sid);
      if (!stillExists) {
        setFocusedTrack(null);
      }
    }
  }, [screenShareTracks, focusedTrack, autoFocusedTrackIds]);

  // Handle Deafen
  useEffect(() => {
    if (!localParticipant) return;
    if (isDeafened && localParticipant.isMicrophoneEnabled) {
      localParticipant.setMicrophoneEnabled(false).catch(() => {});
    }
  }, [isDeafened, localParticipant]);

  const toggleDeafen = () => {
    setIsDeafened((prev) => !prev);
  };

  const showDiagnostics = process.env.NEXT_PUBLIC_VOICE_DEBUG === 'true' || searchParams.get('debug') === 'true';

  return (
    <div className="flex-1 flex flex-col h-full bg-[#111214] text-white relative select-none">
      {showDiagnostics && <VoiceDiagnostics onClose={() => {}} />}
      
      {/* Header */}
      <header className="h-12 border-b border-[#1F2023] bg-[#2B2D31] flex items-center justify-between px-4 z-10 flex-shrink-0">
        <div className="flex items-center space-x-2">
          <Radio size={20} className="text-[#23A559] animate-pulse" />
          <h2 className="font-bold text-[15px] text-white">{channelName}</h2>
          <span className="text-xs bg-[#23A559]/20 text-[#23A559] px-2 py-0.5 rounded-full font-medium">
            {connectionState === ConnectionState.Connected 
              ? (isInitialMicActivating ? 'ATIVANDO MICROFONE...' : 'VOZ CONECTADA') 
              : 'CONECTANDO...'}
          </span>
        </div>
        <div className="text-xs text-[#949BA4]">
          {participants.length} {participants.length === 1 ? 'membro' : 'membros'}
        </div>
      </header>

      {/* Permission Error Banner removed for simplification via useTrackToggle */}

      {/* Audio Engine: render all audio tracks unconditionally so they don't drop when UI changes */}
      <div className="hidden">
        {participants.map((participant) => {
          if (participant.isLocal) {
            return null;
          }
          
          const pAudio = tracks.find(t => t.participant?.identity === participant.identity && t.source === Track.Source.Microphone);
          const pScreenAudio = tracks.find(t => t.participant?.identity === participant.identity && t.source === Track.Source.ScreenShareAudio);
          
          const isLocallyMuted = !!participantAudioPreferences[participant.identity]?.voiceMuted;
          const localVolume = Math.min(1, Math.max(0, participantAudioPreferences[participant.identity]?.voiceVolume ?? 1));
          
          const isStreamMuted = !!participantAudioPreferences[participant.identity]?.screenShareMuted;
          const streamVolume = Math.min(1, Math.max(0, participantAudioPreferences[participant.identity]?.screenShareVolume ?? 1));

          return (
            <React.Fragment key={`audio-group-${participant.identity}`}>
              {pAudio && pAudio.publication && (
                <AudioTrack 
                  key={pAudio.publication.trackSid || `mic-${participant.identity}`}
                  trackRef={pAudio} 
                  volume={isLocallyMuted ? 0 : localVolume} 
                  muted={isLocallyMuted} 
                />
              )}
              {pScreenAudio && pScreenAudio.publication && (
                <AudioTrack 
                  key={pScreenAudio.publication.trackSid || `screen-audio-${participant.identity}`}
                  trackRef={pScreenAudio} 
                  volume={isStreamMuted ? 0 : streamVolume} 
                  muted={isStreamMuted} 
                />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Main Grid / Stage */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col justify-center items-center relative">
        {focusedTrack ? (
          /* Focused Stream View (Screen Share or Pinned Cam) */
          <div 
            className="flex-1 w-full h-full flex flex-col items-center justify-center relative bg-black rounded-lg overflow-hidden border border-[#2B2D31]"
            onContextMenu={(e) => {
              e.preventDefault();
              e.stopPropagation();
              const participant = focusedTrack.participant;
              if (participant && !participant.isLocal) {
                let meta: any = {};
                try {
                  meta = JSON.parse(participant.metadata || '{}');
                } catch (err) {}
                const displayName = meta.username || participant.name || participant.identity;

                setContextMenuUser({
                  userId: participant.identity,
                  username: displayName,
                  x: e.clientX,
                  y: e.clientY,
                });
              }
            }}
          >
            {/* Invisible overlay to catch right clicks */}
            <div className="absolute inset-0 z-0 cursor-context-menu" />
            
            <div className="w-full h-full pointer-events-none z-0 relative">
              <VideoTrack trackRef={focusedTrack} className="w-full h-full object-contain" />
            </div>

            <div className="absolute top-3 left-3 bg-black/70 backdrop-blur px-3 py-1.5 rounded-md flex items-center space-x-2 text-xs font-bold text-white z-10">
              <span className="w-2 h-2 rounded-full bg-[#F23F43] animate-ping" />
              <span>TRANSMISSÃO AO VIVO - {focusedTrack.participant?.identity || 'Você'}</span>
            </div>
            <button
              onClick={() => setFocusedTrack(null)}
              className="absolute top-3 right-3 bg-black/70 hover:bg-black p-2 rounded-md text-white text-xs flex items-center space-x-1 z-10"
            >
              <Minimize2 size={16} />
              <span>Voltar para Grade</span>
            </button>
          </div>
        ) : (
          /* Participant Grid */
          <div className="w-full h-full flex items-center justify-center">
            <div
              className={`grid gap-4 w-full max-w-6xl max-h-full overflow-y-auto ${
                participants.length === 1
                  ? 'grid-cols-1 max-w-2xl'
                  : participants.length === 2
                  ? 'grid-cols-2'
                  : participants.length <= 4
                  ? 'grid-cols-2'
                  : 'grid-cols-3'
              }`}
            >
              {participants.map((participant) => {
                const pScreenShare = screenShareTracks.find(t => t.participant.sid === participant.sid);
                return (
                  <ParticipantCard
                    key={participant.sid}
                    participant={participant}
                    allTracks={tracks}
                    screenShareTrack={pScreenShare}
                    onFocusStream={() => {
                      if (pScreenShare) setFocusedTrack(pScreenShare);
                    }}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      let meta: any = {};
                      try {
                        meta = JSON.parse(participant.metadata || '{}');
                      } catch (err) {}
                      const displayName = meta.username || participant.name || participant.identity;

                      setContextMenuUser({
                        userId: participant.identity,
                        username: displayName,
                        x: e.clientX,
                        y: e.clientY,
                      });
                    }}
                    localVolume={participantAudioPreferences[participant.identity]?.voiceVolume ?? 1}
                    isLocallyMuted={!!participantAudioPreferences[participant.identity]?.voiceMuted}
                    streamVolume={participantAudioPreferences[participant.identity]?.screenShareVolume ?? 1}
                    isStreamMuted={!!participantAudioPreferences[participant.identity]?.screenShareMuted}
                  />
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Control Bar (Bottom) */}
      <div className="h-20 bg-[#1E1F22] border-t border-[#2B2D31] flex items-center justify-center space-x-4 px-6 flex-shrink-0 z-10">
        {/* Mic Button Group */}
        <div className="flex items-center">
          <button
            onClick={async () => {
              if (!localParticipant) return;
              try {
                if (isDeafened) setIsDeafened(false);
                const deviceId = preferences?.audioInputDeviceId && preferences.audioInputDeviceId !== 'default'
                  ? preferences.audioInputDeviceId
                  : undefined;
                await localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled, deviceId ? { deviceId } : undefined);
                console.log('[VOICE DEBUG] Microphone toggled. New state:', !isMicrophoneEnabled, 'Device:', deviceId ?? 'default');
              } catch (err) {
                console.error('[VOICE DEBUG] Error toggling microphone:', err);
                const errMsg = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
                alert('Erro ao acessar o microfone:\n' + errMsg + '\nVerifique se o dispositivo está conectado e não está sendo usado por outro app.');
              }
            }}
            className={`h-12 w-12 rounded-l-full flex items-center justify-center transition-all ${
              isInitialMicActivating
                ? 'bg-yellow-600 animate-pulse text-white'
                : isMicrophoneEnabled 
                  ? 'bg-[#2B2D31] hover:bg-[#35373C] text-white' 
                  : 'bg-[#F23F43] hover:bg-[#D83A3E] text-white'
            }`}
            title={isMicrophoneEnabled ? 'Mutar Microfone' : 'Desmutar Microfone'}
            disabled={isInitialMicActivating}
          >
            {isMicrophoneEnabled ? <Mic size={22} /> : <MicOff size={22} />}
          </button>
          <button
            onClick={() => setShowSettingsModal(true)}
            className={`h-12 w-6 rounded-r-full flex items-center justify-center transition-all border-l border-[#1F2023] ${
              isMicrophoneEnabled 
                ? 'bg-[#2B2D31] hover:bg-[#35373C] text-white' 
                : 'bg-[#F23F43] hover:bg-[#D83A3E] text-white'
            }`}
            title="Configurações de Voz"
          >
            <ChevronUp size={14} />
          </button>
        </div>

        {/* Deafen Button */}
        <button
          onClick={toggleDeafen}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
            !isDeafened ? 'bg-[#2B2D31] hover:bg-[#35373C] text-white' : 'bg-[#F23F43] hover:bg-[#D83A3E] text-white'
          }`}
          title={isDeafened ? 'Ativar Áudio (Deafen Off)' : 'Ensurdecer (Deafen On)'}
        >
          <Headphones size={22} />
        </button>

        {/* Camera Button */}
        <button
          onClick={async () => {
            if (!localParticipant) return;
            try {
              let resolution: any = undefined;
              if (!isCameraEnabled && preferences?.cameraQuality) {
                switch (preferences.cameraQuality) {
                  case 'P720':
                    resolution = { width: 1280, height: 720, frameRate: 30 };
                    break;
                  case 'P1080':
                    resolution = { width: 1920, height: 1080, frameRate: 30 };
                    break;
                  case 'AUTO':
                  default:
                    resolution = undefined;
                    break;
                }
              }

              await localParticipant.setCameraEnabled(!isCameraEnabled, {
                resolution
              });
              console.log('[VOICE DEBUG] Camera toggled. New state:', !isCameraEnabled, 'Resolution:', resolution);
            } catch (err) {
              console.error('[VOICE DEBUG] Error toggling camera:', err);
              alert('Erro ao acessar a câmera. Verifique as permissões do navegador.');
            }
          }}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
            isCameraEnabled ? 'bg-[#23A559] hover:bg-[#1F924E] text-white' : 'bg-[#2B2D31] hover:bg-[#35373C] text-white'
          }`}
          title={isCameraEnabled ? 'Desligar Câmera' : 'Ligar Câmera'}
        >
          {isCameraEnabled ? <Video size={22} /> : <VideoOff size={22} />}
        </button>

        {/* Screen Share Button */}
        <button
          onClick={async () => {
            if (!localParticipant) return;
            try {
              let resolution: any = undefined;
              if (!isScreenShareEnabled && preferences?.screenShareQuality) {
                switch (preferences.screenShareQuality) {
                  case 'P720_30':
                    resolution = { width: 1280, height: 720, frameRate: 30 };
                    break;
                  case 'P1080_30':
                    resolution = { width: 1920, height: 1080, frameRate: 30 };
                    break;
                  case 'P1080_60':
                    resolution = { width: 1920, height: 1080, frameRate: 60 };
                    break;
                  case 'MAX':
                    resolution = { width: 3840, height: 2160, frameRate: 60 };
                    break;
                  case 'AUTO':
                  default:
                    // AUTO will not set a specific resolution, letting LiveKit/browser optimize
                    resolution = undefined;
                    break;
                }
              }

              await localParticipant.setScreenShareEnabled(!isScreenShareEnabled, { 
                audio: {
                  echoCancellation: false,
                  noiseSuppression: false,
                  autoGainControl: false,
                  systemAudio: 'include',
                  selfBrowserSurface: 'exclude',
                } as any,
                resolution
              });
              console.log('[VOICE DEBUG] Screen share toggled. New state:', !isScreenShareEnabled, 'Resolution:', resolution);
            } catch (err: any) {
              if (err.name === 'NotAllowedError') {
                console.warn('[VOICE DEBUG] Screen share cancelled by user');
              } else {
                console.error('[VOICE DEBUG] Error toggling screen share:', err);
                if (!isScreenShareEnabled) {
                  alert('O compartilhamento de tela falhou: ' + err.message);
                }
              }
            }
          }}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
            isScreenShareEnabled ? 'bg-[#23A559] hover:bg-[#1F924E] text-white' : 'bg-[#2B2D31] hover:bg-[#35373C] text-white'
          }`}
          title={isScreenShareEnabled ? 'Parar Compartilhamento' : 'Compartilhar Tela'}
        >
          <Monitor size={22} />
        </button>

        {/* Settings Button */}
        <button
          onClick={() => setShowSettingsModal(true)}
          className="w-12 h-12 bg-[#2B2D31] hover:bg-[#35373C] text-white rounded-full flex items-center justify-center transition-all"
          title="Configurações de Voz"
        >
          <Settings size={22} />
        </button>

        {/* Disconnect Button (Red) */}
        <button
          onClick={disconnectFromVoice}
          className="w-12 h-12 bg-[#F23F43] hover:bg-[#D83A3E] text-white rounded-full flex items-center justify-center transition-all shadow-lg ml-4"
          title="Sair da Chamada"
        >
          <PhoneOff size={22} />
        </button>
      </div>

      {/* Context Menu Modal */}
      {contextMenuUser && (
        <UserContextMenu
          user={contextMenuUser}
          onClose={() => setContextMenuUser(null)}
        />
      )}

      {/* Comprehensive Settings Modal */}
      {showSettingsModal && (
        <SettingsModal onClose={() => setShowSettingsModal(false)} initialTab="voice" />
      )}
    </div>
  );
}

// Helper Component for Media Buttons (Removed, using direct participant methods now)

// Single Participant Card Component in Grid
function ParticipantCard({
  participant,
  allTracks,
  screenShareTrack,
  onFocusStream,
  onContextMenu,
  localVolume,
  isLocallyMuted,
  streamVolume,
  isStreamMuted,
}: {
  participant: Participant;
  allTracks: any[];
  screenShareTrack?: any;
  onFocusStream: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
  localVolume?: number;
  isLocallyMuted?: boolean;
  streamVolume?: number;
  isStreamMuted?: boolean;
}) {
  const cameraTrack = allTracks.find(
    (t) => t.participant?.identity === participant.identity && t.source === Track.Source.Camera
  );
  
  const audioTrack = allTracks.find(
    (t) => t.participant?.identity === participant.identity && t.source === Track.Source.Microphone
  );

  const screenAudioTrack = allTracks.find(
    (t) => t.participant?.identity === participant.identity && t.source === Track.Source.ScreenShareAudio
  );

  const isSpeaking = participant.isSpeaking;
  const isMuted = !participant.isMicrophoneEnabled;

  let meta: any = {};
  try {
    meta = JSON.parse(participant.metadata || '{}');
  } catch (err) {}

  const displayName = meta.username || participant.name || participant.identity;
  const avatarUrl = meta.avatarUrl;

  return (
    <div
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (onContextMenu) onContextMenu(e);
      }}
      className={`relative bg-[#2B2D31] rounded-xl overflow-hidden flex flex-col items-center justify-center min-h-[220px] h-full shadow-md transition-all duration-150 border-2 ${
        isSpeaking ? 'border-[#23A559] shadow-[0_0_15px_rgba(35,165,89,0.4)]' : 'border-transparent'
      }`}
    >
      {/* Invisible overlay to catch right clicks consistently */}
      <div className="absolute inset-0 z-0 cursor-context-menu" />
      {/* Audio tracks are now handled globally in VoiceRoomInner to prevent unmounting */}

      {cameraTrack ? (
        <div className="w-full h-full pointer-events-none z-0">
          <VideoTrack trackRef={cameraTrack} className="w-full h-full object-cover" />
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center space-y-3 z-0 pointer-events-none">
          <div className="w-20 h-20 rounded-full bg-[#5865F2] flex items-center justify-center text-white font-bold text-2xl relative shadow-lg">
            {avatarUrl ? (
              <img src={avatarUrl} alt="Avatar" className="w-full h-full rounded-full object-cover pointer-events-none" />
            ) : (
              displayName.charAt(0).toUpperCase()
            )}
            {isSpeaking && (
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-[#23A559] rounded-full border-2 border-[#2B2D31] flex items-center justify-center">
                <Mic size={14} className="text-white" />
              </div>
            )}
          </div>
          <span className="font-bold text-white text-base">{displayName}</span>
        </div>
      )}

      {/* Badges on Bottom Left of Card */}
      <div className="absolute bottom-3 left-3 flex flex-col space-y-2">
        <div className="bg-black/60 backdrop-blur px-2.5 py-1 rounded-md flex items-center space-x-1.5 text-xs text-white w-max">
          {isMuted && <MicOff size={14} className="text-[#F23F43]" />}
          <span>{displayName}</span>
        </div>
      </div>

      {/* LIVE Stream overlay button */}
      {screenShareTrack && (
        <div className="absolute top-3 right-3 flex flex-col items-end space-y-2">
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onFocusStream();
            }}
            className="bg-[#F23F43] hover:bg-[#D83A3E] text-white px-2 py-1 rounded text-xs font-bold flex items-center space-x-1 shadow-lg cursor-pointer transition-colors animate-pulse"
          >
            <span className="w-1.5 h-1.5 bg-white rounded-full"></span>
            <span>LIVE</span>
          </button>
          
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onFocusStream();
            }}
            className="bg-black/70 hover:bg-black text-white px-2 py-1 rounded text-[10px] font-bold uppercase transition-colors"
          >
            Assistir Transmissão
          </button>
        </div>
      )}
    </div>
  );
}

// Right Click Context Menu
export function UserContextMenu({
  user,
  onClose,
}: {
  user: { userId: string; username: string; x: number; y: number };
  onClose: () => void;
}) {
  const { participantAudioPreferences, setAudioPreference } = useVoiceStore();
  const prefs = participantAudioPreferences[user.userId] || {
    voiceVolume: 1,
    voiceMuted: false,
    screenShareVolume: 1,
    screenShareMuted: false
  };

  const [position, setPosition] = useState({ x: user.x, y: user.y });
  const menuRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      let newX = user.x;
      let newY = user.y;

      if (newX + rect.width > window.innerWidth) {
        newX = window.innerWidth - rect.width - 10;
      }
      if (newY + rect.height > window.innerHeight) {
        newY = window.innerHeight - rect.height - 10;
      }

      setPosition({ x: Math.max(10, newX), y: Math.max(10, newY) });
    }
  }, [user.x, user.y]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    
    // Add small delay to prevent immediate close on the same click that opened it
    setTimeout(() => {
      window.addEventListener('click', handleClickOutside);
      window.addEventListener('keydown', handleKeyDown);
    }, 10);
    
    return () => {
      window.removeEventListener('click', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  return (
    <div
      ref={menuRef}
      style={{ top: `${position.y}px`, left: `${position.x}px` }}
      className="fixed z-50 w-64 bg-[#111214] border border-[#2B2D31] rounded-lg shadow-2xl p-1.5 text-sm text-[#DBDEE1]"
      onClick={(e) => e.stopPropagation()}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div className="px-3 py-1.5 font-bold text-white border-b border-[#2B2D31] mb-1 truncate">{user.username}</div>

      <div className="max-h-[70vh] overflow-y-auto">
        {/* Voice Audio Settings */}
        <div className="px-3 py-2 space-y-1">
          <div className="flex items-center justify-between text-xs font-bold text-[#949BA4] mb-2 uppercase">
            Áudio da Voz
          </div>
          <div className="flex items-center justify-between text-xs text-[#B5BAC1]">
            <span>Volume</span>
            <span>{Math.round(prefs.voiceVolume * 100)}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={prefs.voiceVolume}
            onChange={(e) => setAudioPreference(user.userId, 'voiceVolume', parseFloat(e.target.value))}
            className="w-full accent-[#5865F2] cursor-pointer"
          />
        </div>

        <button
          onClick={() => setAudioPreference(user.userId, 'voiceMuted', !prefs.voiceMuted)}
          className="w-full text-left px-3 py-2 rounded hover:bg-[#5865F2] hover:text-white flex items-center space-x-2 transition-colors"
        >
          {prefs.voiceMuted ? <Volume2 size={16} /> : <VolumeX size={16} />}
          <span>{prefs.voiceMuted ? 'Ouvir Voz' : 'Silenciar Voz para mim'}</span>
        </button>

        <div className="my-1.5 border-t border-[#2B2D31]" />

        {/* Screen Share Audio Settings */}
        <div className="px-3 py-2 space-y-1">
          <div className="flex items-center justify-between text-xs font-bold text-[#949BA4] mb-2 uppercase">
            Áudio da Transmissão
          </div>
          <div className="flex items-center justify-between text-xs text-[#B5BAC1]">
            <span>Volume</span>
            <span>{Math.round(prefs.screenShareVolume * 100)}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={prefs.screenShareVolume}
            onChange={(e) => setAudioPreference(user.userId, 'screenShareVolume', parseFloat(e.target.value))}
            className="w-full accent-[#5865F2] cursor-pointer"
          />
        </div>

        <button
          onClick={() => setAudioPreference(user.userId, 'screenShareMuted', !prefs.screenShareMuted)}
          className="w-full text-left px-3 py-2 rounded hover:bg-[#5865F2] hover:text-white flex items-center space-x-2 transition-colors"
        >
          {prefs.screenShareMuted ? <Monitor size={16} /> : <Monitor size={16} />}
          <span>{prefs.screenShareMuted ? 'Ouvir Transmissão' : 'Silenciar Transmissão'}</span>
        </button>

        <div className="my-1.5 border-t border-[#2B2D31]" />

        {/* Admin Actions */}
        <div className="px-3 py-1 text-xs font-bold text-[#949BA4] uppercase">
          Moderação
        </div>
        <button className="w-full text-left px-3 py-1.5 rounded hover:bg-[#F23F43] hover:text-white flex items-center space-x-2 text-[#F23F43] transition-colors mt-1">
          <Shield size={16} />
          <span>Mutar membro no servidor</span>
        </button>
        <button className="w-full text-left px-3 py-1.5 rounded hover:bg-[#F23F43] hover:text-white flex items-center space-x-2 text-[#F23F43] transition-colors">
          <Headphones size={16} />
          <span>Ensurdecer no servidor</span>
        </button>
        <button className="w-full text-left px-3 py-1.5 rounded hover:bg-[#F23F43] hover:text-white flex items-center space-x-2 text-[#F23F43] transition-colors">
          <UserX size={16} />
          <span>Desconectar da Voz</span>
        </button>
      </div>
    </div>
  );
}



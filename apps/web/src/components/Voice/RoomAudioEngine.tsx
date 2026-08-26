'use client';

import { AudioTrack, useRoomContext, useTracks } from '@livekit/components-react';
import { RoomEvent, Track } from 'livekit-client';
import { useEffect, useMemo, useState } from 'react';
import { Volume2 } from 'lucide-react';
import { useSettingsStore } from '@/store/settingsStore';
import { useVoiceStore } from '@/store/voiceStore';

interface RoomAudioEngineProps {
  deafened?: boolean;
}

/**
 * Keeps every room audio element mounted in one place. We never play the local
 * microphone back into the speakers, which avoids self-echo during calls and
 * screen-sharing sessions.
 */
export default function RoomAudioEngine({ deafened = false }: RoomAudioEngineProps) {
  const room = useRoomContext();
  const { preferences } = useSettingsStore();
  const participantAudioPreferences = useVoiceStore((state) => state.participantAudioPreferences);
  const [canPlayAudio, setCanPlayAudio] = useState(room.canPlaybackAudio);

  const tracks = useTracks(
    [Track.Source.Microphone, Track.Source.ScreenShareAudio, Track.Source.Unknown],
    { onlySubscribed: false },
  );

  useEffect(() => {
    const syncPlaybackState = () => setCanPlayAudio(room.canPlaybackAudio);
    syncPlaybackState();
    room.on(RoomEvent.AudioPlaybackStatusChanged, syncPlaybackState);
    return () => {
      room.off(RoomEvent.AudioPlaybackStatusChanged, syncPlaybackState);
    };
  }, [room]);

  useEffect(() => {
    const outputDeviceId = preferences?.audioOutputDeviceId;
    if (!outputDeviceId) return;

    room.switchActiveDevice('audiooutput', outputDeviceId, false).catch((error) => {
      console.warn('[VOICE] Não foi possível aplicar o dispositivo de saída selecionado.', error);
    });
  }, [preferences?.audioOutputDeviceId, room]);

  const audioTracks = useMemo(() => {
    const byId = new Map<string, (typeof tracks)[number]>();

    for (const trackRef of tracks) {
      if (trackRef.publication?.kind !== Track.Kind.Audio) continue;
      const key = trackRef.publication.trackSid || trackRef.participant.sid + '-' + trackRef.source;
      byId.set(key, trackRef);
    }

    // useTracks may briefly omit local publications while a share is starting.
    for (const source of [Track.Source.Microphone, Track.Source.ScreenShareAudio]) {
      const publication = room.localParticipant.getTrackPublication(source);
      if (!publication?.track) continue;
      const key = publication.trackSid || room.localParticipant.sid + '-' + source;
      if (!byId.has(key)) {
        byId.set(key, {
          participant: room.localParticipant,
          publication,
          source,
        } as (typeof tracks)[number]);
      }
    }

    return [...byId.values()];
  }, [room.localParticipant, tracks]);

  return (
    <>
      <div className="hidden" aria-hidden="true">
        {audioTracks.map((trackRef) => {
          const isLocal = trackRef.participant.isLocal;
          const isMicrophone = trackRef.source === Track.Source.Microphone;
          const isScreenAudio = trackRef.source === Track.Source.ScreenShareAudio;

          if (isLocal) {
            if (isMicrophone) return null;
            if (!room.localParticipant.isScreenShareEnabled) return null;
            if (isScreenAudio && !preferences?.monitorOwnScreenShareAudio) return null;
            if (!isScreenAudio) return null;
          }

          const participantPreferences = participantAudioPreferences[trackRef.participant.identity];
          const locallyMuted = isScreenAudio
            ? participantPreferences?.screenShareMuted ?? false
            : participantPreferences?.voiceMuted ?? false;
          const volume = isScreenAudio
            ? participantPreferences?.screenShareVolume ?? 1
            : participantPreferences?.voiceVolume ?? 1;
          const muted = deafened || locallyMuted;

          return (
            <AudioTrack
              key={trackRef.publication.trackSid || trackRef.participant.sid + '-' + trackRef.source}
              trackRef={trackRef}
              volume={muted ? 0 : Math.min(1, Math.max(0, volume))}
              muted={muted}
            />
          );
        })}
      </div>

      {!canPlayAudio && (
        <button
          type="button"
          onClick={() => room.startAudio()}
          className="absolute left-1/2 top-16 z-40 flex -translate-x-1/2 items-center gap-2 rounded-full bg-[#5865F2] px-4 py-2 text-sm font-semibold text-white shadow-xl hover:bg-[#4752C4]"
        >
          <Volume2 size={17} />
          Ativar áudio da chamada
        </button>
      )}
    </>
  );
}

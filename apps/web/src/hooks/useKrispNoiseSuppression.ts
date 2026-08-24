import { useEffect, useRef } from 'react';
import { LocalParticipant, Track } from 'livekit-client';

/**
 * Applies or removes Krisp AI noise suppression on the local microphone track.
 * Safely dynamic-imports the Krisp package so the app does not crash
 * in browsers where AudioWorklets are not supported.
 */
export function useKrispNoiseSuppression(
  localParticipant: LocalParticipant | undefined,
  enabled: boolean
) {
  const activeRef = useRef<boolean>(false);

  useEffect(() => {
    if (!localParticipant) return;

    // Use the correct LiveKit API to get the microphone track
    const micTrackPub = localParticipant.getTrackPublication(Track.Source.Microphone);
    const audioTrack = (micTrackPub as any)?.audioTrack ?? (micTrackPub as any)?.track;

    if (!audioTrack) return;

    let cancelled = false;

    async function apply() {
      try {
        const { KrispNoiseFilter, isKrispNoiseFilterSupported } = await import(
          '@livekit/krisp-noise-filter'
        );

        if (cancelled) return;

        if (enabled && !activeRef.current) {
          if (!isKrispNoiseFilterSupported()) {
            console.warn('[Krisp] Not supported in this browser.');
            return;
          }
          const filter = KrispNoiseFilter();
          await audioTrack.setProcessor(filter);
          activeRef.current = true;
          console.log('[Krisp] Noise suppression ENABLED');
        } else if (!enabled && activeRef.current) {
          // stopProcessor() is the correct LiveKit API to remove a processor
          if (typeof audioTrack.stopProcessor === 'function') {
            await audioTrack.stopProcessor();
          } else {
            await audioTrack.setProcessor(null as any);
          }
          activeRef.current = false;
          console.log('[Krisp] Noise suppression DISABLED');
        }
      } catch (err) {
        console.error('[Krisp] Failed to apply processor:', err);
        activeRef.current = false;
      }
    }

    apply();

    return () => {
      cancelled = true;
    };
  // Re-run whenever mic track becomes active OR enabled flag changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localParticipant?.isMicrophoneEnabled, enabled]);
}

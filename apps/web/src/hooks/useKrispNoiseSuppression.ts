import { useEffect, useRef } from 'react';
import { LocalParticipant } from 'livekit-client';

/**
 * Applies or removes Krisp AI noise suppression on the local microphone track.
 * Safely dynamic-imports the Krisp package so the app doesn't crash
 * in browsers where AudioWorklets are not supported.
 */
export function useKrispNoiseSuppression(
  localParticipant: LocalParticipant | undefined,
  enabled: boolean
) {
  const processorRef = useRef<any>(null);

  useEffect(() => {
    if (!localParticipant) return;

    const micTrackPub = localParticipant.getTrackPublication('microphone' as any);
    const audioTrack = (micTrackPub as any)?.track;

    if (!audioTrack) return;

    let cancelled = false;

    async function apply() {
      try {
        const { KrispNoiseFilter, isKrispNoiseFilterSupported } = await import(
          '@livekit/krisp-noise-filter'
        );

        if (cancelled) return;

        if (enabled) {
          if (!isKrispNoiseFilterSupported()) {
            console.warn('[Krisp] Not supported in this browser.');
            return;
          }
          if (processorRef.current) {
            await audioTrack.setProcessor(null);
            processorRef.current = null;
          }
          const filter = KrispNoiseFilter();
          await audioTrack.setProcessor(filter);
          processorRef.current = filter;
          console.log('[Krisp] Noise suppression ENABLED');
        } else {
          if (processorRef.current) {
            await audioTrack.setProcessor(null);
            processorRef.current = null;
            console.log('[Krisp] Noise suppression DISABLED');
          }
        }
      } catch (err) {
        console.error('[Krisp] Failed to apply processor:', err);
      }
    }

    apply();

    return () => {
      cancelled = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localParticipant?.isMicrophoneEnabled, enabled]);
}

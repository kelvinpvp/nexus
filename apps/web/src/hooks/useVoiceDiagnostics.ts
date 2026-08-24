import { useEffect, useState } from 'react';
import { useRoomContext } from '@livekit/components-react';
import { Track } from 'livekit-client';

export interface TrackDiagnostics {
  trackSid: string;
  source: Track.Source;
  codec: string;
  bitrate: number; // in bps
  packetLoss: number;
  jitter: number;
  rtt: number;
  kind: 'audio' | 'video';
}

export interface ParticipantDiagnostics {
  identity: string;
  isLocal: boolean;
  tracks: TrackDiagnostics[];
}

export function useVoiceDiagnostics(intervalMs = 2000) {
  const room = useRoomContext();
  const [diagnostics, setDiagnostics] = useState<ParticipantDiagnostics[]>([]);

  useEffect(() => {
    if (!room) return;

    let previousBytes: Record<string, number> = {};
    let previousTimestamp: Record<string, number> = {};

    const collectStats = async () => {
      const statsMap: ParticipantDiagnostics[] = [];
      const participants = [room.localParticipant, ...Array.from(room.remoteParticipants.values())];

      for (const p of participants) {
        const pStats: ParticipantDiagnostics = {
          identity: p.identity,
          isLocal: p === room.localParticipant,
          tracks: []
        };

        const publications = Array.from((p.trackPublications as any).values()) as any[];
        for (const pub of publications) {
          if (!pub.track) continue;
          
          try {
            const rtcStats = await (pub.track as any).getRTCStats();
            if (!rtcStats) continue;

            let codec = 'unknown';
            let bytes = 0;
            let packetsLost = 0;
            let jitter = 0;
            let rtt = 0;
            const now = performance.now();

            rtcStats.forEach((stat: any) => {
              if (stat.type === 'codec') {
                if (stat.mimeType) codec = stat.mimeType.split('/')[1] || codec;
              }
              if (stat.type === 'inbound-rtp' || stat.type === 'outbound-rtp') {
                bytes = stat.type === 'inbound-rtp' ? stat.bytesReceived : stat.bytesSent;
                if (stat.type === 'inbound-rtp') {
                  packetsLost = stat.packetsLost || 0;
                  jitter = stat.jitter || 0;
                }
              }
              if (stat.type === 'candidate-pair' && stat.state === 'succeeded') {
                rtt = stat.currentRoundTripTime || stat.roundTripTime || rtt;
              }
              if (stat.type === 'remote-inbound-rtp') {
                rtt = stat.roundTripTime || rtt;
                packetsLost = stat.packetsLost || packetsLost;
                jitter = stat.jitter || jitter;
              }
            });

            // Calculate bitrate
            const prevBytes = previousBytes[pub.trackSid] || 0;
            const prevTime = previousTimestamp[pub.trackSid] || (now - intervalMs);
            const timeDiff = (now - prevTime) / 1000;
            
            let bitrate = 0;
            if (timeDiff > 0 && bytes >= prevBytes) {
              bitrate = ((bytes - prevBytes) * 8) / timeDiff;
            }

            previousBytes[pub.trackSid] = bytes;
            previousTimestamp[pub.trackSid] = now;

            pStats.tracks.push({
              trackSid: pub.trackSid,
              source: pub.source,
              kind: pub.kind as any,
              codec,
              bitrate,
              packetLoss: packetsLost,
              jitter,
              rtt
            });
          } catch (err) {
            // Stats not available for this track
          }
        }
        
        if (pStats.tracks.length > 0) {
          statsMap.push(pStats);
        }
      }
      setDiagnostics(statsMap);
    };

    const intervalId = setInterval(collectStats, intervalMs);
    collectStats(); // initial collection

    return () => clearInterval(intervalId);
  }, [room, intervalMs]);

  return diagnostics;
}

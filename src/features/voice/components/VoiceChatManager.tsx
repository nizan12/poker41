'use client';

import { useEffect, useRef, useState } from 'react';
import { useGameStore } from '@/features/game/stores/gameStore';
import { useUIStore } from '@/features/game/stores/uiStore';

// We dynamically import peerjs to avoid SSR issues
export function VoiceChatManager() {
  const { room, players, localPlayerId } = useGameStore();
  const { isMicOn } = useUIStore();
  
  const peerRef = useRef<any>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  
  // Keep track of connected peers and their audio elements
  const [remoteStreams, setRemoteStreams] = useState<Record<string, MediaStream>>({});

  useEffect(() => {
    if (!room || !localPlayerId || typeof window === 'undefined') return;

    const initPeer = async () => {
      try {
        const { default: Peer } = await import('peerjs');
        // Predictable ID: poker41-{roomId}-{playerId}
        const myPeerId = `poker41-${room.id}-${localPlayerId}`;
        
        const peer = new Peer(myPeerId, {
          debug: 2,
        });

        peer.on('open', (id) => {
          console.log('[VoiceChat] My Peer ID is:', id);
        });

        peer.on('call', (call) => {
          console.log('[VoiceChat] Incoming call from:', call.peer);
          call.answer(localStreamRef.current || undefined);
          
          call.on('stream', (remoteStream) => {
            console.log('[VoiceChat] Received remote stream from:', call.peer);
            setRemoteStreams((prev) => ({ ...prev, [call.peer]: remoteStream }));
          });
        });

        peer.on('error', (err) => {
          console.error('[VoiceChat] Peer error:', err);
        });

        peerRef.current = peer;
      } catch (err) {
        console.error('[VoiceChat] Failed to initialize peerjs:', err);
      }
    };

    initPeer();

    return () => {
      if (peerRef.current) {
        peerRef.current.destroy();
        peerRef.current = null;
      }
    };
  }, [room?.id, localPlayerId]);

  // Handle Microphone toggle
  useEffect(() => {
    let stream: MediaStream | null = null;

    const enableMic = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        localStreamRef.current = stream;

        // If we just turned on the mic, we need to call everyone in the room who isn't us
        if (peerRef.current && room?.id) {
          const otherPlayers = players.filter(p => p.id !== localPlayerId);
          otherPlayers.forEach(p => {
            const targetPeerId = `poker41-${room.id}-${p.id}`;
            const call = peerRef.current.call(targetPeerId, stream);
            if (call) {
              call.on('stream', (remoteStream: MediaStream) => {
                setRemoteStreams((prev) => ({ ...prev, [targetPeerId]: remoteStream }));
              });
            }
          });
        }
      } catch (err) {
        console.error('[VoiceChat] Failed to get local audio:', err);
      }
    };

    if (isMicOn) {
      enableMic();
    } else {
      // Stop all tracks if mic is turned off
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
        localStreamRef.current = null;
      }
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [isMicOn, players, localPlayerId, room?.id]);

  return (
    <>
      {Object.entries(remoteStreams).map(([peerId, stream]) => (
        <audio
          key={peerId}
          autoPlay
          playsInline
          ref={(el) => {
            if (el && el.srcObject !== stream) {
              el.srcObject = stream;
            }
          }}
        />
      ))}
    </>
  );
}

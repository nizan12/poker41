'use client';

import { useEffect, useRef, useState } from 'react';
import { useGameStore } from '@/features/game/stores/gameStore';
import { useUIStore } from '@/features/game/stores/uiStore';
import { updatePlayer } from '@/lib/firebase/firestore';

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
        // Let PeerJS generate a random ID to avoid "ID is taken" errors
        const peer = new Peer({
          debug: 2,
        });

        peer.on('open', async (id) => {
          console.log('[VoiceChat] My Peer ID is:', id);
          // Save this peer ID to Firestore so others can call us
          try {
            await updatePlayer(room.id, localPlayerId, { peerId: id });
          } catch (e) {
            console.error('Failed to update peerId', e);
          }
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
  // Keep track of who we have already called
  const calledPeersRef = useRef<Set<string>>(new Set());

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
            const targetPeerId = (p as any).peerId;
            if (targetPeerId && !calledPeersRef.current.has(targetPeerId)) {
              calledPeersRef.current.add(targetPeerId);
              const call = peerRef.current.call(targetPeerId, stream);
              if (call) {
                call.on('stream', (remoteStream: MediaStream) => {
                  setRemoteStreams((prev) => ({ ...prev, [targetPeerId]: remoteStream }));
                });
              }
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
      calledPeersRef.current.clear();
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMicOn, localPlayerId, room?.id]); // Removed players to prevent mic restart

  // Automatically call new players that join while mic is on
  useEffect(() => {
    if (!isMicOn || !localStreamRef.current || !peerRef.current) return;
    
    const otherPlayers = players.filter(p => p.id !== localPlayerId);
    otherPlayers.forEach(p => {
      const targetPeerId = (p as any).peerId;
      if (targetPeerId && !calledPeersRef.current.has(targetPeerId)) {
        calledPeersRef.current.add(targetPeerId);
        const call = peerRef.current.call(targetPeerId, localStreamRef.current);
        if (call) {
          call.on('stream', (remoteStream: MediaStream) => {
            setRemoteStreams((prev) => ({ ...prev, [targetPeerId]: remoteStream }));
          });
        }
      }
    });
  }, [players, isMicOn, localPlayerId]);

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

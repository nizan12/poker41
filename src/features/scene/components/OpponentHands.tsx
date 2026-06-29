'use client';

import { useMemo, Suspense } from 'react';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { useGameStore } from '@/features/game/stores/gameStore';
import { 
  CARD_WIDTH, 
  CARD_HEIGHT, 
  CARD_DEPTH, 
  cardBodyGeometry, 
  CardFaceTexture, 
  CARD_BACK_PATH 
} from './Card3D';

/**
 * Shows opponent card backs arranged around the table.
 */
export function OpponentHands() {
  const players = useGameStore((s) => s.players);
  const localPlayerId = useGameStore((s) => s.localPlayerId);
  const isDealingIntro = useGameStore((s) => s.isDealingIntro);
  const dealtCardsCount = useGameStore((s) => s.dealtCardsCount);
  
  const otherPlayers = useMemo(() => players.filter(p => p.id !== localPlayerId), [players, localPlayerId]);

  // Position opponents around the table
  const opponentPositions = useMemo(() => {
    const count = otherPlayers.length;
    const positions: Array<{
      player: typeof otherPlayers[0];
      pos: [number, number, number];
      rot: [number, number, number];
    }> = [];

    const localPlayer = players.find(p => p.id === localPlayerId);
    
    // Add local player at the bottom of the table
    if (localPlayer) {
      positions.push({
        player: localPlayer,
        pos: [0, 0.02, 4.2],
        rot: [0, 0, 0],
      });
    }

    const angleSpread = Math.PI * 0.7;
    const startAngle = Math.PI * 0.15;

    for (let i = 0; i < count; i++) {
      const t = count > 1 ? i / (count - 1) : 0.5;
      const angle = startAngle + t * angleSpread;
      
      const radius = 4.2;

      positions.push({
        player: otherPlayers[i],
        pos: [
          Math.sin(angle) * radius,
          0.02,
          -Math.cos(angle) * radius,
        ],
        rot: [0, -angle + Math.PI, 0],
      });
    }

    return positions;
  }, [otherPlayers, players, localPlayerId]);

  return (
    <>
      {opponentPositions.map(({ player, pos, rot }) => {
        let cardCount = player.hand?.length || 4;
        
        if (isDealingIntro) {
          cardCount = Math.min(cardCount, dealtCardsCount);
        }

        return (
          <group key={player.id} position={pos} rotation={rot}>
            {/* Face-down cards */}
            {Array.from({ length: cardCount }).map((_, cardIdx) => {
              const cardSpacing = 0.2;
              const startX = -0.3;
              const x = startX + cardIdx * cardSpacing;
              // Fan angle based on position relative to center
              const angle = -x * 0.15;

              return (
                <group
                  key={cardIdx}
                  position={[x, 0.02 + cardIdx * 0.005, 0]}
                  rotation={[0, 0, angle]}
                >
                  <mesh geometry={cardBodyGeometry} castShadow>
                    <meshStandardMaterial color="#f0f0f0" roughness={0.4} metalness={0.05} />
                  </mesh>

                  {/* Card back image */}
                  <mesh
                    position={[0, CARD_DEPTH / 2 + 0.0025, 0]}
                    rotation={[-Math.PI / 2, 0, 0]}
                  >
                    <planeGeometry args={[CARD_WIDTH, CARD_HEIGHT]} />
                    <Suspense fallback={<meshStandardMaterial color="#ffffff" roughness={0.3} />}>
                      <CardFaceTexture imagePath={CARD_BACK_PATH} />
                    </Suspense>
                  </mesh>
                </group>
              );
            })}

            {/* Player name label */}
            <Html position={[0, 0.8, 0.2]} center style={{ pointerEvents: 'none' }}>
              <div style={{
                background: 'rgba(30, 30, 46, 0.85)',
                color: '#e2e8f0',
                fontSize: 13,
                fontWeight: 600,
                padding: '4px 12px',
                borderRadius: 8,
                whiteSpace: 'nowrap',
                border: '1px solid rgba(255,255,255,0.1)',
                fontFamily: 'Inter, sans-serif',
              }}>
                {player.name} ({cardCount})
              </div>
            </Html>
          </group>
        );
      })}
    </>
  );
}

'use client';

import { useMemo, Suspense } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html, RoundedBox, useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { useGameStore } from '@/features/game/stores/gameStore';

function CardFaceTexture({ imagePath }: { imagePath: string }) {
  const texture = useTexture(imagePath);
  texture.colorSpace = THREE.SRGBColorSpace;
  return <meshStandardMaterial map={texture} roughness={0.3} metalness={0.05} />;
}

const CARD_BACK_PATH = encodeURI('/kartu/Suit=Other, Number=Back Red.svg');

/**
 * Shows opponent card backs arranged around the table.
 */
export function OpponentHands() {
  const players = useGameStore((s) => s.players);
  const localPlayerId = useGameStore((s) => s.localPlayerId);
  const otherPlayers = useMemo(() => players.filter(p => p.id !== localPlayerId), [players, localPlayerId]);

  // Position opponents around the table
  const opponentPositions = useMemo(() => {
    const count = otherPlayers.length;
    const positions: Array<{
      player: typeof otherPlayers[0];
      pos: [number, number, number];
      rot: [number, number, number];
    }> = [];

    const angleSpread = Math.PI * 0.7;
    const startAngle = Math.PI * 0.15;

    for (let i = 0; i < count; i++) {
      const t = count > 1 ? i / (count - 1) : 0.5;
      const angle = startAngle + t * angleSpread;
      const radius = 3.8;

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
  }, [otherPlayers]);

  return (
    <group>
      {opponentPositions.map(({ player, pos, rot }) => {
        const cardCount = player.hand?.length || 4;

        return (
          <group key={player.id} position={pos} rotation={rot}>
            {/* Face-down cards */}
            {Array.from({ length: cardCount }).map((_, cardIdx) => {
              const spread = 0.6;
              const t = cardCount > 1 ? cardIdx / (cardCount - 1) : 0.5;
              const x = (t - 0.5) * spread;

              return (
                <group
                  key={cardIdx}
                  position={[x, cardIdx * 0.005, 0]}
                  rotation={[-Math.PI / 2 + 0.8, 0, (t - 0.5) * -0.1]}
                >
                  <RoundedBox
                    args={[0.7, 0.02, 1.0]}
                    radius={0.005}
                    smoothness={4}
                    castShadow
                  >
                    <meshStandardMaterial
                      color="#f0f0f0"
                      roughness={0.4}
                      metalness={0.05}
                    />
                  </RoundedBox>

                  {/* Card back image */}
                  <mesh
                    position={[0, 0.012, 0]}
                    rotation={[-Math.PI / 2, 0, 0]}
                  >
                    <planeGeometry args={[0.7 - 0.04, 1.0 - 0.04]} />
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
    </group>
  );
}

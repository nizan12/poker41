'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html, RoundedBox, useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { Suspense } from 'react';
import { useGameStore } from '@/features/game/stores/gameStore';

function CardFaceTexture({ imagePath }: { imagePath: string }) {
  const texture = useTexture(imagePath);
  texture.colorSpace = THREE.SRGBColorSpace;
  return <meshStandardMaterial map={texture} roughness={0.3} metalness={0.05} />;
}

const CARD_BACK_PATH = encodeURI('/kartu/Suit=Other, Number=Back Red.svg');

export function CardDeck() {
  const groupRef = useRef<THREE.Group>(null);
  const room = useGameStore((s) => s.room);
  const drawFromDeck = useGameStore((s) => s.drawFromDeck);
  const isMyTurn = useGameStore((s) => s.isMyTurn());
  const localHand = useGameStore((s) => s.localHand);
  
  const canDraw = isMyTurn && localHand.length === 4;

  const deckSize = room?.deckCards?.length ?? 30;
  const visibleCards = Math.min(deckSize, 8);

  // Subtle floating animation
  useFrame((state) => {
    if (!groupRef.current) return;
    groupRef.current.position.y = 0.01 + Math.sin(state.clock.elapsedTime * 0.8) * 0.01;
  });

  if (deckSize <= 0) return null;

  return (
    <group ref={groupRef} position={[-0.8, 0, 0]}>
      {/* Stack of card backs */}
      {Array.from({ length: visibleCards }).map((_, i) => (
        <group key={i} position={[0, i * 0.008, 0]}>
          <RoundedBox
            args={[0.7, 0.02, 1.0]}
            radius={0.005}
            smoothness={4}
            castShadow={i === visibleCards - 1}
            receiveShadow
            onClick={(e) => {
              e.stopPropagation();
              if (i === visibleCards - 1 && canDraw && drawFromDeck) {
                drawFromDeck();
              }
            }}
            onPointerOver={(e) => {
              if (i === visibleCards - 1 && canDraw) {
                e.stopPropagation();
                document.body.style.cursor = 'pointer';
              }
            }}
            onPointerOut={(e) => {
              if (i === visibleCards - 1 && canDraw) {
                e.stopPropagation();
                document.body.style.cursor = 'default';
              }
            }}
          >
            <meshStandardMaterial
              color={i === visibleCards - 1 ? '#f0f0f0' : '#e0e0e8'}
              roughness={0.4}
              metalness={0.05}
            />
          </RoundedBox>

          {/* Show card back image on top card only */}
          {i === visibleCards - 1 && (
            <mesh
              position={[0, 0.012, 0]}
              rotation={[-Math.PI / 2, 0, 0]}
            >
              <planeGeometry args={[0.7 - 0.04, 1.0 - 0.04]} />
              <Suspense fallback={<meshStandardMaterial color="#ffffff" roughness={0.3} />}>
                <CardFaceTexture imagePath={CARD_BACK_PATH} />
              </Suspense>
            </mesh>
          )}
        </group>
      ))}

      {/* Card count badge */}
      <Html
        position={[0, visibleCards * 0.008 + 0.2, 0]}
        center
        style={{ pointerEvents: 'none' }}
      >
        <div style={{
          background: 'rgba(16,185,129,0.9)',
          color: 'white',
          fontSize: 12,
          fontWeight: 'bold',
          padding: '2px 8px',
          borderRadius: 10,
          fontFamily: 'monospace',
          whiteSpace: 'nowrap',
        }}>
          {deckSize}
        </div>
      </Html>
    </group>
  );
}

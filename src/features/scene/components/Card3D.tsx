'use client';

import { useRef, useState, useMemo, Suspense } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html, RoundedBox, useTexture } from '@react-three/drei';
import * as THREE from 'three';

function CardFaceTexture({ imagePath }: { imagePath: string }) {
  const texture = useTexture(imagePath);
  // Ensure texture orientation is correct for the plane
  texture.colorSpace = THREE.SRGBColorSpace;
  return <meshStandardMaterial map={texture} roughness={0.3} metalness={0.05} />;
}

interface Card3DProps {
  cardId: string;
  position: [number, number, number];
  rotation?: [number, number, number];
  faceUp?: boolean;
  interactive?: boolean;
  selected?: boolean;
  hovered?: boolean;
  onClick?: () => void;
  onPointerOver?: () => void;
  onPointerOut?: () => void;
  scale?: number;
}

// Card dimensions
const CARD_WIDTH = 0.7;
const CARD_HEIGHT = 1.0;
const CARD_DEPTH = 0.02;

/**
 * Parse a cardId like "hearts-Ace" to get the SVG path
 */
function getCardTexturePath(cardId: string): string {
  const [suit, rank] = cardId.split('-');
  const suitCapitalized = suit.charAt(0).toUpperCase() + suit.slice(1);
  return encodeURI(`/kartu/Suit=${suitCapitalized}, Number=${rank}.svg`);
}

const CARD_BACK_PATH = encodeURI('/kartu/Suit=Other, Number=Back Red.svg');

export function Card3D({
  cardId,
  position,
  rotation = [0, 0, 0],
  faceUp = true,
  interactive = false,
  selected = false,
  hovered = false,
  onClick,
  onPointerOver,
  onPointerOut,
  scale = 1,
}: Card3DProps) {
  const meshRef = useRef<THREE.Group>(null);
  const [isHovered, setIsHovered] = useState(false);

  // Calculate target Y position (lift when selected/hovered)
  const targetY = useMemo(() => {
    if (selected) return position[1] + 0.3;
    if (isHovered || hovered) return position[1] + 0.15;
    return position[1];
  }, [selected, isHovered, hovered, position]);

  // Smooth animation
  useFrame((_, delta) => {
    if (!meshRef.current) return;
    const speed = 8;
    meshRef.current.position.y += (targetY - meshRef.current.position.y) * speed * delta;
  });

  const imagePath = faceUp ? getCardTexturePath(cardId) : CARD_BACK_PATH;

  return (
    <group
      ref={meshRef}
      position={position}
      rotation={rotation}
      scale={scale}
    >
      {/* Card body */}
      <RoundedBox
        args={[CARD_WIDTH, CARD_DEPTH, CARD_HEIGHT]}
        radius={0.005}
        smoothness={4}
        castShadow
        receiveShadow
        onClick={interactive ? onClick : undefined}
        onPointerOver={interactive ? (e) => {
          e.stopPropagation();
          setIsHovered(true);
          onPointerOver?.();
          document.body.style.cursor = 'pointer';
        } : undefined}
        onPointerOut={interactive ? (e) => {
          e.stopPropagation();
          setIsHovered(false);
          onPointerOut?.();
          document.body.style.cursor = 'default';
        } : undefined}
      >
        <meshStandardMaterial
          color="#f0f0f0"
          roughness={0.3}
          metalness={0.05}
        />
      </RoundedBox>

      {/* Card face — Rendered as a textured plane on top of the RoundedBox */}
      <mesh
        position={[0, CARD_DEPTH / 2 + 0.001, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <planeGeometry args={[CARD_WIDTH - 0.04, CARD_HEIGHT - 0.04]} />
        <Suspense fallback={<meshStandardMaterial color="#ffffff" roughness={0.3} />}>
          <CardFaceTexture imagePath={imagePath} />
        </Suspense>
      </mesh>

      {/* Selection glow ring */}
      {(selected || isHovered) && (
        <mesh position={[0, CARD_DEPTH / 2 + 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[CARD_WIDTH + 0.06, CARD_HEIGHT + 0.06]} />
          <meshBasicMaterial
            color={selected ? '#10B981' : '#F59E0B'}
            transparent
            opacity={selected ? 0.5 : 0.25}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}
    </group>
  );
}

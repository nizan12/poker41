'use client';

import { useRef, useState, useMemo, Suspense, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Html, RoundedBox, useTexture } from '@react-three/drei';
import * as THREE from 'three';

export function CardFaceTexture({ imagePath }: { imagePath: string }) {
  const texture = useTexture(imagePath);
  const gl = useThree((state) => state.gl);
  
  useEffect(() => {
    if (texture) {
      texture.colorSpace = THREE.SRGBColorSpace;
      // Crop out the SVG drop shadow padding
      // SVG total size: 219x304. Graphic size: 203x288
      // Padding: 8px left/right, 4px top, 12px bottom
      texture.repeat.set(203 / 219, 288 / 304);
      texture.offset.set(8 / 219, 12 / 304);
      
      // Fix for blurry textures (especially on mobile/iOS or at oblique angles)
      texture.anisotropy = gl.capabilities.getMaxAnisotropy();
      texture.minFilter = THREE.LinearMipmapLinearFilter;
      texture.magFilter = THREE.LinearFilter;
      texture.generateMipmaps = true;

      texture.needsUpdate = true;
    }
  }, [texture, gl]);

  return (
    <meshStandardMaterial 
      map={texture} 
      roughness={0.3} 
      metalness={0.05} 
      transparent={true} 
      alphaTest={0.1}
    />
  );
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
export const CARD_WIDTH = 0.7;
export const CARD_HEIGHT = 1.0;
export const CARD_DEPTH = 0.02;

/**
 * Parse a cardId like "hearts-Ace" to get the SVG path
 */
export function getCardTexturePath(cardId: string): string {
  const [suit, rank] = cardId.split('-');
  const suitCapitalized = suit.charAt(0).toUpperCase() + suit.slice(1);
  return encodeURI(`/kartu/Suit=${suitCapitalized}, Number=${rank}.svg`);
}

export const CARD_BACK_PATH = encodeURI('/kartu/Suit=Other, Number=Back Red.svg');

// Shared Geometry instances for performance and consistency
export const cardShape = new THREE.Shape();
const w = CARD_WIDTH;
const h = CARD_HEIGHT;
const r = 0.035; // Matches SVG's 10px radius (10 / 290)
const x = -w / 2;
const y = -h / 2;

cardShape.moveTo(x, y + r);
cardShape.lineTo(x, y + h - r);
cardShape.quadraticCurveTo(x, y + h, x + r, y + h);
cardShape.lineTo(x + w - r, y + h);
cardShape.quadraticCurveTo(x + w, y + h, x + w, y + h - r);
cardShape.lineTo(x + w, y + r);
cardShape.quadraticCurveTo(x + w, y, x + w - r, y);
cardShape.lineTo(x + r, y);
cardShape.quadraticCurveTo(x, y, x, y + r);

export const cardBodyGeometry = new THREE.ExtrudeGeometry(cardShape, {
  depth: CARD_DEPTH,
  bevelEnabled: true,
  bevelSegments: 2,
  steps: 1,
  bevelSize: 0.002,
  bevelThickness: 0.002,
});
cardBodyGeometry.translate(0, 0, -CARD_DEPTH / 2); // Center on Z
cardBodyGeometry.rotateX(-Math.PI / 2); // Lay flat (Z becomes Y)

export const cardGlowShape = new THREE.Shape();
const gw = CARD_WIDTH + 0.06;
const gh = CARD_HEIGHT + 0.06;
const gr = 0.05;
const gx = -gw / 2;
const gy = -gh / 2;

cardGlowShape.moveTo(gx, gy + gr);
cardGlowShape.lineTo(gx, gy + gh - gr);
cardGlowShape.quadraticCurveTo(gx, gy + gh, gx + gr, gy + gh);
cardGlowShape.lineTo(gx + gw - gr, gy + gh);
cardGlowShape.quadraticCurveTo(gx + gw, gy + gh, gx + gw, gy + gh - gr);
cardGlowShape.lineTo(gx + gw, gy + gr);
cardGlowShape.quadraticCurveTo(gx + gw, gy, gx + gw - gr, gy);
cardGlowShape.lineTo(gx + gr, gy);
cardGlowShape.quadraticCurveTo(gx, gy, gx, gy + gr);

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

  return (
    <group
      ref={meshRef}
      position={position}
      rotation={rotation}
      scale={scale}
    >
      {/* Card body */}
      <mesh
        geometry={cardBodyGeometry}
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
        <meshStandardMaterial color="#f0f0f0" roughness={0.3} metalness={0.05} />
      </mesh>

      {/* Card face (Top) — Rendered as a textured plane on top */}
      <mesh
        position={[0, CARD_DEPTH / 2 + 0.0025, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <planeGeometry args={[CARD_WIDTH, CARD_HEIGHT]} />
        <Suspense fallback={<meshStandardMaterial color="#ffffff" roughness={0.3} />}>
          <CardFaceTexture imagePath={faceUp ? getCardTexturePath(cardId) : CARD_BACK_PATH} />
        </Suspense>
      </mesh>

      {/* Card face (Bottom) — Rendered on the bottom */}
      <mesh
        position={[0, -(CARD_DEPTH / 2 + 0.0025), 0]}
        rotation={[Math.PI / 2, 0, 0]}
      >
        <planeGeometry args={[CARD_WIDTH, CARD_HEIGHT]} />
        <Suspense fallback={<meshStandardMaterial color="#ffffff" roughness={0.3} />}>
          <CardFaceTexture imagePath={faceUp ? CARD_BACK_PATH : getCardTexturePath(cardId)} />
        </Suspense>
      </mesh>

      {/* Selection glow ring */}
      {(selected || isHovered) && (
        <mesh 
          position={[0, CARD_DEPTH / 2 + 0.002, 0]} 
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <shapeGeometry args={[cardGlowShape]} />
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

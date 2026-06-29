'use client';

import { useRef, Suspense } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '@/features/game/stores/gameStore';
import {
  CARD_WIDTH,
  CARD_HEIGHT,
  CARD_DEPTH,
  cardBodyGeometry,
  CardFaceTexture,
  CARD_BACK_PATH,
  getCardTexturePath,
} from './Card3D';

function AnimatedCardMesh({ anim }: { anim: ReturnType<typeof useGameStore>['animatingCards'][0] }) {
  const groupRef = useRef<THREE.Group>(null);
  const removeAnimation = useGameStore((s) => s.removeAnimation);
  
  // Create vectors for lerping
  const targetPos = new THREE.Vector3(...anim.toPos);
  const targetRot = new THREE.Euler(...anim.toRot);
  const startPos = new THREE.Vector3(...anim.fromPos);
  const startRot = new THREE.Euler(...anim.fromRot);

  const elapsedRef = useRef(0);

  useFrame((state, delta) => {
    if (!groupRef.current) return;
    
    elapsedRef.current += delta * 1000;
    const t = Math.min(elapsedRef.current / anim.duration, 1);
    
    // Easing function (ease-in-out cubic) for smoother start and stop
    const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

    // Interpolate position and rotation
    groupRef.current.position.lerpVectors(startPos, targetPos, ease);
    
    // Add a parabolic arc to the Y axis so the card flies up and then down
    groupRef.current.position.y += Math.sin(t * Math.PI) * 1.5;
    
    const qStart = new THREE.Quaternion().setFromEuler(startRot);
    const qEnd = new THREE.Quaternion().setFromEuler(targetRot);
    groupRef.current.quaternion.slerpQuaternions(qStart, qEnd, ease);

    // Remove animation when finished
    if (t >= 1) {
      removeAnimation(anim.id);
    }
  });

  // If card is unknown (drawing from deck without seeing face), use back path
  const isHidden = anim.cardId === 'hidden';

  return (
    <group ref={groupRef} position={anim.fromPos} rotation={anim.fromRot}>
      <mesh geometry={cardBodyGeometry} castShadow>
        <meshStandardMaterial color="#f0f0f0" roughness={0.4} metalness={0.05} />
      </mesh>
      
      {/* Front Face (Only render actual card image if not hidden) */}
      <mesh position={[0, CARD_DEPTH / 2 + 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[CARD_WIDTH, CARD_HEIGHT]} />
        <Suspense fallback={<meshStandardMaterial color="#ffffff" />}>
          <CardFaceTexture imagePath={isHidden ? CARD_BACK_PATH : getCardTexturePath(anim.cardId)} />
        </Suspense>
      </mesh>
      
      {/* Back Face */}
      <mesh position={[0, -CARD_DEPTH / 2 - 0.002, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[CARD_WIDTH, CARD_HEIGHT]} />
        <Suspense fallback={<meshStandardMaterial color="#ffffff" />}>
          <CardFaceTexture imagePath={CARD_BACK_PATH} />
        </Suspense>
      </mesh>
    </group>
  );
}

export function AnimatedCards() {
  const animatingCards = useGameStore((s) => s.animatingCards);
  
  if (!animatingCards.length) return null;
  
  return (
    <group>
      {animatingCards.map((anim) => (
        <AnimatedCardMesh key={anim.id} anim={anim} />
      ))}
    </group>
  );
}

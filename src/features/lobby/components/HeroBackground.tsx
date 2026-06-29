'use client';

import { Suspense, useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { RoundedBox, Environment, Float } from '@react-three/drei';
import * as THREE from 'three';

import { Card3D } from '@/features/scene/components/Card3D';

function FloatingCards() {
  const groupRef = useRef<THREE.Group>(null);

  const cards = useMemo(() => {
    const items: Array<{
      id: number;
      position: [number, number, number];
      rotation: [number, number, number];
      speed: number;
      cardId: string;
      faceUp: boolean;
    }> = [];

    const suits = ['hearts', 'diamonds', 'clubs', 'spades'];
    const ranks = ['Ace', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'Jack', 'Queen', 'King'];

    for (let i = 0; i < 20; i++) {
      const randomSuit = suits[Math.floor(Math.random() * suits.length)];
      const randomRank = ranks[Math.floor(Math.random() * ranks.length)];
      const isFaceUp = Math.random() > 0.3; // 70% chance face up

      items.push({
        id: i,
        position: [
          (Math.random() - 0.5) * 14, // Spread wider
          (Math.random() - 0.5) * 10, // Spread taller
          (Math.random() - 0.5) * 8 - 4, // Deep spread
        ],
        rotation: [
          Math.random() * Math.PI,
          Math.random() * Math.PI,
          Math.random() * Math.PI,
        ],
        speed: 0.2 + Math.random() * 0.5,
        cardId: `${randomSuit}-${randomRank}`,
        faceUp: isFaceUp,
      });
    }
    return items;
  }, []);

  useFrame((state) => {
    if (!groupRef.current) return;
    groupRef.current.rotation.y = state.clock.elapsedTime * 0.05;
    groupRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.02) * 0.1;
  });

  return (
    <group ref={groupRef}>
      {cards.map(({ id, position, rotation, speed, cardId, faceUp }) => (
        <Float key={id} speed={speed} rotationIntensity={1.5} floatIntensity={1.5}>
          <group position={position} rotation={rotation}>
             <Card3D 
                cardId={cardId} 
                faceUp={faceUp} 
                position={[0, 0, 0]} 
                scale={1.2} 
             />
          </group>
        </Float>
      ))}
    </group>
  );
}

function HeroScene() {
  return (
    <Canvas
      className="!absolute inset-0"
      gl={{ antialias: true, alpha: true }}
      dpr={[1, 1.5]}
      camera={{ position: [0, 0, 8], fov: 50 }}
    >
      <color attach="background" args={['#0F0F1A']} />
      <fog attach="fog" args={['#0F0F1A', 8, 20]} />
      <ambientLight intensity={0.3} />
      <pointLight position={[5, 5, 5]} intensity={0.8} color="#10B981" />
      <pointLight position={[-5, 3, 3]} intensity={0.5} color="#F59E0B" />
      <pointLight position={[0, -3, 5]} intensity={0.3} color="#3B82F6" />
      <Environment preset="city" background={false} />
      <Suspense fallback={null}>
        <FloatingCards />
      </Suspense>
    </Canvas>
  );
}

export default function HeroBackground() {
  return (
    <div className="absolute inset-0 z-0 opacity-60">
      <HeroScene />
    </div>
  );
}

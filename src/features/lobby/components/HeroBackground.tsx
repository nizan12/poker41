'use client';

import { Suspense, useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { RoundedBox, Environment, Float } from '@react-three/drei';
import * as THREE from 'three';

function FloatingCards() {
  const groupRef = useRef<THREE.Group>(null);

  const cards = useMemo(() => {
    const items: Array<{
      id: number;
      position: [number, number, number];
      rotation: [number, number, number];
      speed: number;
      color: string;
    }> = [];

    for (let i = 0; i < 15; i++) {
      items.push({
        id: i,
        position: [
          (Math.random() - 0.5) * 12,
          (Math.random() - 0.5) * 6,
          (Math.random() - 0.5) * 8 - 3,
        ],
        rotation: [
          Math.random() * Math.PI,
          Math.random() * Math.PI,
          Math.random() * Math.PI,
        ],
        speed: 0.2 + Math.random() * 0.5,
        color: ['#10B981', '#F59E0B', '#3B82F6', '#EF4444', '#8B5CF6'][
          Math.floor(Math.random() * 5)
        ],
      });
    }
    return items;
  }, []);

  useFrame((state) => {
    if (!groupRef.current) return;
    groupRef.current.rotation.y = state.clock.elapsedTime * 0.03;
  });

  return (
    <group ref={groupRef}>
      {cards.map(({ id, position, rotation, speed, color }) => (
        <Float key={id} speed={speed} rotationIntensity={0.4} floatIntensity={0.6}>
          <RoundedBox
            args={[0.7, 0.02, 1.0]}
            radius={0.02}
            smoothness={4}
            position={position}
            rotation={rotation}
          >
            <meshStandardMaterial
              color={color}
              roughness={0.3}
              metalness={0.5}
              emissive={color}
              emissiveIntensity={0.1}
            />
          </RoundedBox>
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

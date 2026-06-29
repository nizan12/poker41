'use client';

import { Suspense, useRef, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { Environment, ContactShadows, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { Table } from './Table';
import { CardDeck } from './CardDeck';
import { DiscardPile } from './DiscardPile';
import { PlayerHand } from './PlayerHand';
import { OpponentHands } from './OpponentHands';
import { AnimatedCards } from './AnimatedCards';
import { WinParticles } from './WinParticles';
import { useGameStore } from '@/features/game/stores/gameStore';
import { useAnimationStore } from '@/features/game/stores/animationStore';

function SceneContent() {
  const phase = useGameStore((s) => s.phase);
  const currentAnimation = useAnimationStore((s) => s.currentAnimation);

  return (
    <>
      {/* Camera Controls — orbit around the table */}
      <OrbitControls
        target={[0, 0, 0]}
        maxPolarAngle={Math.PI / 2.2}
        minPolarAngle={Math.PI / 6}
        maxDistance={16}
        minDistance={5}
        enablePan={false}
        enableDamping
        dampingFactor={0.05}
      />

      {/* Lighting */}
      <ambientLight intensity={0.5} color="#b0c4de" />
      <directionalLight
        position={[5, 10, 5]}
        intensity={1.5}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={0.5}
        shadow-camera-far={50}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
      />
      <pointLight position={[0, 6, 0]} intensity={1.0} color="#ffffff" distance={15} />
      <pointLight position={[-4, 4, -4]} intensity={0.4} color="#F59E0B" distance={10} />
      <pointLight position={[4, 4, -4]} intensity={0.4} color="#3B82F6" distance={10} />

      {/* Hemisphere light for softer ambient fill */}
      <hemisphereLight
        color="#87CEEB"
        groundColor="#2c1810"
        intensity={0.4}
      />

      {/* Environment reflection */}
      <Environment preset="apartment" background={false} />

      {/* Table */}
      <Table />

      {/* Card Deck */}
      <CardDeck />

      {/* Discard Pile */}
      <DiscardPile />

      {/* Flying Card Animations */}
      <AnimatedCards />

      {/* Local Player Hand (Now rendered in 2D UI) */}
      {/* <PlayerHand /> */}

      {/* Opponent Hands */}
      <OpponentHands />

      {/* Win Particles */}
      {currentAnimation === 'win' && <WinParticles />}
    </>
  );
}

export default function GameScene() {
  return (
    <div className="game-canvas">
      <Canvas
        shadows
        camera={{
          position: [0, 8, 7],
          fov: 50,
          near: 0.1,
          far: 100,
        }}
        gl={{
          antialias: true,
          alpha: false,
          powerPreference: 'high-performance',
          stencil: false,
        }}
        dpr={[1, 2]}
        performance={{ min: 0.5 }}
      >
        <color attach="background" args={['#0a0a15']} />
        <fog attach="fog" args={['#0a0a15', 18, 35]} />
        <Suspense fallback={null}>
          <SceneContent />
        </Suspense>
      </Canvas>
    </div>
  );
}

'use client';

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const PARTICLE_COUNT = 200;

export function WinParticles() {
  const pointsRef = useRef<THREE.Points>(null);
  const velocitiesRef = useRef<Float32Array | null>(null);

  const { positionAttr, colorAttr } = useMemo(() => {
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const colors = new Float32Array(PARTICLE_COUNT * 3);
    const velocities = new Float32Array(PARTICLE_COUNT * 3);

    const colorPalette = [
      new THREE.Color('#10B981'),
      new THREE.Color('#F59E0B'),
      new THREE.Color('#3B82F6'),
      new THREE.Color('#EF4444'),
      new THREE.Color('#8B5CF6'),
      new THREE.Color('#FBBF24'),
    ];

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 0.5;
      positions[i * 3 + 1] = Math.random() * 0.5;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 0.5;

      velocities[i * 3] = (Math.random() - 0.5) * 4;
      velocities[i * 3 + 1] = Math.random() * 6 + 2;
      velocities[i * 3 + 2] = (Math.random() - 0.5) * 4;

      const color = colorPalette[Math.floor(Math.random() * colorPalette.length)];
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }

    velocitiesRef.current = velocities;

    const positionAttr = new THREE.BufferAttribute(positions, 3);
    const colorAttr = new THREE.BufferAttribute(colors, 3);

    return { positionAttr, colorAttr };
  }, []);

  useFrame((_, delta) => {
    if (!pointsRef.current || !velocitiesRef.current) return;

    const posArray = pointsRef.current.geometry.attributes.position.array as Float32Array;
    const vels = velocitiesRef.current;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      posArray[i * 3] += vels[i * 3] * delta;
      posArray[i * 3 + 1] += vels[i * 3 + 1] * delta;
      posArray[i * 3 + 2] += vels[i * 3 + 2] * delta;

      vels[i * 3 + 1] -= 4 * delta;
      vels[i * 3] *= 0.99;
      vels[i * 3 + 2] *= 0.99;
    }

    pointsRef.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={pointsRef} position={[0, 2, 0]}>
      <bufferGeometry>
        <primitive attach="attributes-position" object={positionAttr} />
        <primitive attach="attributes-color" object={colorAttr} />
      </bufferGeometry>
      <pointsMaterial
        size={0.08}
        vertexColors
        transparent
        opacity={0.9}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

'use client';

import { useRef } from 'react';
import { Mesh } from 'three';

export function Table() {
  const tableRef = useRef<Mesh>(null);

  return (
    <group position={[0, 0, 0]}>
      {/* Main table surface — felt */}
      <mesh
        ref={tableRef}
        position={[0, -0.15, 0]}
        receiveShadow
      >
        <cylinderGeometry args={[5.0, 5.0, 0.3, 64]} />
        <meshStandardMaterial
          color="#1a5c3a"
          roughness={0.85}
          metalness={0.05}
          envMapIntensity={0.3}
        />
      </mesh>

      {/* Table rim — dark wood */}
      <mesh
        position={[0, -0.22, 0]} // Lowered to prevent Z-fighting with felt (Y=0)
        receiveShadow
      >
        <cylinderGeometry args={[5.2, 5.2, 0.4, 64]} />
        <meshStandardMaterial
          color="#2c1810"
          roughness={0.6}
          metalness={0.2}
          envMapIntensity={0.5}
        />
      </mesh>

      {/* Table legs (arranged in a circle) */}
      {[
        [-2.5, -1.5, -2.5],
        [2.5, -1.5, -2.5],
        [-2.5, -1.5, 2.5],
        [2.5, -1.5, 2.5],
      ].map((pos, i) => (
        <mesh key={i} position={pos as [number, number, number]} castShadow>
          <cylinderGeometry args={[0.2, 0.25, 2.6, 16]} />
          <meshStandardMaterial color="#1e120a" roughness={0.5} metalness={0.3} />
        </mesh>
      ))}
    </group>
  );
}

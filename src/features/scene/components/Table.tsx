'use client';

import { useRef } from 'react';
import { Mesh } from 'three';
import { RoundedBox } from '@react-three/drei';

export function Table() {
  const tableRef = useRef<Mesh>(null);

  return (
    <group position={[0, 0, 0]}>
      {/* Main table surface — felt */}
      <RoundedBox
        ref={tableRef}
        args={[10, 0.3, 8]}
        radius={0.15}
        smoothness={8}
        position={[0, -0.15, 0]}
        receiveShadow
      >
        <meshStandardMaterial
          color="#1a5c3a"
          roughness={0.85}
          metalness={0.05}
          envMapIntensity={0.3}
        />
      </RoundedBox>

      {/* Table rim — dark wood */}
      <RoundedBox
        args={[10.4, 0.4, 8.4]}
        radius={0.15}
        smoothness={8}
        position={[0, -0.2, 0]}
        receiveShadow
      >
        <meshStandardMaterial
          color="#2c1810"
          roughness={0.6}
          metalness={0.2}
          envMapIntensity={0.5}
        />
      </RoundedBox>

      {/* Table legs */}
      {[
        [-4.5, -1.5, -3.5],
        [4.5, -1.5, -3.5],
        [-4.5, -1.5, 3.5],
        [4.5, -1.5, 3.5],
      ].map((pos, i) => (
        <mesh key={i} position={pos as [number, number, number]} castShadow>
          <cylinderGeometry args={[0.15, 0.2, 2.6, 16]} />
          <meshStandardMaterial
            color="#1e120a"
            roughness={0.5}
            metalness={0.3}
          />
        </mesh>
      ))}

      {/* Center line / decoration on felt */}
      <mesh position={[0, 0.06, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[2.5, 2.6, 64]} />
        <meshStandardMaterial
          color="#1d6b42"
          roughness={0.9}
          metalness={0}
          transparent
          opacity={0.4}
        />
      </mesh>

      {/* Inner circle for deck/discard area */}
      <mesh position={[0, 0.07, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1.2, 64]} />
        <meshStandardMaterial
          color="#174d30"
          roughness={0.9}
          metalness={0}
          transparent
          opacity={0.3}
        />
      </mesh>
    </group>
  );
}

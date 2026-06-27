'use client';

import { useMemo } from 'react';
import { Card3D } from './Card3D';
import { useGameStore } from '@/features/game/stores/gameStore';

export function PlayerHand() {
  const localHand = useGameStore((s) => s.localHand);
  const selectedCardId = useGameStore((s) => s.selectedCardId);
  const selectCard = useGameStore((s) => s.selectCard);
  const hoverCard = useGameStore((s) => s.hoverCard);
  const hoveredCardId = useGameStore((s) => s.hoveredCardId);
  const phase = useGameStore((s) => s.phase);

  // Fan layout for player's hand
  const cardPositions = useMemo(() => {
    const count = localHand.length;
    const spread = 0.9; // total width of hand
    const arcHeight = 0.3; // arc curve height

    return localHand.map((card, i) => {
      const t = count > 1 ? i / (count - 1) : 0.5;
      const x = (t - 0.5) * spread;
      const z = -arcHeight * Math.sin(t * Math.PI) * 0.3;
      const rotZ = (t - 0.5) * -0.15; // slight tilt

      return {
        card,
        position: [x, 0.02, 3.5 + z] as [number, number, number],
        rotation: [-Math.PI / 2 + 0.3, 0, rotZ] as [number, number, number],
      };
    });
  }, [localHand]);

  const isInteractive = phase === 'playing';

  return (
    <group>
      {cardPositions.map(({ card, position, rotation }) => (
        <Card3D
          key={card.id}
          cardId={card.id}
          position={position}
          rotation={rotation}
          faceUp={true}
          interactive={isInteractive}
          selected={selectedCardId === card.id}
          hovered={hoveredCardId === card.id}
          onClick={() => selectCard(selectedCardId === card.id ? null : card.id)}
          onPointerOver={() => hoverCard(card.id)}
          onPointerOut={() => hoverCard(null)}
          scale={1.2}
        />
      ))}
    </group>
  );
}

'use client';

import { useMemo } from 'react';
import { Card3D } from './Card3D';
import { useGameStore } from '@/features/game/stores/gameStore';

export function DiscardPile() {
  const room = useGameStore((s) => s.room);
  const discardPile = room?.discardPile ?? [];
  const drawFromDiscard = useGameStore((s) => s.drawFromDiscard);
  const isMyTurn = useGameStore((s) => s.isMyTurn());
  const localHand = useGameStore((s) => s.localHand);
  
  const canDraw = isMyTurn && localHand.length === 4;

  const animatingCards = useGameStore((s) => s.animatingCards);

  // Show only the last few cards in a fan pattern
  const visibleCards = useMemo(() => {
    return discardPile.slice(-5); // Show last 5 cards
  }, [discardPile]);

  if (visibleCards.length === 0) return null;

  return (
    <group position={[0.8, 0.01, 0]}>
      {visibleCards.map((cardId, i) => {
        // If this card is currently flying, don't render it in the static pile yet
        const isAnimating = animatingCards.some((anim) => anim.cardId === cardId);
        if (isAnimating) return null;

        const angle = (i - Math.floor(visibleCards.length / 2)) * 0.15;
        const offsetX = Math.sin(angle) * 0.2;
        const offsetZ = Math.cos(angle) * 0.1 - 0.1;
        const isTopCard = i === visibleCards.length - 1;

        return (
          <Card3D
            key={`${cardId}-${i}`}
            cardId={cardId}
            position={[offsetX, i * 0.008, offsetZ]}
            rotation={[0, angle * 0.5, 0]}
            faceUp={true}
            scale={1}
            interactive={isTopCard && canDraw}
            onClick={() => {
              if (isTopCard && canDraw && drawFromDiscard) {
                drawFromDiscard();
              }
            }}
          />
        );
      })}
    </group>
  );
}

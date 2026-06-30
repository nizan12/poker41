'use client';

import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '@/features/game/stores/gameStore';
import { SpellButton } from './SpellButton';

/**
 * 2D card hand UI overlay — renders at the bottom of the screen
 * Uses actual SVG card images from /kartu/ folder
 */
interface PlayerHandUIProps {
  onDiscard?: (cardId: string) => void;
  onUseSpell: () => void;
  onDeclareWin?: () => void;
}

export function PlayerHandUI({ onDiscard, onUseSpell, onDeclareWin }: PlayerHandUIProps) {
  const localHand = useGameStore((s) => s.localHand);
  const isDealingIntro = useGameStore((s) => s.isDealingIntro);
  const dealtCardsCount = useGameStore((s) => s.dealtCardsCount);
  const selectedCardId = useGameStore((s) => s.selectedCardId);
  const selectCard = useGameStore((s) => s.selectCard);
  const hoveredCardId = useGameStore((s) => s.hoveredCardId);
  const hoverCard = useGameStore((s) => s.hoverCard);
  const phase = useGameStore((s) => s.phase);
  
  const players = useGameStore((s) => s.players);
  const localPlayerId = useGameStore((s) => s.localPlayerId);
  const room = useGameStore((s) => s.room);
  
  const player = players.find(p => p.id === localPlayerId);
  const isMyTurn = room?.currentTurn === localPlayerId;
  const canDraw = useGameStore((s) => s.canDraw);
  const canDiscard = useGameStore((s) => s.canDiscard);

  const displayHand = isDealingIntro ? localHand.slice(0, dealtCardsCount) : localHand;

  const isInteractive = phase === 'playing' && !isDealingIntro;

  // Build the SVG path from card ID
  const getCardPath = (cardId: string) => {
    const [suit, rank] = cardId.split('-');
    const suitCap = suit.charAt(0).toUpperCase() + suit.slice(1);
    return encodeURI(`/kartu/Suit=${suitCap}, Number=${rank}.svg`);
  };

  const fanAngle = useMemo(() => {
    const count = displayHand.length;
    if (count <= 1) return 0;
    return Math.min(8, 40 / count); // degrees per card
  }, [displayHand.length]);

  if (displayHand.length === 0) return null;

  return (
    <div className="player-hand-ui">
      <div className="hand-container">
        <AnimatePresence mode="popLayout">
          {displayHand.map((card, i) => {
            const isSelected = selectedCardId === card.id;
            const isHovered = hoveredCardId === card.id;
            const count = displayHand.length;
            const mid = (count - 1) / 2;
            const offset = i - mid;
            const rotation = offset * fanAngle;
            const translateY = Math.abs(offset) * 4; // arc effect

            return (
              <motion.div
                key={card.id}
                className="card-slot"
                initial={{ y: 100, opacity: 0, scale: 0.5 }}
                animate={{
                  y: isSelected ? -30 : isHovered ? -15 : 0,
                  opacity: 1,
                  scale: isSelected ? 1.12 : isHovered ? 1.06 : 1,
                  rotate: rotation,
                  translateY: translateY,
                }}
                exit={{ y: 100, opacity: 0, scale: 0.5 }}
                transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                drag={isInteractive && localHand.length === 5 ? "y" : false}
                dragConstraints={{ top: 0, bottom: 0 }}
                dragElastic={0.2}
                onDragEnd={(e, info) => {
                  if (info.offset.y < -50 && onDiscard) {
                    selectCard(card.id);
                    onDiscard(card.id);
                  }
                }}
                style={{
                  zIndex: isSelected ? 20 : isHovered ? 15 : 10 - Math.abs(offset),
                  marginLeft: i === 0 ? 0 : -20,
                }}
              >
                <button
                  className={`card-button ${isSelected ? 'selected' : ''} ${isHovered ? 'hovered' : ''}`}
                  onClick={() => {
                    if (!isInteractive) return;
                    selectCard(isSelected ? null : card.id);
                  }}
                  onMouseEnter={() => isInteractive && hoverCard(card.id)}
                  onMouseLeave={() => isInteractive && hoverCard(null)}
                  disabled={!isInteractive}
                >
                  <img
                    src={getCardPath(card.id)}
                    alt={card.id}
                    draggable={false}
                    className="card-image"
                  />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      <div className="absolute right-4 bottom-4 z-50 pointer-events-auto">
        {player && (
          <SpellButton 
            player={player} 
            isMyTurn={isMyTurn} 
            onUseSpell={onUseSpell}
            disabled={(!canDraw && !canDiscard)} 
          />
        )}
      </div>

      <style jsx>{`
        .player-hand-ui {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          display: flex;
          justify-content: center;
          padding-bottom: 12px;
          pointer-events: none;
          z-index: 60;
        }
        .hand-container {
          display: flex;
          align-items: flex-end;
          justify-content: center;
          pointer-events: auto;
          padding: 0 20px;
        }
        .card-slot {
          position: relative;
          transform-origin: bottom center;
          flex-shrink: 0;
        }
        .card-button {
          position: relative;
          width: 95px;
          height: 135px;
          border: none;
          background: transparent;
          cursor: pointer;
          padding: 0;
          transition: filter 0.2s;
        }
        .card-button:disabled {
          cursor: default;
        }
        .card-button.hovered {
          filter: drop-shadow(0 0 8px rgba(245, 158, 11, 0.8));
        }
        .card-button.selected {
          animation: pulse-glow 1.5s ease-in-out infinite;
        }
        .card-image {
          width: 100%;
          height: 100%;
          object-fit: contain;
          display: block;
          pointer-events: none;
        }
        
        @keyframes pulse-glow {
          0%, 100% { filter: drop-shadow(0 0 6px rgba(16, 185, 129, 0.6)); }
          50% { filter: drop-shadow(0 0 16px rgba(16, 185, 129, 1)); }
        }

        @media (max-width: 640px) {
          .card-button {
            width: 65px;
            height: 94px;
          }
          .card-slot {
            margin-left: -15px !important;
          }
        }
      `}</style>
    </div>
  );
}

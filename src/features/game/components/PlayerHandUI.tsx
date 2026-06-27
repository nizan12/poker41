'use client';

import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '@/features/game/stores/gameStore';

/**
 * 2D card hand UI overlay — renders at the bottom of the screen
 * Uses actual SVG card images from /kartu/ folder
 */
export function PlayerHandUI() {
  const localHand = useGameStore((s) => s.localHand);
  const selectedCardId = useGameStore((s) => s.selectedCardId);
  const selectCard = useGameStore((s) => s.selectCard);
  const hoveredCardId = useGameStore((s) => s.hoveredCardId);
  const hoverCard = useGameStore((s) => s.hoverCard);
  const phase = useGameStore((s) => s.phase);

  const isInteractive = phase === 'playing';

  // Build the SVG path from card ID
  const getCardPath = (cardId: string) => {
    const [suit, rank] = cardId.split('-');
    const suitCap = suit.charAt(0).toUpperCase() + suit.slice(1);
    return encodeURI(`/kartu/Suit=${suitCap}, Number=${rank}.svg`);
  };

  const fanAngle = useMemo(() => {
    const count = localHand.length;
    if (count <= 1) return 0;
    return Math.min(8, 40 / count); // degrees per card
  }, [localHand.length]);

  if (localHand.length === 0) return null;

  return (
    <div className="player-hand-ui">
      <div className="hand-container">
        <AnimatePresence mode="popLayout">
          {localHand.map((card, i) => {
            const isSelected = selectedCardId === card.id;
            const isHovered = hoveredCardId === card.id;
            const count = localHand.length;
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
                  {isSelected && (
                    <div className="card-selected-glow" />
                  )}
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
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
          z-index: 30;
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
          width: 90px;
          height: 130px;
          border: 2px solid transparent;
          border-radius: 8px;
          overflow: hidden;
          cursor: pointer;
          background: white;
          padding: 0;
          transition: border-color 0.2s, box-shadow 0.2s;
          box-shadow: 0 4px 12px rgba(0,0,0,0.4);
        }
        .card-button:disabled {
          cursor: default;
        }
        .card-button.hovered {
          border-color: rgba(245, 158, 11, 0.7);
          box-shadow: 0 4px 20px rgba(245, 158, 11, 0.3), 0 4px 12px rgba(0,0,0,0.4);
        }
        .card-button.selected {
          border-color: rgba(16, 185, 129, 0.9);
          box-shadow: 0 0 20px rgba(16, 185, 129, 0.5), 0 4px 12px rgba(0,0,0,0.4);
        }
        .card-image {
          width: 100%;
          height: 100%;
          object-fit: contain;
          display: block;
          pointer-events: none;
        }
        .card-selected-glow {
          position: absolute;
          inset: -3px;
          border-radius: 10px;
          border: 2px solid rgba(16, 185, 129, 0.8);
          animation: pulse-glow 1.5s ease-in-out infinite;
        }
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 8px rgba(16, 185, 129, 0.4); }
          50% { box-shadow: 0 0 20px rgba(16, 185, 129, 0.7); }
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

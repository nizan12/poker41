import React, { useState, useRef } from 'react';
import { Player, SpellType } from '@/types';
import { motion, AnimatePresence } from 'framer-motion';

interface SpellButtonProps {
  player: Player;
  isMyTurn: boolean;
  onUseSpell: () => void;
  disabled?: boolean;
}

const SPELL_ICONS: Record<SpellType, string> = {
  card_flip: 'Card Flip (Putar Balik).svg',
  grave_digger: 'Grave Digger (Penggali Kubur).svg',
  mulligan: 'Mulligan  Refresh (Tukar Baru).svg',
  shield: 'Shield (Pelindung).svg',
  windstorm: 'Windstorm (Badai).svg',
};

const SPELL_NAMES: Record<SpellType, string> = {
  card_flip: 'Putar Balik',
  grave_digger: 'Penggali Kubur',
  mulligan: 'Tukar Baru',
  shield: 'Pelindung',
  windstorm: 'Badai',
};

const SPELL_DESCS: Record<SpellType, string> = {
  card_flip: 'Mengubah arah giliran pemain.',
  grave_digger: 'Ambil kartu dari tumpukan buangan (bebas pilih dari 3 teratas).',
  mulligan: 'Buang semua kartu dan ambil 4 kartu baru dari deck.',
  shield: 'Melindungi diri dari efek spell lawan.',
  windstorm: 'Pilih 1 lawan untuk diberikan 1 kartu acak dari tangan Anda.',
};

export function SpellButton({ player, isMyTurn, onUseSpell, disabled }: SpellButtonProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const pressTimer = useRef<NodeJS.Timeout | null>(null);
  const isLongPress = useRef(false);

  if (!player.spellType) return null;

  const isUsed = player.hasUsedSpell;
  const canUse = !isUsed && isMyTurn && !disabled;
  
  // Encode URI to handle spaces and parentheses in filenames
  const iconUrl = `/spel/${encodeURI(SPELL_ICONS[player.spellType])}`;

  const handleTouchStart = () => {
    isLongPress.current = false;
    pressTimer.current = setTimeout(() => {
      isLongPress.current = true;
      setShowTooltip(true);
    }, 400); // 400ms hold to show tooltip
  };

  const handleTouchEnd = () => {
    if (pressTimer.current) clearTimeout(pressTimer.current);
    setShowTooltip(false);
  };

  const handleClick = (e: React.MouseEvent) => {
    if (isLongPress.current) {
      e.preventDefault();
      return; // Do not cast spell if it was a long press
    }
    onUseSpell();
  };

  return (
    <div 
      className="relative" 
      onMouseEnter={() => setShowTooltip(true)} 
      onMouseLeave={() => setShowTooltip(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
    >
      <motion.button
        onClick={handleClick}
        disabled={!canUse}
        whileHover={canUse ? { scale: 1.1 } : {}}
        whileTap={canUse ? { scale: 0.9 } : {}}
        className={`relative w-12 h-12 rounded-full overflow-hidden flex items-center justify-center
          ${isUsed ? 'bg-surface-dark opacity-50 grayscale' : 'bg-surface-light border border-secondary shadow-[0_0_10px_rgba(245,158,11,0.5)]'}
          ${!canUse && !isUsed ? 'opacity-70' : ''}
          transition-all duration-200
        `}
      >
        <img src={iconUrl} alt={SPELL_NAMES[player.spellType]} className="w-full h-full object-cover" />
        
        {isUsed && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full">
            <span className="text-white text-xs font-bold">USED</span>
          </div>
        )}
      </motion.button>

      <AnimatePresence>
        {showTooltip && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute bottom-full right-0 mb-2 w-48 p-3 bg-surface-dark/95 backdrop-blur-md rounded-xl border border-surface-light shadow-xl z-50 pointer-events-none"
          >
            <h4 className="font-bold text-secondary text-sm mb-1">{SPELL_NAMES[player.spellType]}</h4>
            <p className="text-xs text-text-muted">{SPELL_DESCS[player.spellType]}</p>
            {isUsed && <p className="text-xs text-red-400 mt-1 mt-1 font-semibold">Sudah Dipakai</p>}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

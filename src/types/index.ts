// ============================================
// Remi 41 Online — Core Type Definitions
// ============================================

// --- Card Types ---

export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
export type Rank = 'Ace' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'Jack' | 'Queen' | 'King';

export interface Card {
  id: string;           // e.g., "hearts-Ace"
  suit: Suit;
  rank: Rank;
  value: number;        // Ace=11, 2-10=face, J/Q/K=10
}

export const SUIT_DISPLAY: Record<Suit, { name: string; symbol: string; color: string }> = {
  hearts:   { name: 'Hearts',   symbol: '♥', color: '#EF4444' },
  diamonds: { name: 'Diamonds', symbol: '♦', color: '#3B82F6' },
  clubs:    { name: 'Clubs',    symbol: '♣', color: '#10B981' },
  spades:   { name: 'Spades',   symbol: '♠', color: '#1E1E2E' },
};

export const RANK_VALUES: Record<Rank, number> = {
  'Ace': 11,
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6,
  '7': 7, '8': 8, '9': 9, '10': 10,
  'Jack': 10, 'Queen': 10, 'King': 10,
};

// --- Player Types ---

export interface Player {
  id: string;
  name: string;
  hand: string[];         // Card IDs in hand
  score: number;
  isReady: boolean;
  isConnected: boolean;
  joinedAt: number;       // Timestamp
  seatIndex: number;      // Position at table (0-5)
  isSpectator?: boolean;  // True if they are just watching
  spellType?: SpellType;  // Spell assigned to player
  hasUsedSpell?: boolean;
  isShielded?: boolean;
  avatar?: string;        // URL to their avatar image
}

export type SpellType = 'card_flip' | 'grave_digger' | 'mulligan' | 'shield' | 'windstorm';

// --- Room Types ---

export type RoomStatus = 'waiting' | 'selecting_spell' | 'playing' | 'finished';

export interface Room {
  id: string;
  code: string;
  name: string;
  status: RoomStatus;
  hostId: string;
  maxPlayers: number;
  createdAt: number;
  currentTurn: string;          // Player ID whose turn it is
  turnStartedAt: number;
  turnTimeLimit: number;        // seconds (default 30)
  turnDirection: 1 | -1;        // 1 for clockwise, -1 for counter-clockwise
  deckCards: string[];           // Card IDs in deck (hidden)
  discardPile: string[];         // Card IDs in discard (visible)
  winnerId: string | null;
  roundNumber: number;
  lastAction?: {
    type: 'draw_deck' | 'draw_discard' | 'discard';
    playerId: string;
    cardId: string;
    timestamp: number;
  };
}

// --- Game State ---

export type GamePhase = 'idle' | 'shuffling' | 'dealing' | 'playing' | 'ended';

export interface GameState {
  room: Room | null;
  players: Player[];
  localPlayerId: string | null;
  phase: GamePhase;
  canDraw: boolean;
  canDiscard: boolean;
  canDeclareWin: boolean;
  selectedCardId: string | null;
}

// --- Move Types ---

export type MoveAction = 'draw_deck' | 'draw_discard' | 'discard' | 'declare_win' | 'use_spell';

export interface Move {
  id: string;
  playerId: string;
  action: MoveAction;
  cardId: string | null;        // Card involved in the action
  timestamp: number;
  processed: boolean;
}

// --- Chat Types ---

export interface ChatMessage {
  id: string;
  playerId: string;
  playerName: string;
  message: string;
  timestamp: number;
}

// --- Animation Types ---

export type AnimationType = 'shuffle' | 'deal' | 'draw' | 'discard' | 'win' | 'idle';

export interface AnimationEvent {
  type: AnimationType;
  cardIds?: string[];
  fromPosition?: [number, number, number];
  toPosition?: [number, number, number];
  playerId?: string;
  onComplete?: () => void;
}

// --- Audio Types ---

export type SoundName =
  | 'shuffle'
  | 'deal'
  | 'draw'
  | 'discard'
  | 'tick'
  | 'notify'
  | 'win'
  | 'ambient'
  | 'click'
  | 'error';

// --- Utility ---

export function getCardImagePath(card: Card): string {
  const suitName = card.suit.charAt(0).toUpperCase() + card.suit.slice(1);
  return encodeURI(`/kartu/Suit=${suitName}, Number=${card.rank}.svg`);
}

export function getCardBackPath(color: 'Blue' | 'Red' = 'Blue'): string {
  return encodeURI(`/kartu/Suit=Other, Number=Back ${color}.svg`);
}

export function createDeck(): Card[] {
  const suits: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
  const ranks: Rank[] = ['Ace', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'Jack', 'Queen', 'King'];
  const deck: Card[] = [];

  for (const suit of suits) {
    for (const rank of ranks) {
      deck.push({
        id: `${suit}-${rank}`,
        suit,
        rank,
        value: RANK_VALUES[rank],
      });
    }
  }

  return deck;
}

export function shuffleDeck(deck: Card[]): Card[] {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Calculate score for a hand in Remi 41.
 * Cards of the best (highest-value) suit are counted positively.
 * Cards of other suits are subtracted.
 */
export function calculateHandScore(hand: Card[]): { score: number; bestSuit: Suit } {
  const suitScores: Record<Suit, number> = {
    hearts: 0,
    diamonds: 0,
    clubs: 0,
    spades: 0,
  };

  // Group cards by suit and sum values
  for (const card of hand) {
    suitScores[card.suit] += card.value;
  }

  // Find best suit
  let bestSuit: Suit = 'hearts';
  let bestScore = -Infinity;
  for (const suit of Object.keys(suitScores) as Suit[]) {
    if (suitScores[suit] > bestScore) {
      bestScore = suitScores[suit];
      bestSuit = suit;
    }
  }

  // Calculate final score: best suit positive, others negative
  let finalScore = 0;
  for (const card of hand) {
    if (card.suit === bestSuit) {
      finalScore += card.value;
    } else {
      finalScore -= card.value;
    }
  }

  return { score: finalScore, bestSuit };
}

/**
 * Check if a hand is a perfect 41 (all same suit, total = 41)
 */
export function isWinningHand(hand: Card[]): boolean {
  if (hand.length !== 4) return false;

  const suit = hand[0].suit;
  const allSameSuit = hand.every(c => c.suit === suit);
  if (!allSameSuit) return false;

  const total = hand.reduce((sum, c) => sum + c.value, 0);
  return total === 41;
}

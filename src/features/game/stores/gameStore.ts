import { create } from 'zustand';
import type { GamePhase, Player, Room, Card } from '@/types';

interface GameStore {
  // Room state (synced from Firestore)
  room: Room | null;
  players: Player[];
  localPlayerId: string | null;

  // Game phase
  phase: GamePhase;

  // Local interaction state
  selectedCardId: string | null;
  hoveredCardId: string | null;
  canDraw: boolean;
  canDiscard: boolean;
  canDeclareWin: boolean;

  // Local hand (client-side view of own cards)
  localHand: Card[];

  // Actions
  setRoom: (room: Room | null) => void;
  setPlayers: (players: Player[]) => void;
  setLocalPlayerId: (id: string | null) => void;
  setPhase: (phase: GamePhase) => void;
  selectCard: (cardId: string | null) => void;
  hoverCard: (cardId: string | null) => void;
  setCanDraw: (can: boolean) => void;
  setCanDiscard: (can: boolean) => void;
  setCanDeclareWin: (can: boolean) => void;
  setLocalHand: (hand: Card[]) => void;
  reset: () => void;

  // Action callbacks bound from the page
  drawFromDeck?: () => void;
  drawFromDiscard?: () => void;
  setDrawActions: (deck: () => void, discard: () => void) => void;

  // Computed
  isMyTurn: () => boolean;
  getLocalPlayer: () => Player | undefined;
  getOtherPlayers: () => Player[];
}

const initialState = {
  room: null,
  players: [],
  localPlayerId: null,
  phase: 'idle' as GamePhase,
  selectedCardId: null,
  hoveredCardId: null,
  canDraw: false,
  canDiscard: false,
  canDeclareWin: false,
  localHand: [],
  drawFromDeck: undefined,
  drawFromDiscard: undefined,
};

export const useGameStore = create<GameStore>((set, get) => ({
  ...initialState,

  setRoom: (room) => set({ room }),
  setPlayers: (players) => set({ players }),
  setLocalPlayerId: (id) => set({ localPlayerId: id }),
  setPhase: (phase) => set({ phase }),
  selectCard: (cardId) => set({ selectedCardId: cardId }),
  hoverCard: (cardId) => set({ hoveredCardId: cardId }),
  setCanDraw: (can) => set({ canDraw: can }),
  setCanDiscard: (can) => set({ canDiscard: can }),
  setCanDeclareWin: (can) => set({ canDeclareWin: can }),
  setLocalHand: (hand) => set({ localHand: hand }),
  reset: () => set(initialState),

  setDrawActions: (deck, discard) => set({ drawFromDeck: deck, drawFromDiscard: discard }),

  isMyTurn: () => {
    const { room, localPlayerId } = get();
    return room?.currentTurn === localPlayerId;
  },

  getLocalPlayer: () => {
    const { players, localPlayerId } = get();
    return players.find(p => p.id === localPlayerId);
  },

  getOtherPlayers: () => {
    const { players, localPlayerId } = get();
    return players.filter(p => p.id !== localPlayerId);
  },
}));

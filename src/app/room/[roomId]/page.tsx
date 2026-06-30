'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import dynamic from 'next/dynamic';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import * as THREE from 'three';
import { useAuthStore } from '@/features/auth/stores/authStore';
import { useGameStore } from '@/features/game/stores/gameStore';
import { useUIStore } from '@/features/game/stores/uiStore';
import { audioManager } from '@/lib/audioManager';
import {
  onRoomSnapshot,
  onPlayersSnapshot,
  updateRoom,
  updatePlayer,
  submitMove,
  sendChatMessage,
  onChatSnapshot,
  removePlayer,
  updateUserStats,
} from '@/lib/firebase/firestore';
import {
  createDeck,
  shuffleDeck,
  isWinningHand,
  calculateHandScore,
  RANK_VALUES,
  type Suit,
  type Rank,
  type Card,
  type Player,
  type Room,
  type ChatMessage,
  type SpellType,
} from '@/types';
import { PlayerHandUI } from '@/features/game/components/PlayerHandUI';
import { VoiceChatManager } from '@/features/voice/components/VoiceChatManager';
import { ConfettiEffect } from '@/features/scene/components/ConfettiEffect';
import { BgmPlayer } from '@/features/scene/components/BgmPlayer';
import { Crown, Target, Timer, VolumeX, Volume2, Gamepad2, Recycle, Trash2, Rocket, Trophy, MessageSquare, Library, Users, X, Mic, MicOff, Music, Smile, Search, Play, Pause, Loader } from 'lucide-react';
// Dynamic import for 3D scene (no SSR)
const GameScene = dynamic(
  () => import('@/features/scene/components/GameScene'),
  { ssr: false }
);

export default function GameRoomPage() {
  const params = useParams();
  const router = useRouter();
  const roomId = params.roomId as string;
  const { user } = useAuthStore();
  const {
    room, players, localHand, selectedCardId, phase,
    setRoom, setPlayers, setLocalPlayerId, setPhase,
    setLocalHand, selectCard, setCanDraw, setCanDiscard,
    setCanDeclareWin, setDrawActions,
    isDealingIntro, setIsDealingIntro, dealtCardsCount, setDealtCardsCount,
    startAnimation, isGraveDiggerActive, setIsGraveDiggerActive
  } = useGameStore();
  const { isMuted, toggleMute, isMicOn, toggleMic, isBgmOn, toggleBgm, bgmVolume, setBgmVolume, setCurrentVideoId, currentVideoId, currentMusicThumbnail, setCurrentMusicThumbnail } = useUIStore();

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [selectedSpell, setSelectedSpell] = useState<SpellType | ''>('');
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [lastReadMessageCount, setLastReadMessageCount] = useState(0);
  const [isPlayersOpen, setIsPlayersOpen] = useState(false);
  const [isEmojiOpen, setIsEmojiOpen] = useState(false);
  const [isWindstormTargeting, setIsWindstormTargeting] = useState(false);
  const [isBgmPopoverOpen, setIsBgmPopoverOpen] = useState(false);
  const [activeReactions, setActiveReactions] = useState<{playerId: string, emoji: string, id: number}[]>([]);
  const [activeChatBubbles, setActiveChatBubbles] = useState<{playerId: string, message: string, id: number}[]>([]);
  const [turnTimer, setTurnTimer] = useState(30);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
  const hasJoinedRef = useRef(false);

  // Set local player ID
  useEffect(() => {
    if (user) {
      setLocalPlayerId(user.uid);
    }
  }, [user, setLocalPlayerId]);

  // Subscribe to room data
  useEffect(() => {
    if (!roomId) return;

    const unsubRoom = onRoomSnapshot(roomId, (data) => {
      if (data) {
        setRoom(data as unknown as Room);
        if (data.status === 'playing') setPhase('playing');
        if (data.status === 'finished') {
          setPhase('ended');
          if (data.winnerId && data.winnerId !== 'DRAW') {
             audioManager.play('win');
          }
        }
        
        // Handle Emoji Reaction from lastAction
        if (data.lastAction?.type === 'reaction' && data.lastAction?.timestamp > Date.now() - 5000) {
           const reactionId = data.lastAction.timestamp;
           setActiveReactions(prev => {
             // Don't add duplicate if it's the exact same timestamp
             if (prev.find(r => r.id === reactionId)) return prev;
             return [...prev, { playerId: data.lastAction.playerId, emoji: data.lastAction.emoji, id: reactionId }];
           });
           
           // Remove after 3 seconds
           setTimeout(() => {
             setActiveReactions(prev => prev.filter(r => r.id !== reactionId));
           }, 3000);
        }
      } else {
        router.push('/lobby');
      }
    });

    const unsubPlayers = onPlayersSnapshot(roomId, (data) => {
      setPlayers(data as unknown as Player[]);
    });

    const unsubChat = onChatSnapshot(roomId, (data) => {
      setChatMessages(data as unknown as ChatMessage[]);
    });

    return () => {
      unsubRoom();
      unsubPlayers();
      unsubChat();
    };
  }, [roomId, setRoom, setPlayers, setPhase, router]);

  // Handle Chat Bubbles
  useEffect(() => {
    chatMessages.forEach(msg => {
      // If message is newer than 5 seconds
      if (Date.now() - msg.timestamp < 5000) {
        setActiveChatBubbles(prev => {
          // Already showing this exact message
          if (prev.find(b => b.id === msg.timestamp)) return prev;
          
          // Auto remove after 5 seconds
          setTimeout(() => {
            setActiveChatBubbles(p => p.filter(b => b.id !== msg.timestamp));
          }, 5000);
          
          // Remove old bubbles from the same player and add the new one
          return [...prev.filter(b => b.playerId !== msg.playerId), { playerId: msg.playerId, message: msg.message, id: msg.timestamp }];
        });
      }
    });
  }, [chatMessages]);

  useEffect(() => {
    if (isChatOpen) {
      setLastReadMessageCount(chatMessages.length);
    }
  }, [isChatOpen, chatMessages.length]);

  const unreadCount = isChatOpen ? 0 : Math.max(0, chatMessages.length - lastReadMessageCount);

  // Update local hand from players data
  useEffect(() => {
    if (!user || !players.length) return;
    const me = players.find(p => p.id === user.uid);
    if (me) {
      hasJoinedRef.current = true;
      if (me.hand) {
        const hand: Card[] = me.hand.map(cardId => {
          const [suit, rank] = cardId.split('-');
          const value = rank === 'Ace' ? 11 :
            ['Jack', 'Queen', 'King'].includes(rank) ? 10 :
            parseInt(rank);
          return { id: cardId, suit: suit as Card['suit'], rank: rank as Card['rank'], value };
        });
        setLocalHand(hand);

        // Check actions
        const myTurn = room?.currentTurn === user.uid && room?.status === 'playing';
        setCanDraw(myTurn && (hand.length === 4 || hand.length === 3));
        setCanDiscard(myTurn && hand.length > 4);
        setCanDeclareWin(myTurn && isWinningHand(hand));
      }
    } else if (hasJoinedRef.current) {
      // If user was previously in the room but now isn't (kicked), redirect to lobby
      router.push('/lobby');
    }
  }, [players, user, room, setLocalHand, setCanDraw, setCanDiscard, setCanDeclareWin, router]);

  // Turn timer
  const myTurnElapsedRef = useRef(0);
  
  useEffect(() => {
    if (phase !== 'playing') return;

    setTurnTimer(room?.turnTimeLimit || 30);
    myTurnElapsedRef.current = 0;

    const interval = setInterval(() => {
      setTurnTimer(prev => Math.max(0, prev - 1));
      myTurnElapsedRef.current += 1;
    }, 1000);

    return () => clearInterval(interval);
  }, [phase, room?.currentTurn, room?.turnTimeLimit]);

  // Handle auto-start game when all players have selected spells
  useEffect(() => {
    if (!room || !user || room.hostId !== user.uid) return;
    if (room.status === 'selecting_spell') {
      const activePlayers = players.filter(p => !p.isSpectator);
      const allReady = activePlayers.every(p => p.isReady);
      if (allReady && activePlayers.length >= 2) {
        handleStartGame();
      }
    }
  }, [room?.status, players, user?.uid, room?.hostId]);

  // Handle Animations from lastAction
  const lastActionRef = useRef<number>(0);
  
  // Intro Sequence
  const hasPlayedIntroRef = useRef<boolean>(false);
  useEffect(() => {
    // Only play intro if we are playing AND the game started within the last 15 seconds.
    // hasPlayedIntroRef ensures it only runs once per page load.
    const isNewGame = room?.turnStartedAt && Date.now() - room.turnStartedAt < 15000;
    
    if (phase === 'playing' && isNewGame && !hasPlayedIntroRef.current) {
      hasPlayedIntroRef.current = true;
      // Start Intro Sequence
      setIsDealingIntro(true);
      setDealtCardsCount(0);
      
      const playShuffleLoop = async () => {
        // Just a small delay before dealing starts
        await new Promise(res => setTimeout(res, 500));
        
        // Deal cards sequentially
        // 4 rounds of dealing
        const deckPos: [number, number, number] = [-0.8, 0.05, 0];
        let currentDealtCount = 0;
        
        for (let r = 0; r < 4; r++) {
          const activePlayers = players.filter(p => !p.isSpectator);
          for (let pIdx = 0; pIdx < activePlayers.length; pIdx++) {
            const p = activePlayers[pIdx];
            const isMe = p.id === user?.uid;
            
            let playerPos: [number, number, number] = [0, -1, 5];
            let playerRot: [number, number, number] = [0, 0, 0];
            
            if (!isMe) {
              const otherPlayers = activePlayers.filter(op => op.id !== user?.uid);
              const count = otherPlayers.length;
              const opIdx = otherPlayers.findIndex(op => op.id === p.id);
              if (opIdx !== -1) {
                const t = count > 1 ? opIdx / (count - 1) : 0.5;
                const angle = Math.PI * 0.15 + t * (Math.PI * 0.7);
                const radius = 4.2;
                playerPos = [
                  Math.sin(angle) * radius,
                  0.02,
                  -Math.cos(angle) * radius
                ];
                playerRot = [0, -angle + Math.PI, 0];
              }
            } else {
              playerPos = [0, 0.02, 3.2];
            }
            
            // Animate card flying (use 'hidden' so it renders the back of the card)
            audioManager.play('deal');
            startAnimation({
              cardId: `hidden`, 
              fromPos: deckPos,
              toPos: playerPos,
              fromRot: [0, 0, 0],
              toRot: playerRot,
              duration: 300
            });
            
            await new Promise(res => setTimeout(res, 300));
          }
          currentDealtCount++;
          setDealtCardsCount(currentDealtCount);
        }
        
        setIsDealingIntro(false);
      };
      
      playShuffleLoop();
    }
  }, [phase, players, user?.uid, setIsDealingIntro, setDealtCardsCount, startAnimation, room?.turnStartedAt]);

  useEffect(() => {
    if (!room?.lastAction || room.lastAction.timestamp <= lastActionRef.current) return;
    
    lastActionRef.current = room.lastAction.timestamp;
    const action = room.lastAction;
    const isMe = action.playerId === user?.uid;
    
    // Positions
    const deckPos: [number, number, number] = [-0.8, 0.05, 0];
    const discardPos: [number, number, number] = [0.8, 0.02, 0];
    
    // Calculate player 3D position
    let playerPos: [number, number, number] = [0, -1, 5]; // default for local player (fly to camera)
    let playerRot: [number, number, number] = [0, 0, 0];
    
    if (!isMe) {
      const activePlayers = players.filter(p => !p.isSpectator);
      const otherPlayers = activePlayers.filter(p => p.id !== user?.uid);
      const count = otherPlayers.length;
      const pIdx = otherPlayers.findIndex(p => p.id === action.playerId);
      if (pIdx !== -1) {
        const t = count > 1 ? pIdx / (count - 1) : 0.5;
        const angle = Math.PI * 0.15 + t * (Math.PI * 0.7);
        const radius = 4.2;
        
        // Base center position
        const basePath = new THREE.Vector3(
          Math.sin(angle) * radius, 
          0.02, 
          -Math.cos(angle) * radius
        );
        playerRot = [0, -angle + Math.PI, 0];

        // Offset to far-right card (5th card spot: local X = 0.5)
        const localOffset = new THREE.Vector3(0.5, 0, 0);
        localOffset.applyEuler(new THREE.Euler(...playerRot));
        
        basePath.add(localOffset);
        playerPos = [basePath.x, basePath.y, basePath.z];
      }
    } else {
      // Local player is at the bottom of the table
      const basePath = new THREE.Vector3(0, 0.02, 4.2);
      playerRot = [0, 0, 0];
      
      const localOffset = new THREE.Vector3(0.5, 0, 0);
      localOffset.applyEuler(new THREE.Euler(...playerRot));
      
      basePath.add(localOffset);
      playerPos = [basePath.x, basePath.y, basePath.z];
    }

    if (action.type === 'draw_deck') {
      startAnimation({
        cardId: action.cardId,
        fromPos: deckPos,
        toPos: playerPos,
        fromRot: [Math.PI, 0, 0],
        toRot: playerRot,
        duration: 400
      });
    } else if (action.type === 'draw_discard') {
      startAnimation({
        cardId: action.cardId,
        fromPos: discardPos,
        toPos: playerPos,
        fromRot: [0, 0, 0],
        toRot: playerRot,
        duration: 400
      });
    } else if (action.type === 'discard') {
      startAnimation({
        cardId: action.cardId,
        fromPos: playerPos,
        toPos: discardPos,
        fromRot: playerRot,
        toRot: [0, 0, 0],
        duration: 400
      });
    }
  }, [room?.lastAction, players, user?.uid, startAnimation]);

  const handlePrepareGame = async () => {
    if (!room || !user || room.hostId !== user.uid) return;
    
    const activePlayers = players.filter(p => !p.isSpectator);
    if (activePlayers.length < 2) return;

    // Reset isReady for all players before starting
    for (const player of activePlayers) {
      await updatePlayer(roomId, player.id, { isReady: false, spellType: null });
    }
    
    await updateRoom(roomId, {
      status: 'selecting_spell'
    });
  };

  const handleSelectSpell = async () => {
    if (!room || !user || !selectedSpell || isProcessing) return;
    setIsProcessing(true);
    try {
      await updatePlayer(roomId, user.uid, {
        spellType: selectedSpell,
        isReady: true
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Game actions
  const handleStartGame = async () => {
    if (!room || !user || room.hostId !== user.uid) return;
    
    const activePlayers = players.filter(p => !p.isSpectator);
    if (activePlayers.length < 2) return;

    // Shuffle deck and deal
    const deck = shuffleDeck(createDeck());
    const hands: Record<string, string[]> = {};
    let deckIndex = 0;

    for (const player of activePlayers) {
      hands[player.id] = [];
      for (let i = 0; i < 4; i++) {
        hands[player.id].push(deck[deckIndex].id);
        deckIndex++;
      }
    }

    const remainingDeck = deck.slice(deckIndex).map(c => c.id);

    // Update room
    await updateRoom(roomId, {
      status: 'playing',
      deckCards: remainingDeck,
      discardPile: [],
      currentTurn: activePlayers[0].id,
      turnStartedAt: Date.now(),
    });

    // Deal hands to each player
    for (const player of activePlayers) {
      await updatePlayer(roomId, player.id, {
        hand: hands[player.id],
        isReady: true,
      });
    }
  };

  const handleDrawDeck = async () => {
    if (!user || !room || room.currentTurn !== user.uid || localHand.length >= 5 || isProcessing) return;
    setIsProcessing(true);
    
    try {
      const deckCards = [...(room.deckCards || [])];
      if (deckCards.length === 0) return;

      const drawnCard = deckCards.pop()!;
      const myPlayer = players.find(p => p.id === user.uid);
      if (!myPlayer) return;

      const newHand = [...myPlayer.hand, drawnCard];
      const isTurnOver = newHand.length === 4;

      if (isTurnOver) {
        const activePlayers = players.filter(p => !p.isSpectator);
        const currentIdx = activePlayers.findIndex(p => p.id === user.uid);
        const direction = room.turnDirection || 1;
        const nextIdx = (currentIdx + direction + activePlayers.length) % activePlayers.length;

        await updateRoom(roomId, { 
          deckCards,
          currentTurn: activePlayers[nextIdx].id,
          turnStartedAt: Date.now(),
          lastAction: { type: 'draw_deck', playerId: user.uid, cardId: 'hidden', timestamp: Date.now() }
        });
      } else {
        await updateRoom(roomId, { 
          deckCards,
          lastAction: { type: 'draw_deck', playerId: user.uid, cardId: 'hidden', timestamp: Date.now() }
        });
      }
      
      await updatePlayer(roomId, user.uid, {
        hand: newHand,
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDrawDiscard = async () => {
    if (!user || !room || room.currentTurn !== user.uid || localHand.length >= 5 || isProcessing) return;
    setIsProcessing(true);

    try {
      const discardPile = [...(room.discardPile || [])];
      if (discardPile.length === 0) return;

      const drawnCard = discardPile.pop()!;
      const myPlayer = players.find(p => p.id === user.uid);
      if (!myPlayer) return;

      const newHand = [...myPlayer.hand, drawnCard];
      const isTurnOver = newHand.length === 4;

      if (isTurnOver) {
        const activePlayers = players.filter(p => !p.isSpectator);
        const currentIdx = activePlayers.findIndex(p => p.id === user.uid);
        const direction = room.turnDirection || 1;
        const nextIdx = (currentIdx + direction + activePlayers.length) % activePlayers.length;

        await updateRoom(roomId, { 
          discardPile,
          currentTurn: activePlayers[nextIdx].id,
          turnStartedAt: Date.now(),
          lastAction: { type: 'draw_discard', playerId: user.uid, cardId: drawnCard, timestamp: Date.now() }
        });
      } else {
        await updateRoom(roomId, { 
          discardPile,
          lastAction: { type: 'draw_discard', playerId: user.uid, cardId: drawnCard, timestamp: Date.now() }
        });
      }
      
      await updatePlayer(roomId, user.uid, {
        hand: newHand,
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDiscard = async (overrideCardId?: string) => {
    const cardToDiscard = overrideCardId || selectedCardId;
    if (!user || !room || room.currentTurn !== user.uid || !cardToDiscard || localHand.length <= 4 || isProcessing) return;
    setIsProcessing(true);

    try {
      const myPlayer = players.find(p => p.id === user.uid);
      if (!myPlayer) return;

      audioManager.play('discard');
      const newHand = myPlayer.hand.filter((id: string) => id !== cardToDiscard);
      const newDiscard = [...(room.discardPile || []), cardToDiscard];

      const newHandCards = newHand.map(id => {
        const [suit, rank] = id.split('-');
        return { id, suit: suit as any, rank: rank as any, value: (RANK_VALUES as any)[rank] };
      });

      if (isWinningHand(newHandCards)) {
        // Automatic win!
        await finalizeGame(user.uid, newDiscard);
        await updatePlayer(roomId, user.uid, { hand: newHand });
        selectCard(null);
        return;
      }

      // Check if deck is empty (Draw)
      if (room.deckCards && room.deckCards.length === 0) {
        await finalizeGame('DRAW', newDiscard);
        await updatePlayer(roomId, user.uid, { hand: newHand });
        selectCard(null);
        return;
      }

      // Move to next active player
      const activePlayers = players.filter(p => !p.isSpectator);
      const currentIdx = activePlayers.findIndex(p => p.id === user.uid);
      const direction = room.turnDirection || 1;
      const nextIdx = (currentIdx + direction + activePlayers.length) % activePlayers.length;

      const isTurnOver = newHand.length === 4;

      if (isTurnOver) {
        await updateRoom(roomId, {
          discardPile: newDiscard,
          currentTurn: activePlayers[nextIdx].id,
          turnStartedAt: Date.now(),
          lastAction: { type: 'discard', playerId: user.uid, cardId: cardToDiscard, timestamp: Date.now() }
        });
      } else {
        await updateRoom(roomId, {
          discardPile: newDiscard,
          lastAction: { type: 'discard', playerId: user.uid, cardId: cardToDiscard, timestamp: Date.now() }
        });
      }
      
      await updatePlayer(roomId, user.uid, { hand: newHand });
      selectCard(null);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUseSpell = async () => {
    const myPlayer = players.find(p => p.id === user?.uid);
    if (!user || !room || !myPlayer || myPlayer.hasUsedSpell || isProcessing || room.currentTurn !== user.uid) return;
    setIsProcessing(true);

    try {
      const spellType = myPlayer.spellType;
      if (!spellType) return;
      
      const activePlayers = players.filter(p => !p.isSpectator);
      const currentIdx = activePlayers.findIndex(p => p.id === user.uid);
      const direction = room.turnDirection || 1;

      if (spellType === 'card_flip') {
        await updateRoom(roomId, {
          turnDirection: direction === 1 ? -1 : 1,
          lastAction: { type: 'use_spell', playerId: user.uid, cardId: 'card_flip', timestamp: Date.now() }
        });
      } else if (spellType === 'shield') {
        await updatePlayer(roomId, user.uid, { isShielded: true });
        await updateRoom(roomId, {
          lastAction: { type: 'use_spell', playerId: user.uid, cardId: 'shield', timestamp: Date.now() }
        });
      } else if (spellType === 'mulligan') {
        const currentHand = myPlayer.hand;
        const deck = [...(room.deckCards || [])];
        if (deck.length < 4) return; 

        const newHand = deck.splice(deck.length - 4, 4);
        const newDiscard = [...(room.discardPile || []), ...currentHand];
        
        await updateRoom(roomId, {
          deckCards: deck,
          discardPile: newDiscard,
          lastAction: { type: 'use_spell', playerId: user.uid, cardId: 'mulligan', timestamp: Date.now() }
        });
        await updatePlayer(roomId, user.uid, { hand: newHand });
      } else if (spellType === 'windstorm') {
        setIsWindstormTargeting(true);
        setIsProcessing(false);
        return;
      } else if (spellType === 'grave_digger') {
        setIsGraveDiggerActive(true);
        setIsProcessing(false);
        return;
      }

      audioManager.play('notify');
      await updatePlayer(roomId, user.uid, { hasUsedSpell: true });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleWindstormTargetSelect = async (targetPlayerId: string) => {
    if (!user || !room || isProcessing) return;
    setIsProcessing(true);
    try {
      const myPlayer = players.find(p => p.id === user.uid);
      const targetPlayer = players.find(p => p.id === targetPlayerId);
      if (!myPlayer || !targetPlayer || targetPlayer.isShielded || myPlayer.hand.length === 0) {
        setIsWindstormTargeting(false);
        return;
      }

      const handCopy = [...myPlayer.hand];
      const randomIdx = Math.floor(Math.random() * handCopy.length);
      const passedCard = handCopy.splice(randomIdx, 1)[0];
      
      await updatePlayer(roomId, user.uid, { hand: handCopy, hasUsedSpell: true });
      await updatePlayer(roomId, targetPlayer.id, { hand: [...targetPlayer.hand, passedCard] });
      await updateRoom(roomId, {
        lastAction: { type: 'use_spell', playerId: user.uid, cardId: 'windstorm', timestamp: Date.now() }
      });
      setIsWindstormTargeting(false);
      audioManager.play('notify');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGraveDiggerSelect = async (cardId: string) => {
    if (!user || !room || isProcessing) return;
    setIsProcessing(true);
    try {
      const myPlayer = players.find(p => p.id === user.uid);
      if (!myPlayer) return;

      const newHand = [...myPlayer.hand, cardId];
      const newDiscard = (room.discardPile || []).filter(c => c !== cardId);

      await updateRoom(roomId, {
        discardPile: newDiscard,
        lastAction: { type: 'use_spell', playerId: user.uid, cardId: 'grave_digger', timestamp: Date.now() }
      });
      await updatePlayer(roomId, user.uid, { hand: newHand, hasUsedSpell: true });
      setIsGraveDiggerActive(false);
      audioManager.play('draw');
    } finally {
      setIsProcessing(false);
    }
  };

  // Auto-play when timer runs out (Smart Bot)
  useEffect(() => {
    // Prevent instant auto-play chain reaction by verifying we actually spent time on our turn
    const timeLimit = room?.turnTimeLimit || 30;
    const hasReallyTimedOut = turnTimer === 0 && myTurnElapsedRef.current >= (timeLimit - 1);
    
    if (hasReallyTimedOut && room?.currentTurn === user?.uid && !isProcessing && phase === 'playing' && !isDealingIntro) {
      if (localHand.length === 4) {
        // Decide whether to draw from deck or discard pile
        const currentBestSuit = calculateHandScore(localHand).bestSuit;
        let tookDiscard = false;
        
        if (room && room.discardPile && room.discardPile.length > 0) {
          const topDiscardId = room.discardPile[room.discardPile.length - 1];
          const topDiscardSuit = topDiscardId.split('-')[0];
          
          // If the top discard card matches our best suit, take it!
          if (topDiscardSuit.toLowerCase() === currentBestSuit.toLowerCase()) {
            handleDrawDiscard();
            tookDiscard = true;
          }
        }
        
        if (!tookDiscard) {
          handleDrawDeck();
        }
      } else if (localHand.length === 5) {
        // Discard the lowest value card that doesn't match our best suit
        const bestSuit = calculateHandScore(localHand).bestSuit;
        const offSuitCards = localHand.filter(c => c.suit.toLowerCase() !== bestSuit.toLowerCase());
        
        if (offSuitCards.length > 0) {
          // Discard the lowest value card of a different suit
          offSuitCards.sort((a, b) => a.value - b.value);
          handleDiscard(offSuitCards[0].id);
        } else {
          // If all 5 cards somehow match the same suit, discard the lowest value
          const sorted = [...localHand].sort((a, b) => a.value - b.value);
          handleDiscard(sorted[0].id);
        }
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turnTimer, room?.currentTurn, user?.uid, isProcessing, phase, localHand, isDealingIntro]);

  const handleDeclareWin = async () => {
    if (!user || !room || room.currentTurn !== user.uid) return;
    if (!isWinningHand(localHand)) return;

    await finalizeGame(user.uid, room.discardPile || []);
  };

  const finalizeGame = async (winnerId: string, discardPile: string[]) => {
    await updateRoom(roomId, {
      status: 'finished',
      winnerId,
      discardPile,
    });
    
    // Process stats for all players
    // We do it asynchronously without blocking
    Promise.all(players.map(async (p) => {
      if (p.isSpectator) return;
      
      const pHand = (p.hand || []).map(id => {
        const [suit, rank] = id.split('-');
        return { id, suit: suit as any, rank: rank as any, value: (RANK_VALUES as any)[rank] };
      });
      const scoreInfo = calculateHandScore(pHand);
      const isWin = winnerId === p.id;
      
      try {
        await updateUserStats(p.id, isWin, scoreInfo.score, p.name);
      } catch (err) {
        console.error('Error updating stats for player', p.id, err);
      }
    })).catch(console.error);
  };

  const drawDeckRef = useRef(handleDrawDeck);
  const drawDiscardRef = useRef(handleDrawDiscard);

  useEffect(() => {
    drawDeckRef.current = handleDrawDeck;
    drawDiscardRef.current = handleDrawDiscard;
  });

  useEffect(() => {
    setDrawActions(
      () => drawDeckRef.current?.(),
      () => drawDiscardRef.current?.()
    );
  }, [setDrawActions]);

  const handleSendChat = async () => {
    if (!user || !chatInput.trim()) return;
    const me = players.find(p => p.id === user.uid);
    await sendChatMessage(roomId, {
      playerId: user.uid,
      playerName: me?.name || 'Anonymous',
      message: chatInput.trim(),
    });
    setChatInput('');
  };

  const localPlayer = useMemo(() => players.find(p => p.id === user?.uid), [players, user?.uid]);
  const getCardDetails = (id: string): Card => {
    const [suit, rank] = id.split('-');
    return {
      id,
      suit: suit as Suit,
      rank: rank as Rank,
      value: RANK_VALUES[rank as Rank],
    };
  };

  const isHost = user && room?.hostId === user.uid;
  const isPlaying = room?.status === 'playing';
  const isWaiting = room?.status === 'waiting';
  const isFinished = room?.status === 'finished';
  const myTurn = isPlaying && room?.currentTurn === user?.uid;

  const winnerPlayer = players.find((p) => p.id === room?.winnerId);

  const leaderboard = useMemo(() => {
    if (!isFinished) return [];
    return players.map(p => {
      const pHand = (p.hand || []).map(getCardDetails);
      return {
        player: p,
        scoreInfo: calculateHandScore(pHand)
      };
    }).sort((a, b) => b.scoreInfo.score - a.scoreInfo.score);
  }, [isFinished, players]);

  const handleLeaveRoom = async () => {
    if (!user || !room) return;
    try {
      setIsProcessing(true);
      
      // If player is host, assign new host
      if (room.hostId === user.uid) {
        const otherPlayers = players.filter(p => p.id !== user.uid);
        if (otherPlayers.length > 0) {
          await updateRoom(roomId, { hostId: otherPlayers[0].id });
        }
      }

      // If playing and it's their turn, pass turn
      if (phase === 'playing' && room.currentTurn === user.uid) {
        const activePlayers = players.filter(p => !p.isSpectator);
        const otherPlayers = activePlayers.filter(p => p.id !== user.uid);
        if (otherPlayers.length > 0) {
          // Simple pass to next available player
          const currentIdx = activePlayers.findIndex(p => p.id === user.uid);
          const direction = room.turnDirection || 1;
          const nextIdx = direction === 1 
            ? currentIdx % otherPlayers.length 
            : (currentIdx - 1 + otherPlayers.length) % otherPlayers.length;
          const nextPlayer = otherPlayers[nextIdx] || otherPlayers[0];
          await updateRoom(roomId, {
            currentTurn: nextPlayer.id,
            turnStartedAt: Date.now()
          });
        }
      }

      // Remove from firestore
      await removePlayer(roomId, user.uid);
      router.push('/lobby');
    } catch (e) {
      console.error('Error leaving room:', e);
      setIsProcessing(false);
    }
  };

  const handleKickPlayer = async (targetPlayerId: string) => {
    if (!user || !room || room.hostId !== user.uid) return;
    try {
      // If playing and it's their turn, pass turn
      if (phase === 'playing' && room.currentTurn === targetPlayerId) {
        const activePlayers = players.filter(p => !p.isSpectator);
        const otherPlayers = activePlayers.filter(p => p.id !== targetPlayerId);
        if (otherPlayers.length > 0) {
          const currentIdx = activePlayers.findIndex(p => p.id === targetPlayerId);
          const direction = room.turnDirection || 1;
          const nextIdx = direction === 1 
            ? currentIdx % otherPlayers.length 
            : (currentIdx - 1 + otherPlayers.length) % otherPlayers.length;
          const nextPlayer = otherPlayers[nextIdx] || otherPlayers[0];
          await updateRoom(roomId, {
            currentTurn: nextPlayer.id,
            turnStartedAt: Date.now()
          });
        }
      }
      // Remove from firestore
      await removePlayer(roomId, targetPlayerId);
    } catch (e) {
      console.error('Error kicking player:', e);
    }
  };

  const sendReaction = async (emoji: string) => {
    if (!user || !room) return;
    setIsEmojiOpen(false);
    await updateRoom(roomId, {
      lastAction: { type: 'reaction', emoji, playerId: user.uid, timestamp: Date.now() }
    });
  };

  const handleSearchMusic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const res = await fetch(`https://yt4pix.vercel.app/api/search?q=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      setSearchResults(data);
    } catch (err) {
      console.error('Failed to search music', err);
    } finally {
      setIsSearching(false);
    }
  };

  const bgmClickTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleBgmClick = () => {
    if (bgmClickTimeoutRef.current) {
      // Double click
      clearTimeout(bgmClickTimeoutRef.current);
      bgmClickTimeoutRef.current = null;
      setIsBgmPopoverOpen(!isBgmPopoverOpen);
    } else {
      // Single click
      bgmClickTimeoutRef.current = setTimeout(() => {
        toggleBgm();
        bgmClickTimeoutRef.current = null;
      }, 250); // 250ms wait for double click
    }
  };

  return (
    <div className="w-full h-screen relative overflow-hidden bg-background">
      {/* Voice Chat System */}
      <VoiceChatManager />
      
      {/* Background Music System */}
      <BgmPlayer />
      
      {/* Confetti Effect on Win */}
      <ConfettiEffect />

      {/* 3D Game Scene */}
      <GameScene />

      {/* HUD Overlay */}
      <div className="hud-overlay">
        {/* Top Bar */}
        <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 py-3">
          <button
            onClick={handleLeaveRoom}
            disabled={isProcessing}
            className="glass-card w-8 h-8 p-0 justify-center md:w-auto md:h-auto md:px-3 md:py-2 text-text-muted hover:text-text text-sm flex items-center md:gap-2 transition-colors disabled:opacity-50 !rounded-full md:!rounded-xl"
          >
            <span className="md:hidden">←</span>
            <span className="hidden md:inline">← Keluar</span>
          </button>

          <div className="flex items-center gap-2 relative">
            <div className="glass-card px-2 py-1 md:px-4 md:py-2 text-center max-w-[100px] sm:max-w-[150px] md:max-w-none mr-1 md:mr-2">
              <div className="text-text-bright font-heading font-bold text-[10px] md:text-sm truncate">
                {room?.name || 'Loading...'}
              </div>
              <div className="text-text-muted text-[9px] md:text-xs truncate">
                ID: {roomId?.slice(0, 8)}
              </div>
            </div>
            
            {currentMusicThumbnail && currentVideoId && (
              <div 
                className={`w-8 h-8 md:w-10 md:h-10 rounded-full overflow-hidden border-2 ${isBgmOn ? 'border-primary animate-[spin_4s_linear_infinite]' : 'border-border'} flex-shrink-0 transition-colors cursor-pointer shadow-lg`}
                onClick={handleBgmClick}
                title="Cover Musik"
              >
                <img src={currentMusicThumbnail} className="w-full h-full object-cover" alt="Cover" />
              </div>
            )}
            
            <button
              onClick={handleBgmClick}
              className={`glass-card p-2 md:px-3 md:py-2 text-sm flex items-center gap-2 transition-colors ${isBgmOn ? 'text-primary' : 'text-text-muted hover:text-text'}`}
              title="Klik 1x Play/Pause, Klik 2x Pengaturan"
            >
              <Music className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsEmojiOpen(!isEmojiOpen)}
              className="glass-card p-2 text-text-muted hover:text-primary transition-colors"
              title="Kirim Emoji"
            >
              <Smile className="w-4 h-4" />
            </button>
            
            
            {/* BGM Popover */}
            <AnimatePresence>
              {isBgmPopoverOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute top-12 right-0 md:right-24 w-80 glass-card p-4 flex flex-col gap-4 z-50 rounded-2xl border border-border"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-text-bright">Background Music</span>
                    <button 
                      onClick={() => toggleBgm()}
                      className={`px-3 py-1 text-xs rounded-full transition-colors ${isBgmOn ? 'bg-primary text-background' : 'bg-surface text-text-muted'}`}
                    >
                      {isBgmOn ? 'ON' : 'OFF'}
                    </button>
                  </div>
                  
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-text-muted">Volume</label>
                    <input 
                      type="range" 
                      min="0" 
                      max="1" 
                      step="0.05"
                      value={bgmVolume}
                      onChange={(e) => setBgmVolume(parseFloat(e.target.value))}
                      className="w-full accent-primary"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-text-muted">Cari Musik</label>
                    <form onSubmit={handleSearchMusic} className="flex gap-2">
                      <input 
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Judul / Artis..."
                        className="bg-surface text-text text-sm p-2 rounded-lg border border-border outline-none focus:border-primary flex-1 min-w-0"
                      />
                      <button 
                        type="submit" 
                        disabled={isSearching}
                        className="bg-primary text-background p-2 rounded-lg flex items-center justify-center disabled:opacity-50"
                      >
                        {isSearching ? <Loader className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                      </button>
                    </form>
                  </div>

                  {searchResults.length > 0 && (
                    <div className="flex flex-col gap-2 max-h-[250px] overflow-y-auto pr-1 custom-scrollbar">
                      {searchResults.map((track) => (
                        <div 
                          key={track.videoId} 
                          onClick={() => {
                            setCurrentVideoId(track.videoId);
                            setCurrentMusicThumbnail(track.thumbnail);
                            if (!isBgmOn) toggleBgm();
                          }}
                          className="flex items-center gap-2 p-2 rounded-lg hover:bg-surface cursor-pointer group transition-colors"
                        >
                          <div className="relative w-10 h-10 rounded-md overflow-hidden flex-shrink-0">
                            <img src={track.thumbnail} alt={track.title} className="w-full h-full object-cover" />
                            <div className={`absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity ${(currentVideoId === track.videoId && isBgmOn) ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                              {(currentVideoId === track.videoId && isBgmOn) ? (
                                <Pause className="w-4 h-4 text-white" fill="white" />
                              ) : (
                                <Play className="w-4 h-4 text-white" fill="white" />
                              )}
                            </div>
                          </div>
                          <div className="flex flex-col overflow-hidden">
                            <span className="text-xs font-bold text-text-bright truncate">{track.title}</span>
                            <span className="text-[10px] text-text-muted truncate">{track.artists} • {track.duration}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Emoji Popover */}
            <AnimatePresence>
              {isEmojiOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute top-12 right-0 md:right-12 glass-card p-2 flex flex-wrap justify-center w-[160px] md:w-auto md:flex-nowrap gap-2 z-50 rounded-2xl border border-border"
                >
                  {['👍', '😂', '😡', '👏', '😭', '🤯'].map(emoji => (
                    <button 
                      key={emoji}
                      onClick={() => sendReaction(emoji)}
                      className="text-2xl hover:scale-125 transition-transform"
                    >
                      {emoji}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            <button
              onClick={toggleMic}
              className={`glass-card p-2 md:px-3 md:py-2 text-sm flex items-center gap-2 transition-colors ${isMicOn ? 'text-primary' : 'text-text-muted hover:text-text'}`}
              title={isMicOn ? 'Matikan Mic' : 'Nyalakan Mic'}
            >
              {isMicOn ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
              <span className="hidden md:inline">Mic</span>
            </button>
            <button
              onClick={() => setIsPlayersOpen(!isPlayersOpen)}
              className="glass-card p-2 md:hidden text-text-muted hover:text-text text-sm transition-colors"
            >
              <Users className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsChatOpen(!isChatOpen)}
              className="glass-card p-2 md:px-3 md:py-2 text-text-muted hover:text-text text-sm flex items-center gap-2 transition-colors relative"
            >
              <MessageSquare className="w-4 h-4" /> <span className="hidden md:inline">Chat</span>
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Global Mobile Emoji Reactions */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 pointer-events-none z-50 md:hidden flex flex-col items-center gap-2">
          <AnimatePresence>
            {activeReactions.map(r => {
              const p = players.find(player => player.id === r.playerId);
              return (
                <motion.div
                  key={r.id}
                  initial={{ opacity: 0, y: 50, scale: 0.5 }}
                  animate={{ opacity: 1, y: 0, scale: 1.5 }}
                  exit={{ opacity: 0, y: -50, scale: 0.8 }}
                  transition={{ duration: 0.8 }}
                  className="text-4xl drop-shadow-2xl flex flex-col items-center"
                >
                  <span>{r.emoji}</span>
                  {p && <span className="text-[10px] text-white bg-black/50 px-2 py-0.5 rounded-full mt-2 font-bold whitespace-nowrap">{p.name}</span>}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {/* Players Info — Top left (Desktop & Mobile Modal) */}
        <div className={`absolute top-16 left-4 space-y-1.5 z-40 ${isPlayersOpen ? 'block' : 'hidden'} md:block`}>
          {players.map((p) => (
            <div
              key={p.id}
              className={`glass-card px-2.5 py-1.5 flex items-center gap-2 text-sm ${
                room?.currentTurn === p.id && !isDealingIntro ? 'border-primary glow-primary' : ''
              }`}
            >
              <div className={`w-1.5 h-1.5 rounded-full ${p.isConnected ? 'bg-success' : 'bg-danger'}`} />
              <span className={`font-medium flex items-center gap-1 ${p.id === user?.uid ? 'text-primary' : 'text-text'}`}>
                {p.name} 
                {p.isShielded && <span title="Dilindungi (Shield)">🛡️</span>}
                {p.isSpectator && <span className="text-text-muted text-[10px] uppercase font-normal ml-1">Spectator</span>}
                {p.id === room?.hostId && <Crown className="w-3 h-3 text-secondary" />}
              </span>
              {isPlaying && (
                <span className="text-text-muted text-xs ml-2">
                  {isDealingIntro ? Math.min(p.hand?.length || 0, dealtCardsCount) : p.hand?.length || 0} krt
                </span>
              )}
              {room?.hostId === user?.uid && p.id !== user?.uid && (
                <button 
                  onClick={() => handleKickPlayer(p.id)}
                  className="ml-auto pl-2 text-text-muted hover:text-danger transition-colors"
                  title="Keluarkan pemain"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
              
              {/* Floating Emoji Reactions */}
              <AnimatePresence>
                {activeReactions.filter(r => r.playerId === p.id).map(r => (
                  <motion.div
                    key={`reaction-${r.id}`}
                    initial={{ opacity: 0, y: 10, scale: 0.5 }}
                    animate={{ opacity: 1, y: -30, scale: 1.5 }}
                    exit={{ opacity: 0, y: -50, scale: 0.8 }}
                    transition={{ duration: 0.8 }}
                    className="absolute right-0 top-0 text-3xl pointer-events-none drop-shadow-xl z-50"
                  >
                    {r.emoji}
                  </motion.div>
                ))}
              </AnimatePresence>

              {/* Chat Bubble */}
              <AnimatePresence>
                {activeChatBubbles.filter(b => b.playerId === p.id).map(b => (
                  <motion.div
                    key={`chat-${b.id}`}
                    initial={{ opacity: 0, scale: 0.5, x: 20 }}
                    animate={{ opacity: 1, scale: 1, x: 10 }}
                    exit={{ opacity: 0, scale: 0.5, y: -10 }}
                    transition={{ type: "spring", stiffness: 200, damping: 20 }}
                    className="absolute left-full top-0 ml-2 bg-surface border border-border px-3 py-1.5 rounded-2xl rounded-tl-sm shadow-xl z-50 min-w-max max-w-[200px]"
                  >
                    <p className="text-sm text-text-bright break-words line-clamp-2">{b.message}</p>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          ))}
        </div>

        {/* Turn Indicator + Timer */}
        {isPlaying && !isDealingIntro && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 w-max max-w-[90vw]">
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`glass-card px-4 py-2 flex flex-row items-center justify-center gap-4 md:gap-6 ${
                myTurn ? 'border-primary animate-pulse-glow' : ''
              }`}
            >
              <div className="text-text-bright font-heading font-bold text-xs md:text-sm flex items-center gap-1.5 truncate">
                {myTurn ? (
                  <><Target className="w-3.5 h-3.5 shrink-0" /> Giliranmu!</>
                ) : (
                  <><Timer className="w-3.5 h-3.5 shrink-0" /> <span className="truncate">Giliran {players.find(p => p.id === room?.currentTurn)?.name || '...'}</span></>
                )}
              </div>
              <div className={`font-mono text-sm md:text-base font-bold border-l border-border/50 pl-3 md:pl-6 ${
                turnTimer <= 5 ? 'text-danger' : turnTimer <= 10 ? 'text-warning' : 'text-primary'
              }`}>
                {turnTimer}s
              </div>
            </motion.div>
          </div>
        )}

        {/* 2D Player Hand UI */}
        <PlayerHandUI 
          onDiscard={handleDiscard} 
          onDeclareWin={() => handleDiscard()} // Use current selected card
          onUseSpell={handleUseSpell}
        />

        {/* Player Hand Score & Audio */}
        {isPlaying && localHand.length > 0 && !isDealingIntro && (
          <div className="absolute bottom-32 md:bottom-8 left-4 md:left-8 z-40">
            <div className="flex items-center gap-2 md:gap-4">
              <button 
                onClick={toggleMute}
                className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-surface-dark/50 flex items-center justify-center border border-border hover:bg-surface transition-colors"
                title={isMuted ? 'Unmute Suara' : 'Mute Suara'}
              >
                {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
              </button>
              <div className="glass-card px-3 md:px-4 py-1.5 md:py-2 flex items-center gap-2 md:gap-4 scale-90 md:scale-100 whitespace-nowrap">
                <div className="text-text-muted text-xs">Skor:</div>
                <div className="text-secondary font-heading font-bold text-base md:text-lg">
                  {calculateHandScore(localHand.slice(0, dealtCardsCount)).score}
                </div>
                <div className="text-text-muted text-xs ml-2 md:ml-0">
                  Best: {calculateHandScore(localHand.slice(0, dealtCardsCount)).bestSuit}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        {isPlaying && myTurn && !isDealingIntro && (
          <div className="absolute bottom-32 md:bottom-32 right-4 md:right-8 flex flex-col gap-2 scale-90 md:scale-100 origin-bottom-right z-10">
            {localHand.length <= 4 && (
              <>
                <button
                  onClick={handleDrawDeck}
                  disabled={isProcessing}
                  className="btn-primary px-3 md:px-4 py-2.5 md:py-3 text-xs md:text-sm rounded-xl flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
                >
                  <Library className="w-5 h-5" /> Ambil Deck
                </button>
                {(room?.discardPile?.length ?? 0) > 0 && (
                  <button
                    onClick={handleDrawDiscard}
                    disabled={isProcessing}
                    className="btn-secondary px-3 md:px-4 py-2.5 md:py-3 text-xs md:text-sm rounded-xl flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
                  >
                    <Recycle className="w-5 h-5" /> Ambil Buangan
                  </button>
                )}
              </>
            )}
            {localHand.length > 4 && selectedCardId && (
              <button
                onClick={() => handleDiscard()}
                disabled={isProcessing}
                className="btn-gold px-3 md:px-4 py-2.5 md:py-3 text-xs md:text-sm rounded-xl flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
              >
                <Trash2 className="w-5 h-5" /> Buang Kartu
              </button>
            )}
          </div>
        )}

        {/* Waiting Room Overlay */}
        {room?.status === 'waiting' && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="glass-card p-8 max-w-md w-full mx-4 text-center"
            >
              <h2 className="font-heading text-2xl font-bold text-text-bright mb-2">
                Menunggu Pemain
              </h2>
              <p className="text-text-muted mb-6">
                {players.filter(p => !p.isSpectator).length} / {room?.maxPlayers || 4} pemain
              </p>

              <div className="space-y-3 mb-6">
                {players.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center gap-3 p-3 rounded-lg bg-surface-dark"
                  >
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm">
                      {p.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-text font-medium">{p.name} {p.isShielded && <span title="Dilindungi (Shield)">🛡️</span>} {p.isSpectator && <span className="text-text-muted text-xs font-normal">(Penonton)</span>}</span>
                    {p.id === room?.hostId && (
                      <span className="ml-auto text-secondary text-xs flex items-center gap-1">Host <Crown className="w-3 h-3" /></span>
                    )}
                  </div>
                ))}
              </div>

              {/* Room ID for sharing */}
              <div className="p-3 rounded-lg bg-surface-dark mb-6">
                <div className="text-text-muted text-xs mb-1">Share Room ID:</div>
                <div className="text-primary font-mono text-sm font-bold select-all">
                  {roomId}
                </div>
              </div>

              {isHost && players.filter(p => !p.isSpectator).length >= 2 && (
                <button
                  onClick={handlePrepareGame}
                  className="w-full btn-gold py-4 rounded-xl text-lg font-bold"
                >
                  <span className="flex items-center justify-center gap-2"><Rocket className="w-6 h-6" /> Mulai Permainan!</span>
                </button>
              )}
              {isHost && players.filter(p => !p.isSpectator).length < 2 && (
                <p className="text-text-muted text-sm">
                  Butuh minimal 2 pemain aktif untuk memulai
                </p>
              )}
              {!isHost && (
                <p className="text-text-muted text-sm">
                  Menunggu host untuk memulai permainan...
                </p>
              )}
            </motion.div>
          </div>
        )}

        {/* Spell Selection Phase Overlay */}
        {room?.status === 'selecting_spell' && (
          <div className="absolute inset-0 z-[60] flex items-center justify-center bg-background/80 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="glass-card p-8 max-w-2xl w-full mx-4 text-center"
            >
              <h2 className="font-heading text-3xl font-black text-secondary mb-2">Pilih Spell Anda</h2>
              <p className="text-text-muted mb-8">Pilih 1 kemampuan spesial yang akan membantu Anda memenangkan permainan.</p>
              
              {players.find(p => p.id === user?.uid)?.isReady ? (
                <div className="py-12">
                  <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                  <p className="text-text-bright text-lg">Menunggu pemain lain memilih spell...</p>
                  <p className="text-text-muted mt-2">
                    {players.filter(p => !p.isSpectator && p.isReady).length} / {players.filter(p => !p.isSpectator).length} siap
                  </p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
                    {[
                      { id: 'card_flip', name: 'Putar Balik', icon: 'Card Flip (Putar Balik).svg', desc: 'Ubah arah giliran' },
                      { id: 'grave_digger', name: 'Penggali Kubur', icon: 'Grave Digger (Penggali Kubur).svg', desc: 'Ambil dari tumpukan buangan' },
                      { id: 'mulligan', name: 'Tukar Baru', icon: 'Mulligan  Refresh (Tukar Baru).svg', desc: 'Tukar 4 kartu baru' },
                      { id: 'shield', name: 'Pelindung', icon: 'Shield (Pelindung).svg', desc: 'Kebal dari serangan' },
                      { id: 'windstorm', name: 'Badai', icon: 'Windstorm (Badai).svg', desc: 'Beri lawan 1 kartu' },
                    ].map(spell => (
                      <button
                        key={spell.id}
                        onClick={() => setSelectedSpell(spell.id as SpellType)}
                        className={`p-4 rounded-xl flex flex-col items-center justify-center transition-all ${
                          selectedSpell === spell.id 
                            ? 'bg-primary/20 border-2 border-primary shadow-[0_0_15px_rgba(245,158,11,0.5)] scale-105' 
                            : 'bg-surface-dark border-2 border-transparent hover:border-surface-light hover:bg-surface'
                        }`}
                      >
                        <img src={encodeURI(`/spel/${spell.icon}`)} alt={spell.name} className="w-16 h-16 object-contain drop-shadow-md mb-3" />
                        <span className="font-bold text-sm text-text-bright mb-1">{spell.name}</span>
                        <span className="text-[10px] text-text-muted leading-tight">{spell.desc}</span>
                      </button>
                    ))}
                  </div>
                  
                  <button
                    onClick={handleSelectSpell}
                    disabled={!selectedSpell || isProcessing}
                    className="w-full btn-primary py-4 rounded-xl text-lg font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Konfirmasi Spell
                  </button>
                </>
              )}
            </motion.div>
          </div>
        )}

        {/* Grave Digger Modal */}
        <AnimatePresence>
          {isGraveDiggerActive && room?.discardPile && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-[70] flex items-center justify-center bg-background/80 backdrop-blur-md"
            >
              <motion.div
                initial={{ scale: 0.8, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                className="glass-card p-6 max-w-lg w-full text-center"
              >
                <h3 className="text-xl font-bold text-secondary mb-4">Penggali Kubur</h3>
                <p className="text-sm text-text-muted mb-6">Pilih 1 kartu dari tumpukan buangan untuk diambil.</p>
                
                <div className="flex justify-center gap-4 mb-6">
                  {room.discardPile.slice(-3).reverse().map((cardId) => {
                    const [suit, rank] = cardId.split('-');
                    return (
                      <button
                        key={cardId}
                        onClick={() => handleGraveDiggerSelect(cardId)}
                        className="relative w-24 h-36 hover:scale-110 transition-transform"
                      >
                        <img 
                          src={encodeURI(`/kartu/Suit=${suit.charAt(0).toUpperCase() + suit.slice(1)}, Number=${rank}.svg`)} 
                          alt={cardId} 
                          className="w-full h-full object-contain drop-shadow-md rounded-md"
                        />
                      </button>
                    );
                  })}
                </div>
                
                <button
                  onClick={() => setIsGraveDiggerActive(false)}
                  className="btn-secondary py-2 px-6 rounded-xl text-sm"
                >
                  Batal
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Windstorm Targeting Modal */}
        <AnimatePresence>
          {isWindstormTargeting && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-[70] flex items-center justify-center bg-background/80 backdrop-blur-md"
            >
              <motion.div
                initial={{ scale: 0.8, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                className="glass-card p-6 max-w-sm w-full text-center mx-4"
              >
                <h3 className="text-xl font-bold text-secondary mb-2">Pilih Target Badai</h3>
                <p className="text-sm text-text-muted mb-6">Pilih pemain lawan untuk dilemparkan 1 kartu acak dari tangan Anda.</p>
                
                <div className="flex flex-col gap-3 mb-6 max-h-[40vh] overflow-y-auto pr-2">
                  {players.filter(p => !p.isSpectator && p.id !== user?.uid).map(target => (
                    <button
                      key={target.id}
                      onClick={() => handleWindstormTargetSelect(target.id)}
                      disabled={target.isShielded}
                      className="glass-card p-3 flex items-center justify-between hover:bg-surface-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed group text-left"
                    >
                      <div>
                        <span className="font-bold text-text-bright">{target.name}</span>
                        {target.isShielded && <span className="block text-xs text-text-muted">Sedang Dilindungi 🛡️</span>}
                      </div>
                      <span className="text-xl group-hover:scale-125 transition-transform">🎯</span>
                    </button>
                  ))}
                </div>
                
                <button
                  onClick={() => setIsWindstormTargeting(false)}
                  className="btn-secondary py-2 px-6 rounded-xl text-sm"
                >
                  Batal
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Game Over Overlay */}
        <AnimatePresence>
          {isFinished && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-50 flex items-center justify-center bg-background/70 backdrop-blur-md"
            >
              <motion.div
                initial={{ scale: 0.8, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                transition={{ type: 'spring', damping: 20 }}
                className="glass-card p-8 max-w-md w-full mx-4 text-center max-h-[65vh] overflow-y-auto mb-20"
              >
                <div className="flex justify-center mb-4">
                  {room?.winnerId === 'DRAW' ? <Library className="w-16 h-16 text-primary" /> : <Trophy className="w-16 h-16 text-secondary" />}
                </div>
                <h2 className="font-heading text-3xl font-black text-gradient-gold mb-2">
                  {room?.winnerId === 'DRAW' 
                    ? 'Kartu Habis!' 
                    : (winnerPlayer?.id === user?.uid ? 'Kamu Menang!' : `${winnerPlayer?.name || '?'} Menang!`)}
                </h2>
                <p className="text-text-muted mb-4">
                  {room?.winnerId === 'DRAW' ? 'Permainan berakhir karena kartu di deck telah habis.' : 'Mendapatkan 41 poin!'}
                </p>

                {/* Leaderboard */}
                <div className="bg-surface-dark/50 rounded-xl p-4 mb-6 text-left space-y-2">
                  <div className="text-sm font-bold text-text-muted mb-2 uppercase tracking-wider">Leaderboard</div>
                  {leaderboard.map((item, index) => (
                    <div key={item.player.id} className="flex items-center justify-between p-2 bg-background/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-secondary">#{index + 1}</span>
                        <span className="text-text font-medium">{item.player.name} {item.player.id === user?.uid ? '(Kamu)' : ''}</span>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-primary">{item.scoreInfo.score} pts</div>
                        <div className="text-[10px] text-text-muted">Best: {item.scoreInfo.bestSuit}</div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => router.push('/lobby')}
                    className="flex-1 btn-secondary !py-2 !px-3 text-sm rounded-xl"
                  >
                    Kembali ke Lobby
                  </button>
                  {isHost && (
                    <button
                      onClick={handleStartGame}
                      className="flex-1 btn-gold !py-2 !px-3 text-sm rounded-xl"
                    >
                      Main Lagi
                    </button>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Chat Sidebar */}
        <AnimatePresence>
          {isChatOpen && (
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="absolute top-0 right-0 bottom-0 w-full sm:w-80 z-[70] glass-card border-l border-border flex flex-col bg-background/80 backdrop-blur-xl"
            >
              <div className="flex items-center justify-between p-4 border-b border-border">
                <h3 className="font-heading font-bold text-text-bright">Chat</h3>
                <button
                  onClick={() => setIsChatOpen(false)}
                  className="text-text-muted hover:text-text"
                >
                  ✕
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {chatMessages.map((msg) => (
                  <div key={msg.id} className={`${msg.playerId === user?.uid ? 'text-right' : ''}`}>
                    <div className="text-xs text-text-muted mb-1">{msg.playerName}</div>
                    <div
                      className={`inline-block px-3 py-2 rounded-xl text-sm ${
                        msg.playerId === user?.uid
                          ? 'bg-primary text-white'
                          : 'bg-surface-dark text-text'
                      }`}
                    >
                      {msg.message}
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-4 border-t border-border flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendChat()}
                  placeholder="Ketik pesan..."
                  className="flex-1 px-3 py-2 rounded-lg bg-surface-dark border border-border text-text text-sm placeholder-text-muted focus:outline-none focus:border-primary"
                />
                <button
                  onClick={handleSendChat}
                  className="btn-primary px-3 py-2 rounded-lg text-sm"
                >
                  →
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

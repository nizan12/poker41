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
} from '@/types';
import { PlayerHandUI } from '@/features/game/components/PlayerHandUI';
import { VoiceChatManager } from '@/features/voice/components/VoiceChatManager';
import { Crown, Target, Timer, VolumeX, Volume2, Gamepad2, Recycle, Trash2, Rocket, Trophy, MessageSquare, Library, Users, X, Mic, MicOff } from 'lucide-react';
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
    isDealingIntro, setIsDealingIntro, dealtCardsCount, setDealtCardsCount
  } = useGameStore();
  const { isMuted, toggleMute, isMicOn, toggleMic } = useUIStore();

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isPlayersOpen, setIsPlayersOpen] = useState(false);
  const [turnTimer, setTurnTimer] = useState(30);
  const [isProcessing, setIsProcessing] = useState(false);

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

  // Update local hand from players data
  useEffect(() => {
    if (!user || !players.length) return;
    const me = players.find(p => p.id === user.uid);
    if (me?.hand) {
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
      setCanDraw(myTurn && hand.length === 4);
      setCanDiscard(myTurn && hand.length === 5);
      setCanDeclareWin(myTurn && isWinningHand(hand));
    }
  }, [players, user, room, setLocalHand, setCanDraw, setCanDiscard, setCanDeclareWin]);

  // Turn timer
  useEffect(() => {
    if (phase !== 'playing' || !room?.turnStartedAt) return;

    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - room.turnStartedAt) / 1000);
      const remaining = Math.max(0, (room.turnTimeLimit || 30) - elapsed);
      setTurnTimer(remaining);
    }, 1000);

    return () => clearInterval(interval);
  }, [phase, room?.turnStartedAt, room?.turnTimeLimit]);

  // Handle Animations from lastAction
  const startAnimation = useGameStore(s => s.startAnimation);
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
          for (let pIdx = 0; pIdx < players.length; pIdx++) {
            const p = players[pIdx];
            const isMe = p.id === user?.uid;
            
            let playerPos: [number, number, number] = [0, -1, 5];
            let playerRot: [number, number, number] = [0, 0, 0];
            
            if (!isMe) {
              const otherPlayers = players.filter(op => op.id !== user?.uid);
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
      const otherPlayers = players.filter(p => p.id !== user?.uid);
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

  // Game actions
  const handleStartGame = async () => {
    if (!room || !user || room.hostId !== user.uid) return;
    if (players.length < 2) return;

    // Shuffle deck and deal
    const deck = shuffleDeck(createDeck());
    const hands: Record<string, string[]> = {};
    let deckIndex = 0;

    for (const player of players) {
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
      currentTurn: players[0].id,
      turnStartedAt: Date.now(),
    });

    // Deal hands to each player
    for (const player of players) {
      await updatePlayer(roomId, player.id, {
        hand: hands[player.id],
        isReady: true,
      });
    }
  };

  const handleDrawDeck = async () => {
    if (!user || !room || room.currentTurn !== user.uid || localHand.length !== 4 || isProcessing) return;
    setIsProcessing(true);
    
    try {
      const deckCards = [...(room.deckCards || [])];
      if (deckCards.length === 0) return;

      const drawnCard = deckCards.pop()!;
      const myPlayer = players.find(p => p.id === user.uid);
      if (!myPlayer) return;

      audioManager.play('draw');
      await updateRoom(roomId, { 
        deckCards,
        lastAction: { type: 'draw_deck', playerId: user.uid, cardId: 'hidden', timestamp: Date.now() }
      });
      await updatePlayer(roomId, user.uid, {
        hand: [...myPlayer.hand, drawnCard],
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDrawDiscard = async () => {
    if (!user || !room || room.currentTurn !== user.uid || localHand.length !== 4 || isProcessing) return;
    setIsProcessing(true);

    try {
      const discardPile = [...(room.discardPile || [])];
      if (discardPile.length === 0) return;

      const drawnCard = discardPile.pop()!;
      const myPlayer = players.find(p => p.id === user.uid);
      if (!myPlayer) return;

      audioManager.play('draw');
      await updateRoom(roomId, { 
        discardPile,
        lastAction: { type: 'draw_discard', playerId: user.uid, cardId: drawnCard, timestamp: Date.now() }
      });
      await updatePlayer(roomId, user.uid, {
        hand: [...myPlayer.hand, drawnCard],
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDiscard = async () => {
    if (!user || !room || room.currentTurn !== user.uid || !selectedCardId || localHand.length !== 5 || isProcessing) return;
    setIsProcessing(true);

    try {
      const myPlayer = players.find(p => p.id === user.uid);
      if (!myPlayer) return;

      audioManager.play('discard');
      const newHand = myPlayer.hand.filter((id: string) => id !== selectedCardId);
      const newDiscard = [...(room.discardPile || []), selectedCardId];

      const newHandCards = newHand.map(id => {
        const [suit, rank] = id.split('-');
        return { id, suit: suit as any, rank: rank as any, value: (RANK_VALUES as any)[rank] };
      });

      if (isWinningHand(newHandCards)) {
        // Automatic win!
        await updateRoom(roomId, {
          discardPile: newDiscard,
          status: 'finished',
          winnerId: user.uid,
        });
        await updatePlayer(roomId, user.uid, { hand: newHand });
        selectCard(null);
        return;
      }

      // Check if deck is empty (Draw)
      if (room.deckCards && room.deckCards.length === 0) {
        await updateRoom(roomId, {
          discardPile: newDiscard,
          status: 'finished',
          winnerId: 'DRAW',
        });
        await updatePlayer(roomId, user.uid, { hand: newHand });
        selectCard(null);
        return;
      }

      // Move to next player
      const currentIdx = players.findIndex(p => p.id === user.uid);
      const nextIdx = (currentIdx + 1) % players.length;

      await updateRoom(roomId, {
        discardPile: newDiscard,
        currentTurn: players[nextIdx].id,
        turnStartedAt: Date.now(),
        lastAction: { type: 'discard', playerId: user.uid, cardId: selectedCardId, timestamp: Date.now() }
      });
      await updatePlayer(roomId, user.uid, { hand: newHand });
      selectCard(null);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeclareWin = async () => {
    if (!user || !room || room.currentTurn !== user.uid) return;
    if (!isWinningHand(localHand)) return;

    await updateRoom(roomId, {
      status: 'finished',
      winnerId: user.uid,
    });
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

  return (
    <div className="w-full h-screen relative overflow-hidden bg-background">
      {/* Voice Chat System */}
      <VoiceChatManager />

      {/* 3D Game Scene */}
      <GameScene />

      {/* HUD Overlay */}
      <div className="hud-overlay">
        {/* Top Bar */}
        <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 py-3">
          <button
            onClick={() => router.push('/lobby')}
            className="glass-card px-3 py-2 text-text-muted hover:text-text text-sm flex items-center gap-2 transition-colors"
          >
            ← Keluar
          </button>

          <div className="glass-card px-4 py-2 text-center">
            <div className="text-text-bright font-heading font-bold text-sm">
              {room?.name || 'Loading...'}
            </div>
            <div className="text-text-muted text-xs">
              Room: {roomId?.slice(0, 8)}...
            </div>
          </div>

          <div className="flex items-center gap-2">
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
              className="glass-card px-3 py-2 text-text-muted hover:text-text text-sm flex items-center gap-2 transition-colors"
            >
              <MessageSquare className="w-4 h-4" /> Chat
            </button>
          </div>
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
                {p.name} {p.id === room?.hostId && <Crown className="w-3 h-3 text-secondary" />}
              </span>
              {isPlaying && (
                <span className="text-text-muted text-xs ml-2">
                  {isDealingIntro ? Math.min(p.hand?.length || 0, dealtCardsCount) : p.hand?.length || 0} krt
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Turn Indicator + Timer */}
        {isPlaying && !isDealingIntro && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 w-full max-w-[280px] md:max-w-max px-4 md:px-0">
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`glass-card px-4 py-2 flex flex-row items-center justify-between md:justify-center md:gap-6 ${
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
        <PlayerHandUI />

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
            {localHand.length === 4 && (
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
            {localHand.length === 5 && selectedCardId && (
              <button
                onClick={handleDiscard}
                disabled={isProcessing}
                className="btn-gold px-3 md:px-4 py-2.5 md:py-3 text-xs md:text-sm rounded-xl flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
              >
                <Trash2 className="w-5 h-5" /> Buang Kartu
              </button>
            )}
          </div>
        )}

        {/* Waiting Room Overlay */}
        {isWaiting && (
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
                {players.length} / {room?.maxPlayers || 4} pemain
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
                    <span className="text-text font-medium">{p.name}</span>
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

              {isHost && players.length >= 2 && (
                <button
                  onClick={handleStartGame}
                  className="w-full btn-gold py-4 rounded-xl text-lg font-bold"
                >
                  <span className="flex items-center justify-center gap-2"><Rocket className="w-6 h-6" /> Mulai Permainan!</span>
                </button>
              )}
              {isHost && players.length < 2 && (
                <p className="text-text-muted text-sm">
                  Butuh minimal 2 pemain untuk memulai
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

        {/* Game Over Overlay */}
        <AnimatePresence>
          {isFinished && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center bg-background/70 backdrop-blur-md"
            >
              <motion.div
                initial={{ scale: 0.8, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                transition={{ type: 'spring', damping: 20 }}
                className="glass-card p-8 max-w-md w-full mx-4 text-center max-h-[90vh] overflow-y-auto"
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
                    className="flex-1 btn-secondary py-3 rounded-xl"
                  >
                    Kembali ke Lobby
                  </button>
                  {isHost && (
                    <button
                      onClick={handleStartGame}
                      className="flex-1 btn-gold py-3 rounded-xl"
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
              className="absolute top-0 right-0 bottom-0 w-full sm:w-80 z-50 glass-card border-l border-border flex flex-col bg-background/80 backdrop-blur-xl"
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

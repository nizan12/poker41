'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '@/features/auth/stores/authStore';
import {
  createRoom,
  getRoom,
  addPlayer,
  getPlayer,
  getAvailableRooms,
  getLeaderboard,
} from '@/lib/firebase/firestore';
import { generateRoomCode } from '@/lib/utils';
import Link from 'next/link';
import { Home, LogIn, Sparkles, Target, Trophy, X } from 'lucide-react';

interface RoomData {
  id: string;
  name: string;
  status: string;
  maxPlayers: number;
  hostId: string;
  playerCount?: number;
}

export default function LobbyPage() {
  const router = useRouter();
  const { user, signIn, signInWithGoogle, signOutUser } = useAuthStore();

  const [tab, setTab] = useState<'create' | 'join'>('create');
  const [roomName, setRoomName] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [maxPlayers, setMaxPlayers] = useState(4);
  const [roomCode, setRoomCode] = useState('');
  const [rooms, setRooms] = useState<RoomData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);

  // Auto-fill player name if logged in with Google
  useEffect(() => {
    if (user && !user.isAnonymous && user.displayName && !playerName) {
      setPlayerName(user.displayName);
    }
  }, [user]);

  // Load available rooms
  useEffect(() => {
    async function loadRooms() {
      try {
        const data = await getAvailableRooms();
        setRooms(data as RoomData[]);
      } catch {
        // ignore
      }
    }
    loadRooms();
    const interval = setInterval(loadRooms, 5000); // Refresh every 5s
    return () => clearInterval(interval);
  }, []);

  const handleCreateRoom = async () => {
    if (!playerName.trim()) {
      setError('Masukkan nama pemain');
      return;
    }

    // Attempt auth if not signed in
    if (!user) {
      setError('Menghubungkan ke server... Pastikan Anonymous Auth sudah diaktifkan di Firebase Console.');
      await signIn();
      const currentUser = useAuthStore.getState().user;
      if (!currentUser) {
        setError('Gagal autentikasi. Aktifkan Anonymous Auth di Firebase Console → Authentication → Sign-in method → Anonymous → Enable');
        return;
      }
    }

    setLoading(true);
    setError('');

    const currentUser = user || useAuthStore.getState().user;
    if (!currentUser) return;

    try {
      const code = generateRoomCode();
      const roomId = await createRoom({
        name: roomName.trim() || `Room ${code}`,
        status: 'waiting',
        hostId: currentUser.uid,
        maxPlayers,
        currentTurn: '',
        turnStartedAt: 0,
        turnTimeLimit: 30,
        deckCards: [],
        discardPile: [],
        winnerId: null,
        roundNumber: 1,
        code,
      });

      // Add host as first player
      await addPlayer(roomId, currentUser.uid, {
        name: playerName.trim(),
        hand: [],
        score: 0,
        isReady: false,
        isConnected: true,
        seatIndex: 0,
      });

      router.push(`/room/${roomId}`);
    } catch (err) {
      setError('Gagal membuat room. Coba lagi.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinRoom = async (targetRoomId?: string) => {
    if (!playerName.trim()) {
      setError('Masukkan nama pemain');
      return;
    }

    if (!user) {
      setError('Menghubungkan ke server...');
      await signIn();
      const currentUser = useAuthStore.getState().user;
      if (!currentUser) {
        setError('Gagal autentikasi. Aktifkan Anonymous Auth di Firebase Console.');
        return;
      }
    }

    const joinId = targetRoomId || roomCode.trim();
    if (!joinId) {
      setError('Masukkan Room ID');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const room = await getRoom(joinId);
      if (!room) {
        setError('Room tidak ditemukan');
        return;
      }

      const currentUser = user || useAuthStore.getState().user;
      if (!currentUser) return;

      const existingPlayer = await getPlayer(joinId, currentUser.uid);

      if (!existingPlayer) {
        // Fetch current players to check room capacity
        // Note: we can't easily get the count without fetching the collection,
        // but we can assume if status != 'waiting', they are a spectator.
        // Or we can just let them join and mark as spectator based on status.
        const isSpectator = (room as any).status !== 'waiting';

        await addPlayer(joinId, currentUser.uid, {
          name: playerName.trim(),
          hand: [],
          score: 0,
          isReady: false,
          isConnected: true,
          seatIndex: -1, // Will be assigned by the room
          isSpectator: isSpectator,
        });
      }

      router.push(`/room/${joinId}`);
    } catch (err) {
      setError('Gagal bergabung. Room mungkin sudah penuh.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenLeaderboard = async () => {
    setIsLeaderboardOpen(true);
    setLoadingLeaderboard(true);
    try {
      const data = await getLeaderboard();
      setLeaderboard(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingLeaderboard(false);
    }
  };

  return (
    <main className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-border">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center font-heading font-bold text-white text-lg shadow-glow">
            41
          </div>
          <span className="font-heading font-bold text-xl text-text-bright">
            Remi 41
          </span>
        </Link>
        <div className="flex items-center gap-4">
          <button 
            onClick={handleOpenLeaderboard}
            className="flex items-center gap-2 text-gold hover:text-yellow-400 transition-colors font-medium text-sm"
          >
            <Trophy className="w-5 h-5" />
            <span className="hidden sm:inline">Leaderboard</span>
          </button>
          
          {user && !user.isAnonymous ? (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-surface px-3 py-1.5 rounded-full border border-border">
                {user.photoURL ? (
                  <img src={user.photoURL} alt="Profile" className="w-6 h-6 rounded-full" />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-xs text-white font-bold">
                    {user.displayName?.charAt(0) || 'U'}
                  </div>
                )}
                <span className="text-sm font-medium text-text-bright hidden sm:block">
                  {user.displayName?.split(' ')[0]}
                </span>
              </div>
              <button 
                onClick={() => signOutUser()}
                className="text-text-muted hover:text-danger text-sm transition-colors"
                title="Logout"
              >
                Logout
              </button>
            </div>
          ) : (
            <button 
              onClick={() => signInWithGoogle()}
              className="flex items-center gap-2 bg-white text-black px-4 py-2 rounded-lg font-medium text-sm hover:bg-gray-200 transition-colors shadow-glow"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              <span className="hidden sm:inline">Google Login</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-lg">
          {/* Player Name Input */}
          <div className="mb-6">
            <label className="block text-text-muted text-sm font-medium mb-2">
              Nama Pemain
            </label>
            <input
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="Masukkan namamu..."
              maxLength={20}
              className="w-full px-4 py-3 rounded-xl bg-surface border border-border text-text placeholder-text-muted focus:outline-none focus:border-primary transition-colors font-body"
            />
          </div>

          {/* Tab Selector */}
          <div className="flex gap-2 mb-6">
            {(['create', 'join'] as const).map((t) => (
              <button
                key={t}
                onClick={() => { setTab(t); setError(''); }}
                className={`flex-1 py-3 px-4 rounded-xl font-heading font-semibold text-sm transition-all duration-200 ${
                  tab === t
                    ? 'bg-primary text-white shadow-glow'
                    : 'bg-surface text-text-muted hover:bg-surface-light'
                }`}
              >
                {t === 'create' ? (
                  <span className="flex items-center justify-center gap-2">
                    <Home className="w-4 h-4" /> Buat Room
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <LogIn className="w-4 h-4" /> Gabung Room
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {tab === 'create' ? (
                <div className="glass-card p-6 space-y-4">
                  <div>
                    <label className="block text-text-muted text-sm font-medium mb-2">
                      Nama Room (opsional)
                    </label>
                    <input
                      type="text"
                      value={roomName}
                      onChange={(e) => setRoomName(e.target.value)}
                      placeholder="Room saya..."
                      maxLength={30}
                      className="w-full px-4 py-3 rounded-xl bg-surface-dark border border-border text-text placeholder-text-muted focus:outline-none focus:border-primary transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-text-muted text-sm font-medium mb-2">
                      Maksimal Pemain
                    </label>
                    <div className="flex gap-2">
                      {[2, 3, 4, 5, 6].map((n) => (
                        <button
                          key={n}
                          onClick={() => setMaxPlayers(n)}
                          className={`flex-1 py-3 rounded-lg font-bold text-sm transition-all ${
                            maxPlayers === n
                              ? 'bg-primary text-white'
                              : 'bg-surface-dark text-text-muted hover:bg-surface-light'
                          }`}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={handleCreateRoom}
                    disabled={loading || !playerName.trim()}
                    className="w-full btn-gold py-4 rounded-xl text-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        Membuat...
                      </span>
                    ) : (
                      <span className="flex items-center justify-center gap-2">
                        <Sparkles className="w-5 h-5" /> Buat Room Baru
                      </span>
                    )}
                  </button>
                </div>
              ) : (
                <div className="glass-card p-6 space-y-4">
                  <div>
                    <label className="block text-text-muted text-sm font-medium mb-2">
                      Room ID
                    </label>
                    <input
                      type="text"
                      value={roomCode}
                      onChange={(e) => setRoomCode(e.target.value)}
                      placeholder="Masukkan Room ID..."
                      className="w-full px-4 py-3 rounded-xl bg-surface-dark border border-border text-text placeholder-text-muted focus:outline-none focus:border-primary transition-colors font-mono"
                    />
                  </div>

                  <button
                    onClick={() => handleJoinRoom()}
                    disabled={loading || !playerName.trim() || !roomCode.trim()}
                    className="w-full btn-primary py-4 rounded-xl text-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        Bergabung...
                      </span>
                    ) : (
                      <span className="flex items-center justify-center gap-2">
                        <Target className="w-5 h-5" /> Gabung Room
                      </span>
                    )}
                  </button>

                  {/* Available rooms */}
                  {rooms.length > 0 && (
                    <div className="mt-6">
                      <h3 className="text-text-muted text-sm font-medium mb-3">
                        Room Tersedia
                      </h3>
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {rooms.map((room) => (
                          <button
                            key={room.id}
                            onClick={() => handleJoinRoom(room.id)}
                            disabled={loading}
                            className="w-full flex items-center justify-between p-3 rounded-lg bg-surface-dark hover:bg-surface-light border border-border hover:border-border-accent transition-all text-left"
                          >
                            <div>
                              <div className="text-text font-medium text-sm">
                                {room.name}
                              </div>
                              <div className="text-text-muted text-xs">
                                ID: {room.id.slice(0, 8)}...
                              </div>
                            </div>
                            <div className="text-primary text-sm font-mono">
                              {room.maxPlayers} max
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Error */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mt-4 p-3 rounded-lg bg-danger/10 border border-danger/30 text-danger text-sm text-center"
              >
                {error}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      
      {/* Leaderboard Modal */}
      <AnimatePresence>
        {isLeaderboardOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="glass-card w-full max-w-md max-h-[80vh] flex flex-col relative"
            >
              <button 
                onClick={() => setIsLeaderboardOpen(false)}
                className="absolute top-4 right-4 text-text-muted hover:text-text"
              >
                <X className="w-6 h-6" />
              </button>
              
              <div className="p-6 border-b border-border">
                <h2 className="text-2xl font-heading font-bold text-gradient-gold flex items-center gap-2">
                  <Trophy className="w-6 h-6" />
                  Top 10 Pemain
                </h2>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6 space-y-3">
                {loadingLeaderboard ? (
                  <div className="text-center text-text-muted py-8">Memuat data...</div>
                ) : leaderboard.length === 0 ? (
                  <div className="text-center text-text-muted py-8">Belum ada data peringkat.</div>
                ) : (
                  leaderboard.map((u, i) => (
                    <div key={u.id} className="flex items-center justify-between p-3 bg-surface-dark rounded-xl border border-border">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${i === 0 ? 'bg-yellow-500/20 text-yellow-500' : i === 1 ? 'bg-gray-300/20 text-gray-300' : i === 2 ? 'bg-orange-400/20 text-orange-400' : 'bg-surface-light text-text-muted'}`}>
                          #{i + 1}
                        </div>
                        <div>
                          <div className="font-medium text-text-bright">{u.name || 'Anonymous'}</div>
                          <div className="text-xs text-text-muted">{u.totalGames} kali main</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-gold font-bold">{u.wins || 0} Menang</div>
                        <div className="text-xs text-text-muted">Max: {u.highestScore || 0} pts</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}

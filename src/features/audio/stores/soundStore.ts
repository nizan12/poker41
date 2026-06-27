import { create } from 'zustand';
import type { SoundName } from '@/types';

interface SoundStore {
  // Settings
  masterVolume: number;
  sfxVolume: number;
  musicVolume: number;
  isMuted: boolean;

  // Actions
  setMasterVolume: (v: number) => void;
  setSfxVolume: (v: number) => void;
  setMusicVolume: (v: number) => void;
  toggleMute: () => void;
  setMuted: (muted: boolean) => void;
}

export const useSoundStore = create<SoundStore>((set) => ({
  masterVolume: 0.8,
  sfxVolume: 0.7,
  musicVolume: 0.4,
  isMuted: false,

  setMasterVolume: (v) => set({ masterVolume: v }),
  setSfxVolume: (v) => set({ sfxVolume: v }),
  setMusicVolume: (v) => set({ musicVolume: v }),
  toggleMute: () => set((s) => ({ isMuted: !s.isMuted })),
  setMuted: (muted) => set({ isMuted: muted }),
}));

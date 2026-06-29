import { create } from 'zustand';

interface UIState {
  // Modal states
  isChatOpen: boolean;
  isSettingsOpen: boolean;
  isGameOverOpen: boolean;
  isHelpOpen: boolean;

  // Loading
  isLoading: boolean;
  loadingMessage: string;

  // Audio
  isMuted: boolean;
  isMicOn: boolean;

  // Toast
  toasts: Array<{ id: string; message: string; type: 'info' | 'success' | 'error' | 'warning' }>;

  // Actions
  toggleChat: () => void;
  openSettings: () => void;
  closeSettings: () => void;
  showGameOver: () => void;
  hideGameOver: () => void;
  toggleHelp: () => void;
  setLoading: (loading: boolean, message?: string) => void;
  addToast: (message: string, type?: 'info' | 'success' | 'error' | 'warning') => void;
  removeToast: (id: string) => void;
  
  // Audio actions
  toggleMute: () => void;
  toggleMic: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  isChatOpen: false,
  isSettingsOpen: false,
  isGameOverOpen: false,
  isHelpOpen: false,
  isLoading: false,
  loadingMessage: '',
  toasts: [],
  isMuted: false,
  isMicOn: false,

  toggleChat: () => set((s) => ({ isChatOpen: !s.isChatOpen })),
  openSettings: () => set({ isSettingsOpen: true }),
  closeSettings: () => set({ isSettingsOpen: false }),
  showGameOver: () => set({ isGameOverOpen: true }),
  hideGameOver: () => set({ isGameOverOpen: false }),
  toggleHelp: () => set((s) => ({ isHelpOpen: !s.isHelpOpen })),
  setLoading: (loading, message = '') => set({ isLoading: loading, loadingMessage: message }),

  addToast: (message, type = 'info') => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    set((s) => ({ toasts: [...s.toasts, { id, message, type }] }));
    // Auto remove after 4 seconds
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter(t => t.id !== id) }));
    }, 4000);
  },

  removeToast: (id) => set((s) => ({ toasts: s.toasts.filter(t => t.id !== id) })),
  
  toggleMute: () => set((s) => {
    const newMuted = !s.isMuted;
    import('@/lib/audioManager').then(({ audioManager }) => audioManager.setMute(newMuted));
    return { isMuted: newMuted };
  }),
  
  toggleMic: () => set((s) => ({ isMicOn: !s.isMicOn })),
}));

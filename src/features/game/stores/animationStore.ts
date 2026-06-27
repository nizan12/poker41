import { create } from 'zustand';
import type { AnimationType, AnimationEvent } from '@/types';

interface AnimationStore {
  // Current animation state
  currentAnimation: AnimationType;
  animationQueue: AnimationEvent[];
  isAnimating: boolean;

  // Actions
  queueAnimation: (event: AnimationEvent) => void;
  startAnimation: (type: AnimationType) => void;
  completeAnimation: () => void;
  clearQueue: () => void;
}

export const useAnimationStore = create<AnimationStore>((set, get) => ({
  currentAnimation: 'idle',
  animationQueue: [],
  isAnimating: false,

  queueAnimation: (event) => {
    set((s) => ({ animationQueue: [...s.animationQueue, event] }));

    // If not currently animating, start the next one
    if (!get().isAnimating) {
      const nextEvent = get().animationQueue[0];
      if (nextEvent) {
        set({
          isAnimating: true,
          currentAnimation: nextEvent.type,
          animationQueue: get().animationQueue.slice(1),
        });
      }
    }
  },

  startAnimation: (type) => {
    set({ currentAnimation: type, isAnimating: true });
  },

  completeAnimation: () => {
    const queue = get().animationQueue;
    if (queue.length > 0) {
      const nextEvent = queue[0];
      nextEvent.onComplete?.();
      set({
        currentAnimation: nextEvent.type,
        animationQueue: queue.slice(1),
      });
    } else {
      set({ currentAnimation: 'idle', isAnimating: false });
    }
  },

  clearQueue: () => set({ animationQueue: [], currentAnimation: 'idle', isAnimating: false }),
}));

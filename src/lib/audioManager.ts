import { Howl, Howler } from 'howler';
import type { SoundName } from '@/types';

// Use Google Action free sounds as placeholders
const SOUND_SOURCES: Record<SoundName, string> = {
  shuffle: 'https://actions.google.com/sounds/v1/foley/playing_cards_shuffling.ogg',
  deal: 'https://actions.google.com/sounds/v1/foley/paper_slide.ogg',
  draw: 'https://actions.google.com/sounds/v1/foley/paper_slide.ogg',
  discard: 'https://actions.google.com/sounds/v1/foley/paper_slide.ogg',
  win: 'https://actions.google.com/sounds/v1/cartoon/cartoon_success_fanfare.ogg',
  click: 'https://actions.google.com/sounds/v1/ui/click.ogg',
  tick: 'https://actions.google.com/sounds/v1/ui/click.ogg',
  notify: 'https://actions.google.com/sounds/v1/ui/click.ogg',
  ambient: '', // Not used yet
  error: 'https://actions.google.com/sounds/v1/ui/click.ogg',
};

class AudioManager {
  private sounds: Map<SoundName, Howl> = new Map();

  constructor() {
    this.initSounds();
  }

  private initSounds() {
    Object.entries(SOUND_SOURCES).forEach(([name, src]) => {
      if (!src) return;
      this.sounds.set(name as SoundName, new Howl({
        src: [src],
        preload: true,
      }));
    });
  }

  public play(name: SoundName) {
    const sound = this.sounds.get(name);
    if (sound) {
      sound.play();
    }
  }

  public setMute(muted: boolean) {
    Howler.mute(muted);
  }
}

// Singleton instance
export const audioManager = new AudioManager();

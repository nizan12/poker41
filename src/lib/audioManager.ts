import { Howl, Howler } from 'howler';
import type { SoundName } from '@/types';

const BASE_URL = 'https://cdnjs.cloudflare.com/ajax/libs/ion-sound/3.0.7/sounds/';
const CARD_SOUND = 'https://cdn.pixabay.com/audio/2026/04/20/audio_b2942d1765.mp3';
const SHUFFLE_SOUND = 'https://cdn.pixabay.com/audio/2026/04/20/audio_f86120f14b.mp3';

const SOUND_SOURCES: Record<SoundName, string> = {
  shuffle: SHUFFLE_SOUND,
  deal: CARD_SOUND,
  draw: CARD_SOUND,
  discard: CARD_SOUND,
  win: BASE_URL + 'bell_ring.mp3',
  click: BASE_URL + 'button_tiny.mp3',
  tick: BASE_URL + 'button_tiny.mp3',
  notify: BASE_URL + 'door_bell.mp3',
  ambient: '', // Not used yet
  error: BASE_URL + 'computer_error.mp3',
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

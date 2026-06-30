'use client';

import { useEffect, useRef } from 'react';
import { useUIStore } from '@/features/game/stores/uiStore';

export const BGM_PLAYLIST = [
  { name: 'Obh Combi Sachet', url: '/bgm.mp3' },
  { name: 'Mejikuhibiniu', url: '/bgm1.mp3' },
  { name: 'Mejikuhibiniu', url: '/bgm2.mp3' }
];

export function BgmPlayer() {
  const { isBgmOn, bgmVolume, currentBgmIndex } = useUIStore();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const trackIndexRef = useRef<number>(currentBgmIndex);

  useEffect(() => {
    let errorCount = 0;

    if (!audioRef.current && BGM_PLAYLIST.length > 0) {
      audioRef.current = new Audio(BGM_PLAYLIST[currentBgmIndex].url);
      audioRef.current.volume = bgmVolume; // Dynamic volume

      // Listen for the track ending to play the next one
      audioRef.current.onended = () => {
        errorCount = 0; // reset error count on successful play
        trackIndexRef.current = (trackIndexRef.current + 1) % BGM_PLAYLIST.length;
        useUIStore.getState().setBgmIndex(trackIndexRef.current);
        if (audioRef.current) {
          audioRef.current.src = BGM_PLAYLIST[trackIndexRef.current].url;
          audioRef.current.play().catch(() => { });
        }
      };

      // If a track fails to load (e.g. 404), try the next one
      audioRef.current.onerror = () => {
        errorCount++;
        // Prevent infinite loop if all files are missing
        if (errorCount < BGM_PLAYLIST.length) {
          trackIndexRef.current = (trackIndexRef.current + 1) % BGM_PLAYLIST.length;
          useUIStore.getState().setBgmIndex(trackIndexRef.current);
          if (audioRef.current) {
            audioRef.current.src = BGM_PLAYLIST[trackIndexRef.current].url;
            if (isBgmOn) audioRef.current?.play().catch(() => { });
          }
        }
      };
    }

    if (isBgmOn) {
      audioRef.current?.play().catch(e => {
        // Ignore autoplay or missing file errors to prevent console spam
      });
    } else {
      audioRef.current?.pause();
    }
  }, [isBgmOn]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = bgmVolume;
    }
  }, [bgmVolume]);

  useEffect(() => {
    if (audioRef.current && trackIndexRef.current !== currentBgmIndex) {
      trackIndexRef.current = currentBgmIndex;
      audioRef.current.src = BGM_PLAYLIST[currentBgmIndex].url;
      if (isBgmOn) {
        audioRef.current.play().catch(() => { });
      }
    }
  }, [currentBgmIndex, isBgmOn]);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
        audioRef.current = null;
      }
    }
  }, []);

  return null;
}

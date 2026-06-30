'use client';

import { useEffect, useRef } from 'react';
import YouTube, { YouTubeEvent } from 'react-youtube';
import { useUIStore } from '@/features/game/stores/uiStore';

export function BgmPlayer() {
  const { isBgmOn, bgmVolume, currentVideoId } = useUIStore();
  const playerRef = useRef<any>(null);

  const onReady = (event: YouTubeEvent) => {
    playerRef.current = event.target;
    event.target.setVolume(Math.round(bgmVolume * 100));
    if (isBgmOn && currentVideoId) {
      event.target.playVideo();
    }
  };

  const onEnd = (event: YouTubeEvent) => {
    // Optionally fetch /api/upnext here to play the next song automatically
    // For now, it will just stop.
  };

  const onError = (event: YouTubeEvent) => {
    console.error('YouTube Player Error:', event.data);
  };

  useEffect(() => {
    if (playerRef.current) {
      if (isBgmOn && currentVideoId) {
        playerRef.current.playVideo();
      } else {
        playerRef.current.pauseVideo();
      }
    }
  }, [isBgmOn, currentVideoId]);

  useEffect(() => {
    if (playerRef.current) {
      playerRef.current.setVolume(Math.round(bgmVolume * 100));
    }
  }, [bgmVolume]);

  if (!currentVideoId) return null;

  return (
    <div className="hidden">
      <YouTube
        videoId={currentVideoId}
        opts={{
          height: '0',
          width: '0',
          playerVars: {
            autoplay: isBgmOn ? 1 : 0,
            controls: 0,
            disablekb: 1,
            fs: 0,
            modestbranding: 1,
            rel: 0,
            showinfo: 0,
            iv_load_policy: 3,
          },
        }}
        onReady={onReady}
        onEnd={onEnd}
        onError={onError}
      />
    </div>
  );
}

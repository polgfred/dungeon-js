import { useEffect } from 'react';

import keyClickUrl from '../assets/AtariClick.mp3';

async function fetchAudio(ctx: AudioContext) {
  const res = await fetch(keyClickUrl);
  const buffer = await res.arrayBuffer();
  return await ctx.decodeAudioData(buffer);
}

// Plays a short mechanical "click" on every keystroke, app-wide
export function useKeyClick(): void {
  useEffect(() => {
    // @ts-expect-error vendor prefix
    const AudioCtx = window.AudioContext ?? window.webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    let buffer: AudioBuffer | undefined;

    // Load the audio once, up front
    fetchAudio(ctx)
      .then((decoded) => {
        buffer = decoded;
      })
      .catch(() => {});

    const onKeyDown = (event: KeyboardEvent) => {
      // Skip auto-repeat
      if (event.repeat || !buffer) return;
      // Audio can't start without a gesture; keydown is one, so resume here.
      if (ctx.state === 'suspended') ctx.resume();
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.start();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      ctx.close();
    };
  }, []);
}

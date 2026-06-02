import { useEffect } from 'react';

import { attractShift } from './gtiaPalette.js';

// A nod to the original Atari "attract mode": after the machine sat idle for a
// while, the OS would slowly cycle every on-screen color at reduced brightness
// to protect the CRT from burn-in. This hook recreates that effect by shifting
// the theme's GTIA color tokens with the same EOR/AND math the hardware used
// (see attractShift), driven by an idle timer that any input resets.

// Theme tokens to cycle. Each resolves to a GTIA color; tokens with a companion
// `<token>-rgb` var (used for rgba()) have it kept in sync.
const CYCLED_TOKENS = [
  '--primary-main',
  '--primary-light',
  '--primary-dark',
  '--bg-default',
  '--bg-paper',
  '--text-primary',
  '--text-secondary',
  '--error-light',
  '--error-main',
  '--loot-main',
  '--combat-main',
  '--grey-200',
] as const;

// Input events that count as activity and reset the idle timer.
const ACTIVITY_EVENTS = [
  'keydown',
  'pointerdown',
  'touchstart',
  'wheel',
] as const;

// Tweakable timings. The real Atari idled ~9 minutes, then stepped the colors
// every 4.27s (one tick of the real-time clock's middle byte). We idle far
// sooner so players actually see the nod; the step interval stays authentic.
const IDLE_MS = 60_000;
const STEP_MS = 4_270;

// How far COLRSH advances per step. The OS counted up by 1, which only walks
// the high (hue) nibble once every 16 ticks — so colors pulse brightness within
// one family for ~a minute before the hue swings. Striding by 0x11 bumps both
// nibbles each step, rolling the whole palette (background included) through
// all 16 hue families while keeping the exact EOR/AND color math.
const COLRSH_STRIDE = 0x11;

const HEX = /^#[0-9a-f]{6}$/i;

function toRgb(hex: string) {
  return (
    `${parseInt(hex.slice(1, 3), 16)}, ${parseInt(hex.slice(3, 5), 16)}, ` +
    `${parseInt(hex.slice(5, 7), 16)}`
  );
}

export function useAttractMode(): void {
  useEffect(() => {
    const root = document.documentElement;
    const style = getComputedStyle(root);

    // Snapshot each token's resting value (and whether it has an -rgb twin) once.
    const tokens = CYCLED_TOKENS.map((token) => {
      const hex = style.getPropertyValue(token).trim();
      const rgbToken = `${token}-rgb`;
      const hasRgb = style.getPropertyValue(rgbToken).trim() !== '';
      return { token, hex, rgbToken, hasRgb };
    }).filter(({ hex }) => HEX.test(hex));

    let idleTimer: number | undefined;
    let stepTimer: number | undefined;

    // The OS cycled COLRSH from the clock; we step it up by one each tick.
    let colrsh = 0;

    const applyShift = () => {
      for (const { token, hex, rgbToken, hasRgb } of tokens) {
        const shifted = attractShift(hex, colrsh);
        root.style.setProperty(token, shifted);
        if (hasRgb) root.style.setProperty(rgbToken, toRgb(shifted));
      }
      colrsh = (colrsh + COLRSH_STRIDE) & 0xff;
    };

    const restore = () => {
      for (const { token, rgbToken, hasRgb } of tokens) {
        root.style.removeProperty(token);
        if (hasRgb) root.style.removeProperty(rgbToken);
      }
    };

    const enterAttract = () => {
      colrsh = 0; // first step (colrsh 0) just dims; later steps shift hue
      applyShift();
      stepTimer = window.setInterval(applyShift, STEP_MS);
    };

    const leaveAttract = () => {
      if (stepTimer === undefined) return;
      window.clearInterval(stepTimer);
      stepTimer = undefined;
      restore();
    };

    const onActivity = () => {
      leaveAttract();
      window.clearTimeout(idleTimer);
      idleTimer = window.setTimeout(enterAttract, IDLE_MS);
    };

    for (const event of ACTIVITY_EVENTS) {
      window.addEventListener(event, onActivity, { passive: true });
    }
    onActivity(); // arm the idle timer

    return () => {
      for (const event of ACTIVITY_EVENTS) {
        window.removeEventListener(event, onActivity);
      }
      window.clearTimeout(idleTimer);
      leaveAttract();
    };
  }, []);
}

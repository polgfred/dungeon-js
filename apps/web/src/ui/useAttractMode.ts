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

const IDLE_MS = 60_000;
const STEP_MS = 4_270;

// How far COLRSH advances per step
const COLRSH_STRIDE = 0x11;

// Normalize a CSS hex to canonical 6-digit lowercase
function normalizeHex(value: string): string | null {
  const v = value.trim().toLowerCase();
  if (/^#[0-9a-f]{6}$/.test(v)) return v;
  if (/^#[0-9a-f]{3}$/.test(v)) {
    const [r, g, b] = v.slice(1);
    return `#${r}${r}${g}${g}${b}${b}`;
  }
  return null;
}

function toRgb(hex: string) {
  return (
    `${parseInt(hex.slice(1, 3), 16)}, ` +
    `${parseInt(hex.slice(3, 5), 16)}, ` +
    `${parseInt(hex.slice(5, 7), 16)}`
  );
}

export function useAttractMode(): void {
  useEffect(() => {
    const root = document.documentElement;
    const style = getComputedStyle(root);

    // Snapshot each token's resting value (and whether it has an -rgb twin) once.
    const tokens = CYCLED_TOKENS.map((token) => {
      const hex = normalizeHex(style.getPropertyValue(token));
      if (hex) {
        const rgbToken = `${token}-rgb`;
        const hasRgb = style.getPropertyValue(rgbToken).trim() !== '';
        return { token, hex, rgbToken, hasRgb };
      }
    }).filter((entry) => entry !== undefined);

    let idleTimer: number | undefined;
    let stepTimer: number | undefined;

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
      // Seed from the wall clock
      colrsh = Date.now() & 0xff;
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

    // Arm the idle timer
    onActivity();

    return () => {
      for (const event of ACTIVITY_EVENTS) {
        window.removeEventListener(event, onActivity);
      }
      window.clearTimeout(idleTimer);
      leaveAttract();
    };
  }, []);
}

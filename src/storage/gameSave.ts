import { Game } from '../dungeon/engine.js';
import type { GameSave } from '../dungeon/serialization.js';

const STORAGE_KEY = 'dungeon-js-save';

export function loadSavedGame(): GameSave | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GameSave;
    if (!parsed || typeof parsed !== 'object') return null;
    if (parsed.version !== Game.SAVE_VERSION) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function storeSavedGame(save: GameSave): {
  ok: boolean;
  error?: string;
} {
  if (typeof window === 'undefined') {
    return { ok: false, error: 'Storage unavailable.' };
  }
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(save));
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Save failed.',
    };
  }
}

export function clearSavedGame(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore storage failures.
  }
}

export function hasSavedGame(): boolean {
  return loadSavedGame() !== null;
}

export function getStorageKey(): string {
  return STORAGE_KEY;
}

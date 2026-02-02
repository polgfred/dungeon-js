import { Game } from '../dungeon/engine.js';
import type { GameSave } from '../dungeon/serialization.js';

const STORAGE_KEY = 'dungeon-js-save';

export function loadSavedGame(): GameSave | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('Saved game data is corrupted.');
  }
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Saved game data is invalid.');
  }
  const save = parsed as GameSave;
  // Rehydrate once to validate the save payload against current engine rules.
  Game.fromSave(save);
  return save;
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
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(STORAGE_KEY) !== null;
  } catch {
    return false;
  }
}

export function getStorageKey(): string {
  return STORAGE_KEY;
}

import { Game } from '../dungeon/engine.js';
import type { GameSave } from '../dungeon/serialization.js';

const STORAGE_KEY = 'dungeon-js-save';

export function loadSavedGame() {
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return;
  const save = JSON.parse(raw) as GameSave;
  // Rehydrate once to validate the save payload against current engine rules.
  Game.fromSave(save);
  return save;
}

export function storeSavedGame(save: GameSave) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(save));
}

export function clearSavedGame() {
  window.localStorage.removeItem(STORAGE_KEY);
}

export function hasSavedGame() {
  return window.localStorage.getItem(STORAGE_KEY) !== null;
}

export function getStorageKey() {
  return STORAGE_KEY;
}

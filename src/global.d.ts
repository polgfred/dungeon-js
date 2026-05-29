import { Game } from './dungeon/engine.ts';

declare global {
  interface Window {
    game?: Game;
  }
}
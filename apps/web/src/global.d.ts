import { Game } from '@dod/core';

declare global {
  interface Window {
    game?: Game;
  }
}

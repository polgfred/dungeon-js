import { Game } from '@dod/core';

declare global {
  interface Window {
    game?: Game;
    setKeyClickEnabled?: (on: boolean) => void;
    setAttractModeEnabled?: (on: boolean) => void;
  }
}

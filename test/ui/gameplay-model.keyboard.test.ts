/* @vitest-environment jsdom */

import { act, fireEvent, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Feature } from '../../src/dungeon/constants.js';
import { Game } from '../../src/dungeon/engine.js';
import type { GameSave } from '../../src/dungeon/serialization.js';
import { getStorageKey } from '../../src/ui/gameSave.js';
import { useGameplayModel } from '../../src/ui/GameplayModel.js';
import { createEmptyDungeon } from '../helpers/dungeon.js';
import { buildPlayer } from '../helpers/factories.js';

function buildVendorSessionSave(): GameSave {
  const player = buildPlayer({ z: 0, y: 0, x: 0, gold: 100 });
  const game = new Game({ seed: 0, player });
  const dungeon = createEmptyDungeon();
  dungeon.rooms[0][0][0].feature = Feature.VENDOR;
  game.dungeon = dungeon;
  game.step('B');
  return game.toSave();
}

describe('GameplayModel keyboard shortcuts', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('prefers Shift+S save hotkey over vendor prompt S option', async () => {
    const savedGame = buildVendorSessionSave();
    const { result } = renderHook(() =>
      useGameplayModel({
        onBack: vi.fn(),
        onSetup: vi.fn(),
        player: buildPlayer(),
        savedGame,
      })
    );

    expect(result.current.effectivePromptText).toBe('He is selling:');
    expect(
      result.current.effectivePromptOptions?.some(
        (option) => option.key === 'S'
      )
    ).toBe(true);
    expect(window.localStorage.getItem(getStorageKey())).toBeNull();

    act(() => {
      fireEvent.keyDown(window, { key: 'S', shiftKey: true });
    });

    await waitFor(() =>
      expect(window.localStorage.getItem(getStorageKey())).not.toBeNull()
    );
    expect(result.current.effectivePromptText).toBe('He is selling:');
  });
});

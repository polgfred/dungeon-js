import { describe, expect, it } from 'vitest';
import {
  dungeonDepth,
  generateDungeon,
  validateDungeon,
} from '../../src/generation.js';
import { defaultRandomSource } from '../../src/rng.js';
import {
  deserializeDungeon,
  serializeDungeon,
} from '../../src/serialization.js';

describe('Dungeon generation invariants', () => {
  it('passes validation across many generations', () => {
    const totalRuns = 500;
    for (let i = 0; i < totalRuns; i += 1) {
      const dungeon = generateDungeon(defaultRandomSource);
      const errors = validateDungeon(dungeon);
      expect(
        errors,
        `generation ${i + 1} failed: ${errors.join('; ')}`
      ).toEqual([]);
    }
  });

  it('rehydrates games across many generations', () => {
    const totalRuns = 500;
    for (let i = 0; i < totalRuns; i += 1) {
      const dungeon = generateDungeon(defaultRandomSource);
      const hydrated = deserializeDungeon(serializeDungeon(dungeon));
      expect(hydrated).toEqual(dungeon);
    }
  });

  it('plateaus deep-floor monsters at [7,10] instead of all Dragons', () => {
    const levels = new Set<number>();
    for (let run = 0; run < 200; run += 1) {
      const dungeon = generateDungeon(defaultRandomSource, dungeonDepth(4));
      const deepest = dungeon.rooms[dungeon.rooms.length - 1];
      for (const row of deepest) {
        for (const room of row) {
          if (room.monsterLevel > 0) {
            levels.add(room.monsterLevel);
          }
        }
      }
    }
    // The floor clamp holds the deepest band at 7..10.
    expect(Math.min(...levels)).toBe(7);
    expect(Math.max(...levels)).toBe(10);
  });
});

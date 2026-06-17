import { describe, expect, it } from 'vitest';
import {
  FLOOR_SIZE,
  dungeonDepth,
  generateDungeon,
  validateDungeon,
} from '../../src/generation.js';
import { defaultRandomSource } from '../../src/rng.js';

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

  it('scales depth as 5 + 2n while floors stay 7x7', () => {
    expect(dungeonDepth(1)).toBe(7);
    expect(dungeonDepth(2)).toBe(9);
    expect(dungeonDepth(4)).toBe(13);

    for (const players of [1, 2, 3, 4]) {
      const dungeon = generateDungeon(
        defaultRandomSource,
        dungeonDepth(players)
      );
      expect(dungeon.rooms.length).toBe(5 + 2 * players);
      expect(dungeon.rooms[0].length).toBe(FLOOR_SIZE);
      expect(dungeon.rooms[0][0].length).toBe(FLOOR_SIZE);
      expect(validateDungeon(dungeon)).toEqual([]);
    }
  });

  it('plateaus deep-floor monsters at [8,10] instead of all Dragons', () => {
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
    // The floor clamp holds the deepest band at 8..10 (Hellhound/Chimaera/
    // Dragon), not a collapse to nothing but level-10 Dragons.
    expect(Math.min(...levels)).toBe(8);
    expect(Math.max(...levels)).toBe(10);
  });
});

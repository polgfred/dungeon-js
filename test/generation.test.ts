import { describe, expect, it } from 'vitest';
import { generateDungeon, validateDungeon } from '../src/dungeon/generation.js';
import { defaultRandomSource } from '../src/dungeon/rng.js';

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
});

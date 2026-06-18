import { FLOOR_SIZE } from '@dod/core';

import { makeDungeon, type Room } from '../../src/model.js';
import { Feature } from '../../src/constants.js';

export function createEmptyDungeon() {
  const rooms: Room[][][] = Array.from({ length: FLOOR_SIZE }, () =>
    Array.from({ length: FLOOR_SIZE }, () =>
      Array.from({ length: FLOOR_SIZE }, () => ({
        feature: Feature.EMPTY,
        treasureId: 0,
        monsterLevel: 0,
        monsterVitality: 0,
      }))
    )
  );
  return makeDungeon(rooms);
}

import { Feature } from '../../src/constants.js';
import { dungeonDepth, dungeonSize } from '../../src/generation.js';
import { makeDungeon, type Room } from '../../src/model.js';

export function createEmptyDungeon() {
  const depth = dungeonDepth(1);
  const size = dungeonSize(1);
  const rooms: Room[][][] = Array.from({ length: depth }, () =>
    Array.from({ length: size }, () =>
      Array.from({ length: size }, () => ({
        feature: Feature.EMPTY,
        treasureId: 0,
        monsterLevel: 0,
        monsterVitality: 0,
        observed: false,
      }))
    )
  );
  return makeDungeon(rooms);
}

import { Dungeon, type Room } from '../../src/model.js';
import { Feature } from '../../src/constants.js';
import { Game } from '../../src/engine.js';

export function createEmptyDungeon(): Dungeon {
  const rooms: Room[][][] = Array.from({ length: Game.SIZE }, () =>
    Array.from({ length: Game.SIZE }, () =>
      Array.from({ length: Game.SIZE }, () => ({
        feature: Feature.EMPTY,
        treasureId: 0,
        monsterLevel: 0,
        monsterVitality: 0,
      }))
    )
  );
  return new Dungeon(rooms);
}

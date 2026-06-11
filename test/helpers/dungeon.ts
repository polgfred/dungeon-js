import { Dungeon, type Room } from '../../src/dungeon/model.js';
import { Feature } from '../../src/dungeon/constants.js';
import { Game } from '../../src/dungeon/engine.js';

export function createEmptyDungeon(): Dungeon {
  const rooms: Room[][][] = Array.from({ length: Game.SIZE }, () =>
    Array.from({ length: Game.SIZE }, () =>
      Array.from({ length: Game.SIZE }, () => ({
        feature: Feature.EMPTY,
        monsterLevel: 0,
        monsterVitality: 0,
        treasureId: 0,
      }))
    )
  );
  return new Dungeon(rooms);
}

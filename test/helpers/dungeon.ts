import { Dungeon, type Room } from '../../src/dungeon/model.js';
import { Feature } from '../../src/dungeon/constants.js';
import { Game } from '../../src/dungeon/engine.js';

export function createEmptyDungeon(): Dungeon {
  const rooms: Room[][][] = Array.from({ length: Game.SIZE }, () =>
    Array.from({ length: Game.SIZE }, () =>
      Array.from({ length: Game.SIZE }, () => ({
        feature: Feature.EMPTY,
        monsterLevel: 0,
        treasureId: 0,
        seen: false,
      }))
    )
  );
  return new Dungeon(rooms);
}

import { Dungeon, Room } from '../../src/dungeon/model.js';
import { Game } from '../../src/dungeon/engine.js';

export function createEmptyDungeon(): Dungeon {
  const rooms: Room[][][] = Array.from({ length: Game.SIZE }, () =>
    Array.from({ length: Game.SIZE }, () =>
      Array.from({ length: Game.SIZE }, () => new Room())
    )
  );
  return new Dungeon(rooms);
}

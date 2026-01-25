import { Feature } from "./constants.js";
import { Dungeon, Room } from "./model.js";
import type { RandomSource } from "./rng.js";

const SIZE = 7;

export function generateDungeon(rng: RandomSource): Dungeon {
  const rooms: Room[][][] = Array.from({ length: SIZE }, () =>
    Array.from({ length: SIZE }, () =>
      Array.from({ length: SIZE }, () => createRoom(rng)),
    ),
  );

  placeTreasures(rng, rooms);
  placeStairs(rng, rooms);
  placeExit(rng, rooms);

  return new Dungeon(rooms);
}

function createRoom(rng: RandomSource): Room {
  const room = new Room();
  if (rng.random() > 0.3) {
    const roll = rng.randint(1, 10);
    if (roll > 8) {
      room.monsterLevel = rng.randint(1, 10);
    } else {
      room.feature = roll as Feature;
    }
  }
  return room;
}

function placeTreasures(rng: RandomSource, rooms: Room[][][]): void {
  let placed = 0;
  while (placed < 10) {
    const z = rng.randrange(SIZE);
    const y = rng.randrange(SIZE);
    const x = rng.randrange(SIZE);
    const room = rooms[z][y][x];
    if (room.treasureId !== 0) {
      continue;
    }
    placed += 1;
    room.treasureId = placed;
  }
}

function placeStairs(rng: RandomSource, rooms: Room[][][]): void {
  for (let z = 0; z < SIZE - 1; z += 1) {
    while (true) {
      const y = rng.randrange(SIZE);
      const x = rng.randrange(SIZE);
      const room = rooms[z][y][x];
      const roomBelow = rooms[z + 1][y][x];
      if (room.treasureId > 0 || room.monsterLevel > 0) {
        continue;
      }
      if (roomBelow.treasureId > 0 || roomBelow.monsterLevel > 0) {
        continue;
      }
      if (room.feature === Feature.STAIRS_DOWN) {
        continue;
      }
      room.feature = Feature.STAIRS_UP;
      roomBelow.feature = Feature.STAIRS_DOWN;
      break;
    }
  }
}

function placeExit(rng: RandomSource, rooms: Room[][][]): void {
  const z = SIZE - 1;
  while (true) {
    const y = rng.randrange(SIZE);
    const x = rng.randrange(SIZE);
    const room = rooms[z][y][x];
    if (room.treasureId > 0 || room.monsterLevel > 0) {
      continue;
    }
    if (
      room.feature === Feature.STAIRS_UP ||
      room.feature === Feature.STAIRS_DOWN ||
      room.feature === Feature.EXIT
    ) {
      continue;
    }
    room.feature = Feature.EXIT;
    break;
  }
}

export function validateDungeon(dungeon: Dungeon): string[] {
  const errors: string[] = [];
  if (dungeon.rooms.length !== SIZE) {
    errors.push("Dungeon has incorrect number of floors.");
    return errors;
  }

  let exitCount = 0;
  let treasureCount = 0;
  for (let z = 0; z < SIZE; z += 1) {
    for (let y = 0; y < SIZE; y += 1) {
      if (dungeon.rooms[z][y].length !== SIZE) {
        errors.push(`Row size mismatch on floor ${z}.`);
      }
      for (let x = 0; x < SIZE; x += 1) {
        const room = dungeon.rooms[z][y][x];
        if (room.feature === Feature.EXIT) {
          if (z !== SIZE - 1) {
            errors.push("Exit placed on non-final floor.");
          }
          exitCount += 1;
        }
        if (room.treasureId) {
          treasureCount += 1;
        }
        if (room.feature === Feature.STAIRS_UP) {
          if (z === SIZE - 1) {
            errors.push("Stairs up on final floor.");
          } else {
            const below = dungeon.rooms[z + 1][y][x];
            if (below.feature !== Feature.STAIRS_DOWN) {
              errors.push("Stair alignment mismatch.");
            }
          }
        }
      }
    }
  }

  if (exitCount !== 1) {
    errors.push("Dungeon must contain exactly one exit.");
  }
  if (treasureCount !== 10) {
    errors.push("Dungeon must contain exactly 10 treasures.");
  }

  return errors;
}

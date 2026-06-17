import { Feature } from './constants.js';
import { createDungeon, Dungeon, type Room } from './model.js';
import type { RandomSource } from './rng.js';

/** Rooms along each edge of a floor (the y/x dimensions). */
export const FLOOR_SIZE = 7;

/** Number of floors (the z dimension), scaled by party size. */
export function dungeonDepth(playerCount: number): number {
  return 5 + 2 * Math.max(1, playerCount);
}

const DEFAULT_DEPTH = dungeonDepth(1);

export function generateDungeon(
  rng: RandomSource,
  depth: number = DEFAULT_DEPTH
): Dungeon {
  const rooms: Room[][][] = Array.from({ length: depth }, (_, z) =>
    Array.from({ length: FLOOR_SIZE }, () =>
      Array.from({ length: FLOOR_SIZE }, () => createRoom(rng, z))
    )
  );

  placeTreasures(rng, rooms);
  placeStairs(rng, rooms);
  placeExit(rng, rooms);

  return createDungeon(rooms);
}

function createRoom(rng: RandomSource, floor: number): Room {
  const room: Room = {
    feature: Feature.EMPTY,
    treasureId: 0,
    monsterLevel: 0,
    monsterVitality: 0,
  };
  if (rng.random() > 0.3) {
    const roll = rng.randint(1, 10);
    if (roll > 8) {
      // Clamp the floor so we don't get all dragons at z>9.
      floor = Math.min(floor, 7);
      const minLevel = floor + 1;
      const maxLevel = Math.min(10, minLevel + 5);
      room.monsterLevel = rng.randint(minLevel, maxLevel);
    } else {
      room.feature = roll as Feature;
    }
  }
  return room;
}

function placeTreasures(rng: RandomSource, rooms: Room[][][]): void {
  const depth = rooms.length;
  let placed = 0;
  while (placed < 10) {
    const z = rng.randrange(depth);
    const y = rng.randrange(FLOOR_SIZE);
    const x = rng.randrange(FLOOR_SIZE);
    const room = rooms[z][y][x];
    if (room.treasureId !== 0) continue;
    if (room.feature !== Feature.EMPTY) continue;
    placed += 1;
    room.treasureId = placed;
  }
}

function placeStairs(rng: RandomSource, rooms: Room[][][]): void {
  for (let z = 0; z < rooms.length - 1; z += 1) {
    while (true) {
      const y = rng.randrange(FLOOR_SIZE);
      const x = rng.randrange(FLOOR_SIZE);
      const room = rooms[z][y][x];
      const roomAbove = rooms[z + 1][y][x];
      if (room.treasureId > 0 || room.monsterLevel > 0) continue;
      if (roomAbove.treasureId > 0 || roomAbove.monsterLevel > 0) continue;
      if (room.feature === Feature.STAIRS_DOWN) continue;
      room.feature = Feature.STAIRS_UP;
      roomAbove.feature = Feature.STAIRS_DOWN;
      break;
    }
  }
}

function placeExit(rng: RandomSource, rooms: Room[][][]): void {
  const z = rooms.length - 1;
  while (true) {
    const y = rng.randrange(FLOOR_SIZE);
    const x = rng.randrange(FLOOR_SIZE);
    const room = rooms[z][y][x];
    if (room.treasureId > 0 || room.monsterLevel > 0) continue;
    if (
      room.feature === Feature.STAIRS_UP ||
      room.feature === Feature.STAIRS_DOWN ||
      room.feature === Feature.EXIT
    )
      continue;
    room.feature = Feature.EXIT;
    break;
  }
}

export function validateDungeon(dungeon: Dungeon): string[] {
  const errors: string[] = [];
  const depth = dungeon.rooms.length;
  if (depth < 2) {
    errors.push('Dungeon must have at least two floors.');
    return errors;
  }

  let exitCount = 0;
  let treasureCount = 0;
  const stairsUpCounts = Array.from({ length: depth }, () => 0);
  const stairsDownCounts = Array.from({ length: depth }, () => 0);
  for (let z = 0; z < depth; z += 1) {
    if (dungeon.rooms[z].length !== FLOOR_SIZE) {
      errors.push(`Floor size mismatch on floor ${z}.`);
    }
    for (let y = 0; y < FLOOR_SIZE; y += 1) {
      if (dungeon.rooms[z][y].length !== FLOOR_SIZE) {
        errors.push(`Row size mismatch on floor ${z}.`);
      }
      for (let x = 0; x < FLOOR_SIZE; x += 1) {
        const room = dungeon.rooms[z][y][x];
        if (room.feature === Feature.EXIT) {
          if (z !== depth - 1) {
            errors.push('Exit placed on non-final floor.');
          }
          exitCount += 1;
        }
        if (room.treasureId) {
          treasureCount += 1;
          if (room.feature !== Feature.EMPTY) {
            errors.push('Treasure placed in non-empty room.');
          }
        }
        if (room.monsterLevel > 0) {
          if (room.feature !== Feature.EMPTY) {
            errors.push('Monster placed in room with feature.');
          }
        }
        if (room.feature === Feature.STAIRS_UP) {
          stairsUpCounts[z] += 1;
          if (z === depth - 1) {
            errors.push('Stairs up on final floor.');
          } else {
            const above = dungeon.rooms[z + 1][y][x];
            if (above.feature !== Feature.STAIRS_DOWN) {
              errors.push('Stair alignment mismatch.');
            }
          }
        }
        if (room.feature === Feature.STAIRS_DOWN) {
          stairsDownCounts[z] += 1;
          if (z === 0) {
            errors.push('Stairs down on first floor.');
          } else {
            const above = dungeon.rooms[z - 1][y][x];
            if (above.feature !== Feature.STAIRS_UP) {
              errors.push('Stair alignment mismatch.');
            }
          }
        }
        if (
          (room.feature === Feature.EXIT ||
            room.feature === Feature.STAIRS_UP ||
            room.feature === Feature.STAIRS_DOWN) &&
          (room.monsterLevel > 0 || room.treasureId > 0)
        ) {
          errors.push('Feature placed in room with monster or treasure.');
        }
      }
    }
  }

  for (let z = 0; z < depth; z += 1) {
    if (z < depth - 1 && stairsUpCounts[z] !== 1) {
      errors.push('Floor must contain exactly one staircase up.');
    }
    if (z === depth - 1 && stairsUpCounts[z] !== 0) {
      errors.push('Final floor must not contain staircase up.');
    }
    if (z > 0 && stairsDownCounts[z] !== 1) {
      errors.push('Floor must contain exactly one staircase down.');
    }
    if (z === 0 && stairsDownCounts[z] !== 0) {
      errors.push('First floor must not contain staircase down.');
    }
  }

  if (exitCount !== 1) {
    errors.push('Dungeon must contain exactly one exit.');
  }
  if (treasureCount !== 10) {
    errors.push('Dungeon must contain exactly 10 treasures.');
  }

  return errors;
}

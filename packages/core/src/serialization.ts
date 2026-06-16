import type { Mode, Race, Spell, Tile } from './constants.js';
import {
  Dungeon,
  createSpellCounts,
  makePlayer,
  type Player,
  type Room,
} from './model.js';

type RoomPacked = number;

type DungeonSave = RoomPacked[][][];

export type EncounterSave = {
  awaitingSpell: boolean;
};

export type VendorSave = {
  phase: 'category' | 'item' | 'attribute';
  category: string | null;
};

export type PlayerEntrySave = {
  id: string;
  player: Player;
  observed: Tile[][][];
  encounter: EncounterSave | null;
  vendor: VendorSave | null;
  exited: boolean;
};

export type GameSave = {
  version: number;
  savedAt: string;
  dungeon: DungeonSave;
  treasuresFound: number[];
  endMode: Mode | null;
  players: PlayerEntrySave[];
};

export function serializeDungeon(dungeon: Dungeon): DungeonSave {
  return dungeon.rooms.map((floor) => floor.map((row) => row.map(encodeRoom)));
}

export function deserializeDungeon(save: DungeonSave): Dungeon {
  const rooms = save.map((floor) => floor.map((row) => row.map(decodeRoom)));
  return new Dungeon(rooms);
}

const FEATURE_SHIFT = 0;
const TREASURE_SHIFT = 4;
const MONSTER_SHIFT = 8;
const VITALITY_SHIFT = 12;
const NIBBLE_MASK = 0x0f;
const VITALITY_MASK = 0x3f;

function encodeRoom(room: Room): RoomPacked {
  return (
    ((room.feature & NIBBLE_MASK) << FEATURE_SHIFT) |
    ((room.treasureId & NIBBLE_MASK) << TREASURE_SHIFT) |
    ((room.monsterLevel & NIBBLE_MASK) << MONSTER_SHIFT) |
    ((room.monsterVitality & VITALITY_MASK) << VITALITY_SHIFT)
  );
}

function decodeRoom(savedRoom: RoomPacked): Room {
  return {
    feature: (savedRoom >> FEATURE_SHIFT) & NIBBLE_MASK,
    treasureId: (savedRoom >> TREASURE_SHIFT) & NIBBLE_MASK,
    monsterLevel: (savedRoom >> MONSTER_SHIFT) & NIBBLE_MASK,
    monsterVitality: (savedRoom >> VITALITY_SHIFT) & VITALITY_MASK,
  };
}

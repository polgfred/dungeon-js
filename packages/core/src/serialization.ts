import { Spell, type Mode, type Race, type Tile } from './constants.js';
import {
  createDungeon,
  makePlayer,
  type SpellCounts,
  type Dungeon,
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

export type PlayerSave = {
  z: number;
  y: number;
  x: number;
  race: Race;
  str: number;
  dex: number;
  iq: number;
  hp: number;
  mhp: number;
  gold: number;
  flares: number;
  weaponTier: number;
  armorTier: number;
  weaponName: string;
  weaponBroken: boolean;
  armorName: string;
  armorDamaged: boolean;
  spells: number[];
  fatigued: boolean;
  tempArmorBonus: number;
};

export type PlayerEntrySave = {
  id: string;
  player: PlayerSave;
  observed: Tile[][][];
  encounter: EncounterSave | null;
  vendor: VendorSave | null;
  exited: boolean;
};

export type GameSave = {
  savedAt: Date;
  version: number;
  dungeon: DungeonSave;
  treasuresFound: Set<number>;
  endMode: Mode | null;
  players: PlayerEntrySave[];
};

export function serializePlayer(player: Player): PlayerSave {
  return {
    ...player,
    spells: [
      // Make sure these are in order
      player.spells.get(Spell.PROTECTION) ?? 0,
      player.spells.get(Spell.FIREBALL) ?? 0,
      player.spells.get(Spell.LIGHTNING) ?? 0,
      player.spells.get(Spell.WEAKEN) ?? 0,
      player.spells.get(Spell.TELEPORT) ?? 0,
    ],
  };
}

export function deserializePlayer(save: PlayerSave): Player {
  const spells: SpellCounts = new Map();
  spells.set(Spell.PROTECTION, save.spells[0]);
  spells.set(Spell.FIREBALL, save.spells[1]);
  spells.set(Spell.LIGHTNING, save.spells[2]);
  spells.set(Spell.WEAKEN, save.spells[3]);
  spells.set(Spell.TELEPORT, save.spells[4]);
  return makePlayer({ ...save, spells });
}

export function serializeDungeon(dungeon: Dungeon): DungeonSave {
  return dungeon.rooms.map((floor) => floor.map((row) => row.map(encodeRoom)));
}

export function deserializeDungeon(save: DungeonSave): Dungeon {
  const rooms = save.map((floor) => floor.map((row) => row.map(decodeRoom)));
  return createDungeon(rooms);
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

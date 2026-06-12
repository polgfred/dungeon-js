import type { Mode, Race, Spell, Tile } from './constants.js';
import { Dungeon, Player, createSpellCounts, type Room } from './model.js';

type RoomPacked = number;

type DungeonSave = RoomPacked[][][];

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
  spells: Record<number, number>;
  fatigued: boolean;
  tempArmorBonus: number;
};

export type EncounterSave = {
  awaitingSpell: boolean;
};

export type VendorSave = {
  phase: 'category' | 'item' | 'attribute';
  category: string | null;
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
  version: number;
  savedAt: string;
  dungeon: DungeonSave;
  treasuresFound: number[];
  endMode: Mode | null;
  players: PlayerEntrySave[];
  debug: boolean;
};

export function serializePlayer(player: Player): PlayerSave {
  return {
    z: player.z,
    y: player.y,
    x: player.x,
    race: player.race,
    str: player.str,
    dex: player.dex,
    iq: player.iq,
    hp: player.hp,
    mhp: player.mhp,
    gold: player.gold,
    flares: player.flares,
    weaponTier: player.weaponTier,
    armorTier: player.armorTier,
    weaponName: player.weaponName,
    weaponBroken: player.weaponBroken,
    armorName: player.armorName,
    armorDamaged: player.armorDamaged,
    spells: player.spells,
    fatigued: player.fatigued,
    tempArmorBonus: player.tempArmorBonus,
  };
}

export function deserializePlayer(save: PlayerSave): Player {
  const spells = createSpellCounts();
  for (const [key, value] of Object.entries(save.spells)) {
    const spell = Number(key) as Spell;
    if (Number.isNaN(spell)) continue;
    spells[spell] = value;
  }
  return new Player({
    z: save.z,
    y: save.y,
    x: save.x,
    race: save.race,
    str: save.str,
    dex: save.dex,
    iq: save.iq,
    hp: save.hp,
    mhp: save.mhp,
    gold: save.gold,
    flares: save.flares,
    weaponTier: save.weaponTier,
    armorTier: save.armorTier,
    weaponName: save.weaponName,
    weaponBroken: save.weaponBroken,
    armorName: save.armorName,
    armorDamaged: save.armorDamaged,
    fatigued: save.fatigued,
    tempArmorBonus: save.tempArmorBonus,
    spells,
  });
}

export function serializeDungeon(dungeon: Dungeon): DungeonSave {
  return dungeon.rooms.map((floor) =>
    floor.map((row) => row.map(encodeRoom))
  );
}

export function deserializeDungeon(save: DungeonSave): Dungeon {
  const rooms = save.map((floor) =>
    floor.map((row) => row.map(decodeRoom))
  );
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

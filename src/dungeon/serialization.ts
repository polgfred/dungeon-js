import { Mode, Race, Spell } from './constants.js';
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
  treasuresFound: number[];
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
  monsterLevel: number;
  monsterName: string;
  vitality: number;
  awaitingSpell: boolean;
};

export type VendorSave = {
  phase: 'category' | 'item' | 'attribute';
  category: string | null;
};

export type GameSave = {
  version: number;
  savedAt: string;
  mode: Mode;
  player: PlayerSave;
  dungeon: DungeonSave;
  encounter: EncounterSave | null;
  vendor: VendorSave | null;
  debug: boolean;
};

type GameSaveInput = {
  version: number;
  mode: Mode;
  player: Player;
  dungeon: Dungeon;
  encounter: EncounterSave | null;
  vendor: VendorSave | null;
  debug: boolean;
};

type GameSaveState = {
  version: number;
  mode: Mode;
  player: Player;
  dungeon: Dungeon;
  encounter: EncounterSave | null;
  vendor: VendorSave | null;
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
    treasuresFound: Array.from(player.treasuresFound),
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
    treasuresFound: new Set(save.treasuresFound),
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

export function serializeGame(input: GameSaveInput): GameSave {
  return {
    version: input.version,
    savedAt: new Date().toISOString(),
    mode: input.mode,
    player: serializePlayer(input.player),
    dungeon: serializeDungeon(input.dungeon),
    encounter: input.encounter,
    vendor: input.vendor,
    debug: input.debug,
  };
}

export function deserializeGame(save: GameSave): GameSaveState {
  return {
    version: save.version,
    mode: save.mode,
    player: deserializePlayer(save.player),
    dungeon: deserializeDungeon(save.dungeon),
    encounter: save.encounter,
    vendor: save.vendor,
    debug: save.debug,
  };
}

export function serializeDungeon(dungeon: Dungeon): DungeonSave {
  return dungeon.rooms.map((floor) =>
    floor.map((row) => row.map((room) => encodeRoom(room)))
  );
}

export function deserializeDungeon(save: DungeonSave): Dungeon {
  const rooms = save.map((floor) =>
    floor.map((row) => row.map((savedRoom) => decodeRoom(savedRoom)))
  );
  return new Dungeon(rooms);
}

const FEATURE_SHIFT = 0;
const MONSTER_SHIFT = 4;
const TREASURE_SHIFT = 8;
const SEEN_SHIFT = 12;
const NIBBLE_MASK = 0x0f;

function encodeRoom(room: Room): RoomPacked {
  return (
    ((room.feature & NIBBLE_MASK) << FEATURE_SHIFT) |
    ((room.monsterLevel & NIBBLE_MASK) << MONSTER_SHIFT) |
    ((room.treasureId & NIBBLE_MASK) << TREASURE_SHIFT) |
    ((room.seen ? 1 : 0) << SEEN_SHIFT)
  );
}

function decodeRoom(savedRoom: RoomPacked): Room {
  return {
    feature: (savedRoom >> FEATURE_SHIFT) & NIBBLE_MASK,
    monsterLevel: (savedRoom >> MONSTER_SHIFT) & NIBBLE_MASK,
    treasureId: (savedRoom >> TREASURE_SHIFT) & NIBBLE_MASK,
    seen: ((savedRoom >> SEEN_SHIFT) & 1) === 1,
  };
}

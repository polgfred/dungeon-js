import { Feature, Mode, Race, Spell } from './constants.js';
import { Dungeon, Player, Room, createSpellCounts } from './model.js';

export type RoomSavePacked = number;
export type RoomSave =
  | RoomSavePacked
  | {
      feature: Feature;
      monsterLevel: number;
      treasureId: number;
      seen: boolean;
    };

export type DungeonSave = RoomSave[][][];

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
  armorName: string;
  armorDamaged: boolean;
  spells: Record<number, number>;
  fatigued: boolean;
  tempArmorBonus: number;
  attrPotionTarget: string | null;
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

export type GameSaveInput = {
  version: number;
  mode: Mode;
  player: Player;
  dungeon: Dungeon;
  encounter: EncounterSave | null;
  vendor: VendorSave | null;
  debug: boolean;
};

export type GameSaveState = {
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
    armorName: player.armorName,
    armorDamaged: player.armorDamaged,
    spells: player.spells,
    fatigued: player.fatigued,
    tempArmorBonus: player.tempArmorBonus,
    attrPotionTarget: player.attrPotionTarget,
  };
}

export function deserializePlayer(save: PlayerSave): Player {
  const spells = createSpellCounts();
  if (save.spells) {
    for (const [key, value] of Object.entries(save.spells)) {
      const spell = Number(key) as Spell;
      if (Number.isNaN(spell)) continue;
      spells[spell] = value;
    }
  }
  return new Player({
    z: save.z ?? 0,
    y: save.y ?? 0,
    x: save.x ?? 0,
    race: save.race,
    str: save.str,
    dex: save.dex,
    iq: save.iq,
    hp: save.hp,
    mhp: save.mhp,
    gold: save.gold,
    flares: save.flares,
    treasuresFound: new Set(save.treasuresFound ?? []),
    weaponTier: save.weaponTier ?? 0,
    armorTier: save.armorTier ?? 0,
    weaponName: save.weaponName ?? '(None)',
    armorName: save.armorName ?? '(None)',
    armorDamaged: save.armorDamaged ?? false,
    spells,
    fatigued: save.fatigued ?? false,
    tempArmorBonus: save.tempArmorBonus ?? 0,
    attrPotionTarget: save.attrPotionTarget ?? null,
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
    floor.map((row) =>
      row.map((room) => encodeRoom(room))
    )
  );
}

export function deserializeDungeon(save: DungeonSave): Dungeon {
  const rooms = save.map((floor) =>
    floor.map((row) =>
      row.map((savedRoom) => decodeRoom(savedRoom))
    )
  );
  return new Dungeon(rooms);
}

const FEATURE_SHIFT = 0;
const MONSTER_SHIFT = 4;
const TREASURE_SHIFT = 8;
const SEEN_SHIFT = 12;
const NIBBLE_MASK = 0x0f;

function encodeRoom(room: Room): RoomSavePacked {
  return (
    ((room.feature & NIBBLE_MASK) << FEATURE_SHIFT) |
    ((room.monsterLevel & NIBBLE_MASK) << MONSTER_SHIFT) |
    ((room.treasureId & NIBBLE_MASK) << TREASURE_SHIFT) |
    ((room.seen ? 1 : 0) << SEEN_SHIFT)
  );
}

function decodeRoom(savedRoom: RoomSave): Room {
  const room = new Room();
  if (typeof savedRoom === 'number') {
    room.feature = (savedRoom >> FEATURE_SHIFT) & NIBBLE_MASK;
    room.monsterLevel = (savedRoom >> MONSTER_SHIFT) & NIBBLE_MASK;
    room.treasureId = (savedRoom >> TREASURE_SHIFT) & NIBBLE_MASK;
    room.seen = ((savedRoom >> SEEN_SHIFT) & 1) === 1;
    return room;
  }
  room.feature = savedRoom.feature ?? Feature.EMPTY;
  room.monsterLevel = savedRoom.monsterLevel ?? 0;
  room.treasureId = savedRoom.treasureId ?? 0;
  room.seen = savedRoom.seen ?? false;
  return room;
}

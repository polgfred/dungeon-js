export const enum Feature {
  EMPTY = 0,
  MIRROR = 1,
  SCROLL = 2,
  CHEST = 3,
  FLARES = 4,
  POTION = 5,
  VENDOR = 6,
  THIEF = 7,
  WARP = 8,
  STAIRS_UP = 9,
  STAIRS_DOWN = 10,
  EXIT = 11,
}

export const enum Race {
  HUMAN = 1,
  DWARF = 2,
  ELF = 3,
  HALFLING = 4,
}

export function raceName(race: Race): string {
  switch (race) {
    case Race.HUMAN:
      return 'Human';
    case Race.DWARF:
      return 'Dwarf';
    case Race.ELF:
      return 'Elf';
    case Race.HALFLING:
      return 'Halfling';
  }
}

export const enum Spell {
  PROTECTION = 1,
  FIREBALL = 2,
  LIGHTNING = 3,
  WEAKEN = 4,
  TELEPORT = 5,
}

export function spellName(spell: Spell): string {
  switch (spell) {
    case Spell.PROTECTION:
      return 'Protection';
    case Spell.FIREBALL:
      return 'Fireball';
    case Spell.LIGHTNING:
      return 'Lightning';
    case Spell.WEAKEN:
      return 'Weaken';
    case Spell.TELEPORT:
      return 'Teleport';
  }
}

export const enum Mode {
  EXPLORE = 1,
  ENCOUNTER = 2,
  GAME_OVER = 3,
  VICTORY = 4,
}

export const EXPLORE_COMMANDS = new Set([
  'N',
  'S',
  'E',
  'W',
  'U',
  'D',
  'F',
  'X',
  'L',
  'O',
  'R',
  'P',
  'B',
]);

export const ENCOUNTER_COMMANDS = new Set(['F', 'R', 'S']);

const MONSTER_NAMES = [
  'Skeleton',
  'Goblin',
  'Kobold',
  'Orc',
  'Troll',
  'Werewolf',
  'Banshee',
  'Hellhound',
  'Chimaera',
  'Dragon',
];

export function monsterName(level: number): string {
  return MONSTER_NAMES[level - 1];
}

const TREASURE_NAMES = [
  'Gold Fleece',
  'Black Pearl',
  'Ruby Ring',
  'Diamond Clasp',
  'Silver Medallion',
  'Precious Spices',
  'Sapphire',
  'Golden Circlet',
  'Jeweled Cross',
  'Silmaril',
];

export function treasureName(treasureId: number): string {
  return TREASURE_NAMES[treasureId - 1];
}

export const WEAPON_NAMES = ['(None)', 'Dagger', 'Short sword', 'Broadsword'];
export const ARMOR_NAMES = ['(None)', 'Leather', 'Wooden', 'Chain mail'];

export const WEAPON_PRICES: Record<number, number> = { 1: 10, 2: 20, 3: 30 };
export const ARMOR_PRICES: Record<number, number> = { 1: 10, 2: 20, 3: 30 };

export const SPELL_PRICES: Record<Spell, number> = {
  [Spell.PROTECTION]: 50,
  [Spell.FIREBALL]: 30,
  [Spell.LIGHTNING]: 50,
  [Spell.WEAKEN]: 75,
  [Spell.TELEPORT]: 80,
};

export const POTION_PRICES: Record<string, number> = {
  HEALING: 50,
  ATTRIBUTE: 100,
};

export const FEATURE_SYMBOLS: Record<Feature, string> = {
  [Feature.EMPTY]: '-',
  [Feature.MIRROR]: 'm',
  [Feature.SCROLL]: 's',
  [Feature.CHEST]: 'c',
  [Feature.FLARES]: 'f',
  [Feature.POTION]: 'p',
  [Feature.VENDOR]: 'v',
  [Feature.THIEF]: 't',
  [Feature.WARP]: 'w',
  [Feature.STAIRS_UP]: 'U',
  [Feature.STAIRS_DOWN]: 'D',
  [Feature.EXIT]: 'X',
};

/** A single map cell, as last observed by a player. */
/** Minimum IQ required to cast any spell in an encounter. */
export const SPELL_MIN_IQ = 12;

export const enum MapTile {
  UNSEEN = -1,
  MONSTER = 12,
  TREASURE = 13,
}

export type Tile = Feature | MapTile;

const TILE_SYMBOLS: Record<MapTile, string> = {
  [MapTile.UNSEEN]: '·',
  [MapTile.MONSTER]: 'M',
  [MapTile.TREASURE]: 'T',
};

/** The single glyph for a map cell — feature symbol, or a monster/treasure/unseen marker. */
export function tileSymbol(tile: Tile): string {
  if (
    tile === MapTile.UNSEEN ||
    tile === MapTile.MONSTER ||
    tile === MapTile.TREASURE
  ) {
    return TILE_SYMBOLS[tile];
  }
  return FEATURE_SYMBOLS[tile];
}

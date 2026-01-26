export enum Feature {
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

export enum Race {
  HUMAN = 1,
  DWARF = 2,
  ELF = 3,
  HALFLING = 4,
}

export enum Spell {
  PROTECTION = 1,
  FIREBALL = 2,
  LIGHTNING = 3,
  WEAKEN = 4,
  TELEPORT = 5,
}

export enum Mode {
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
  'H',
]);

export const ENCOUNTER_COMMANDS = new Set(['F', 'R', 'S']);

export const MONSTER_NAMES = [
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

export const TREASURE_NAMES = [
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

export const WEAPON_NAMES = ['none', 'Dagger', 'Short sword', 'Broadsword'];
export const ARMOR_NAMES = ['none', 'Leather', 'Wooden', 'Chain mail'];

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

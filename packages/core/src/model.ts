import {
  ARMOR_NAMES,
  ARMOR_PRICES,
  WEAPON_NAMES,
  WEAPON_PRICES,
  Race,
  Spell,
  type Feature,
} from './constants.js';
import type { RandomSource } from './rng.js';

export interface Room {
  feature: Feature;
  treasureId: number;
  monsterLevel: number;
  monsterVitality: number;
  observed: boolean;
}

export interface Dungeon {
  rooms: Room[][][];
}

export function makeDungeon(rooms: Room[][][]): Dungeon {
  return { rooms };
}

export type SpellCounts = Map<Spell, number>;

export function makeSpellCounts(): SpellCounts {
  const counts: SpellCounts = new Map();
  counts.set(Spell.PROTECTION, 0);
  counts.set(Spell.FIREBALL, 0);
  counts.set(Spell.LIGHTNING, 0);
  counts.set(Spell.WEAKEN, 0);
  counts.set(Spell.TELEPORT, 0);
  return counts;
}

export interface Player {
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
  spells: SpellCounts;
  fatigued: boolean;
  tempArmorBonus: number;
}

interface PlayerInit {
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
  weaponTier?: number;
  armorTier?: number;
  weaponName?: string;
  weaponBroken?: boolean;
  armorName?: string;
  armorDamaged?: boolean;
  spells?: SpellCounts;
  fatigued?: boolean;
  tempArmorBonus?: number;
}

export function makePlayer(options: PlayerInit): Player {
  return {
    z: options.z,
    y: options.y,
    x: options.x,
    race: options.race,
    str: options.str,
    dex: options.dex,
    iq: options.iq,
    hp: options.hp,
    mhp: options.mhp,
    gold: options.gold,
    flares: options.flares,
    weaponTier: options.weaponTier ?? 0,
    armorTier: options.armorTier ?? 0,
    weaponName: options.weaponName ?? 'none',
    weaponBroken: options.weaponBroken ?? false,
    armorName: options.armorName ?? 'none',
    armorDamaged: options.armorDamaged ?? false,
    spells: options.spells ?? makeSpellCounts(),
    fatigued: options.fatigued ?? false,
    tempArmorBonus: options.tempArmorBonus ?? 0,
  };
}

export function rollBaseStats(
  rng: RandomSource,
  race: Race
): [number, number, number, number] {
  const rn = rng.randint(0, 4);
  const rd = rng.randint(0, 4);
  const ra = rng.randint(0, 4);
  const r2 = rng.randint(0, 6);

  switch (race) {
    case Race.HUMAN:
      return [8 + rn, 8 + rd, 8 + ra, 20 + r2];
    case Race.DWARF:
      return [10 + rn, 8 + rd, 6 + ra, 22 + r2];
    case Race.ELF:
      return [6 + rn, 9 + rd, 10 + ra, 16 + r2];
    case Race.HALFLING:
      return [6 + rn, 10 + rd, 9 + ra, 18 + r2];
    default:
      throw new Error('Unknown race');
  }
}

export function createPlayer(options: {
  race: Race;
  baseStats: { ST: number; DX: number; IQ: number; HP: number };
  allocations: Record<string, number>;
  gold: number;
  weaponTier: number;
  armorTier: number;
  flares: number;
}): Player {
  const { race, baseStats, gold, allocations, weaponTier, armorTier, flares } =
    options;
  let { ST: str, DX: dex, IQ: iq, HP: hp } = baseStats;

  const stAdd = Number(allocations['ST']);
  const dxAdd = Number(allocations['DX']);
  const iqAdd = Number(allocations['IQ']);
  if (Math.min(stAdd, dxAdd, iqAdd) < 0) {
    throw new Error('Invalid allocation amount.');
  }
  if (stAdd + dxAdd + iqAdd !== 5) {
    throw new Error('Allocation must total 5 points.');
  }
  str = Math.min(18, str + stAdd);
  dex = Math.min(18, dex + dxAdd);
  iq = Math.min(18, iq + iqAdd);

  if (![1, 2, 3].includes(weaponTier)) {
    throw new Error('Weapon tier must be 1..3');
  }
  if (![1, 2, 3].includes(armorTier)) {
    throw new Error('Armor tier must be 1..3');
  }
  if (flares < 0) {
    throw new Error('Flare count must be non-negative');
  }

  const cost = WEAPON_PRICES[weaponTier] + ARMOR_PRICES[armorTier] + flares;
  if (cost > gold) {
    throw new Error('Not enough gold for purchases');
  }

  return makePlayer({
    z: 0,
    y: 3,
    x: 3,
    race,
    str,
    dex,
    iq,
    hp,
    mhp: hp,
    gold: gold - cost,
    flares,
    weaponTier,
    armorTier,
    weaponName: WEAPON_NAMES[weaponTier],
    armorName: ARMOR_NAMES[armorTier],
  });
}

export function applyAttributeChange(
  player: Player,
  options: { target: string; change: number }
): void {
  const { target, change } = options;
  switch (target) {
    case 'ST':
      player.str = Math.max(1, Math.min(18, player.str + change));
      break;
    case 'DX':
      player.dex = Math.max(1, Math.min(18, player.dex + change));
      break;
    case 'IQ':
      player.iq = Math.max(1, Math.min(18, player.iq + change));
      break;
    case 'MHP':
      player.mhp = Math.max(1, player.mhp + change);
      player.hp = Math.max(1, Math.min(player.hp + change, player.mhp));
      break;
    default:
      break;
  }
}

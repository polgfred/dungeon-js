import { ARMOR_NAMES, ARMOR_PRICES, Feature, Race, Spell, WEAPON_NAMES, WEAPON_PRICES } from "./constants";
import type { RandomSource } from "./rng";

export class Room {
  feature: Feature = Feature.EMPTY;
  monsterLevel = 0;
  treasureId = 0;
  seen = false;
}

export class Dungeon {
  rooms: Room[][][];

  constructor(rooms: Room[][][]) {
    this.rooms = rooms;
  }
}

export type SpellCounts = Record<Spell, number>;

const ALL_SPELLS: Spell[] = [
  Spell.PROTECTION,
  Spell.FIREBALL,
  Spell.LIGHTNING,
  Spell.WEAKEN,
  Spell.TELEPORT,
];

export function createSpellCounts(): SpellCounts {
  const counts = {} as SpellCounts;
  for (const spell of ALL_SPELLS) {
    counts[spell] = 0;
  }
  return counts;
}

export class Player {
  z: number;
  y: number;
  x: number;

  str_: number;
  dex: number;
  iq: number;
  hp: number;
  mhp: number;

  gold: number;
  flares: number;
  treasuresFound: Set<number>;

  weaponTier = 0;
  armorTier = 0;
  weaponName = "none";
  armorName = "none";
  armorDamaged = false;

  spells: SpellCounts;

  fatigued = false;
  tempArmorBonus = 0;

  attrPotionTarget: string | null = null;

  constructor(options: {
    z: number;
    y: number;
    x: number;
    str_: number;
    dex: number;
    iq: number;
    hp: number;
    mhp: number;
    gold: number;
    flares: number;
    treasuresFound?: Set<number>;
    weaponTier?: number;
    armorTier?: number;
    weaponName?: string;
    armorName?: string;
    armorDamaged?: boolean;
    spells?: SpellCounts;
    fatigued?: boolean;
    tempArmorBonus?: number;
    attrPotionTarget?: string | null;
  }) {
    this.z = options.z;
    this.y = options.y;
    this.x = options.x;
    this.str_ = options.str_;
    this.dex = options.dex;
    this.iq = options.iq;
    this.hp = options.hp;
    this.mhp = options.mhp;
    this.gold = options.gold;
    this.flares = options.flares;
    this.treasuresFound = options.treasuresFound ?? new Set<number>();
    this.weaponTier = options.weaponTier ?? 0;
    this.armorTier = options.armorTier ?? 0;
    this.weaponName = options.weaponName ?? "none";
    this.armorName = options.armorName ?? "none";
    this.armorDamaged = options.armorDamaged ?? false;
    this.spells = options.spells ?? createSpellCounts();
    this.fatigued = options.fatigued ?? false;
    this.tempArmorBonus = options.tempArmorBonus ?? 0;
    this.attrPotionTarget = options.attrPotionTarget ?? null;
  }

  static rollBaseStats(rng: RandomSource, race: Race): [number, number, number, number] {
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
        throw new Error("Unknown race");
    }
  }

  static create(options: {
    rng: RandomSource;
    race: Race;
    allocations: Record<string, number>;
    weaponTier: number;
    armorTier: number;
    flareCount: number;
  }): Player {
    const { rng, race, allocations, weaponTier, armorTier, flareCount } = options;
    let [str_, dex, iq, hp] = Player.rollBaseStats(rng, race);

    const strAdd = Number(allocations["STR"]);
    const dexAdd = Number(allocations["DEX"]);
    const iqAdd = Number(allocations["IQ"]);
    if (Math.min(strAdd, dexAdd, iqAdd) < 0) {
      throw new Error("Invalid allocation amount.");
    }
    if (strAdd + dexAdd + iqAdd !== 5) {
      throw new Error("Allocation must total 5 points.");
    }
    str_ = Math.min(18, str_ + strAdd);
    dex = Math.min(18, dex + dexAdd);
    iq = Math.min(18, iq + iqAdd);

    const gold = rng.randint(50, 60);
    if (![1, 2, 3].includes(weaponTier)) {
      throw new Error("Weapon tier must be 1..3");
    }
    if (![1, 2, 3].includes(armorTier)) {
      throw new Error("Armor tier must be 1..3");
    }
    if (flareCount < 0) {
      throw new Error("Flare count must be non-negative");
    }

    const cost = WEAPON_PRICES[weaponTier] + ARMOR_PRICES[armorTier] + flareCount;
    if (cost > gold) {
      throw new Error("Not enough gold for purchases");
    }

    const spells = createSpellCounts();

    return new Player({
      z: 0,
      y: 3,
      x: 3,
      str_,
      dex,
      iq,
      hp,
      mhp: hp,
      gold: gold - cost,
      flares: flareCount,
      weaponTier,
      armorTier,
      weaponName: WEAPON_NAMES[weaponTier],
      armorName: ARMOR_NAMES[armorTier],
      armorDamaged: false,
      spells,
    });
  }

  applyAttributeChange(options: { target: string; change: number }): void {
    const { target, change } = options;
    switch (target) {
      case "STR":
        this.str_ = Math.max(1, Math.min(18, this.str_ + change));
        break;
      case "DEX":
        this.dex = Math.max(1, Math.min(18, this.dex + change));
        break;
      case "IQ":
        this.iq = Math.max(1, Math.min(18, this.iq + change));
        break;
      case "MHP":
        this.mhp = Math.max(1, this.mhp + change);
        this.hp = Math.max(1, Math.min(this.hp + change, this.mhp));
        break;
      default:
        break;
    }
  }
}

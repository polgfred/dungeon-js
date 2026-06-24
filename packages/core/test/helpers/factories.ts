import {
  makePlayer,
  type Player,
  type Room,
  type SpellCounts,
} from '../../src/model.js';
import { Feature, Race, Spell } from '../../src/constants.js';

export function buildPlayer(options: Partial<Player> = {}): Player {
  const defaultSpells: SpellCounts = new Map();
  defaultSpells.set(Spell.PROTECTION, 1);
  defaultSpells.set(Spell.FIREBALL, 1);
  defaultSpells.set(Spell.LIGHTNING, 1);
  defaultSpells.set(Spell.WEAKEN, 1);
  defaultSpells.set(Spell.TELEPORT, 1);

  return makePlayer({
    z: 0,
    y: 0,
    x: 0,
    race: Race.HUMAN,
    str: 12,
    dex: 12,
    iq: 14,
    hp: 20,
    mhp: 20,
    gold: 0,
    flares: 0,
    weaponTier: 2,
    armorTier: 1,
    spells: defaultSpells,
    ...options,
  });
}

export function buildRoom(options: Partial<Room> = {}): Room {
  return {
    feature: Feature.EMPTY,
    treasureId: 0,
    monsterLevel: 0,
    monsterVitality: 0,
    observed: false,
    ...options,
  };
}

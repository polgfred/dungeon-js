import { createSpellCounts, Player, type Room } from '../../src/dungeon/model.js';
import { Feature, Race, Spell } from '../../src/dungeon/constants.js';

export type PlayerOptions = ConstructorParameters<typeof Player>[0];

export function buildPlayer(options: Partial<PlayerOptions> = {}): Player {
  const defaultSpells = createSpellCounts();
  defaultSpells[Spell.PROTECTION] = 1;
  defaultSpells[Spell.FIREBALL] = 1;
  defaultSpells[Spell.LIGHTNING] = 1;
  defaultSpells[Spell.WEAKEN] = 1;
  defaultSpells[Spell.TELEPORT] = 1;

  return new Player({
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
    weaponName: 'Short sword',
    armorName: 'Leather',
    spells: defaultSpells,
    ...options,
  });
}

export function buildRoom(options: Partial<Room> = {}): Room {
  return {
    feature: Feature.EMPTY,
    monsterLevel: 0,
    monsterVitality: 0,
    treasureId: 0,
    ...options,
  };
}

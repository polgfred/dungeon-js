import { describe, expect, it } from 'vitest';
import { EncounterSession } from '../../src/encounter.js';
import { ARMOR_NAMES, Spell, WEAPON_NAMES } from '../../src/constants.js';
import type { Event } from '../../src/types.js';
import { buildPlayer, buildRoom } from '../helpers/factories.js';
import { ScriptedRng } from '../helpers/rng.js';
import { defaultRandomSource } from '../../src/rng.js';

function eventTexts(events: Event[]): string[] {
  return events.map((event) => event.text);
}

function expectEvent(events: Event[], text: string): void {
  expect(eventTexts(events)).toContain(text);
}

function createSession(options: {
  rng: ScriptedRng;
  playerOverrides?: Parameters<typeof buildPlayer>[0];
  vitality?: number;
  awaitingSpell?: boolean;
}) {
  const monsterLevel = 5;
  const player = buildPlayer(options.playerOverrides);
  const room = buildRoom({
    monsterLevel,
    monsterVitality: options.vitality ?? 12,
  });
  const session = EncounterSession.fromSave({
    rng: options.rng,
    player,
    room,
    save: {
      awaitingSpell: options.awaitingSpell ?? false,
    },
  });

  return { session, player, room };
}

describe('EncounterSession fight loop', () => {
  it('player misses and monster hits', () => {
    const rng = new ScriptedRng({ randint: [90, 90, 3] });
    const { session, player } = createSession({ rng });

    const result = session.step('F');

    expectEvent(result.events, 'The Troll evades your blow!');
    expectEvent(result.events, 'The Troll hits you!');
    expect(player.hp).toBe(14);
    expect(result.done).toBeUndefined();
  });

  it('player hits, monster survives, monster attacks', () => {
    const rng = new ScriptedRng({ randint: [10, 1, 90, 2], random: [0.5] });
    const { session, player } = createSession({ rng, vitality: 12 });

    const result = session.step('F');

    expectEvent(result.events, 'You hit the Troll!');
    expectEvent(result.events, 'The Troll hits you!');
    expect(player.hp).toBe(15);
    expect(result.done).toBeUndefined();
  });

  it('player hits and kills monster, marks defeated', () => {
    const rng = new ScriptedRng({ randint: [10, 1, 7], random: [0.1, 0.1] });
    const { session, player } = createSession({ rng, vitality: 3 });

    const result = session.step('F');

    expectEvent(result.events, 'The foul Troll expires.');
    expect(result.done).toBe(true);
    expect(result.defeatedMonster).toBe(true);
    expect(player.gold).toBe(0);
    expect(player.fatigued).toBe(false);
    expect(player.tempArmorBonus).toBe(0);
  });

  it('weapon breaks on hit', () => {
    const rng = new ScriptedRng({ randint: [10, 1, 10, 2], random: [0.01] });
    const { session, player } = createSession({ rng, vitality: 20 });

    const result = session.step('F');

    expectEvent(result.events, 'Your weapon breaks with the impact!');
    expect(player.weaponTier).toBe(0);
    expect(player.weaponBroken).toBe(true);
    expect(player.weaponName).toBe('Short sword');
  });

  it('monster attack is dodged', () => {
    const rng = new ScriptedRng({ randint: [90, 10] });
    const { session, player } = createSession({ rng });

    const result = session.step('F');

    expectEvent(result.events, 'You deftly dodge the blow!');
    expect(player.hp).toBe(20);
  });

  it('player dies from monster attack', () => {
    const rng = new ScriptedRng({ randint: [90, 90, 4] });
    const { session, player } = createSession({
      rng,
      playerOverrides: { hp: 3, mhp: 3 },
    });

    const result = session.step('F');

    expectEvent(result.events, 'YOU HAVE DIED.');
    expect(result.done).toBe(true);
    expect(player.hp).toBeLessThanOrEqual(0);
  });
});

describe('EncounterSession spells', () => {
  it('rejects spells when IQ is too low', () => {
    const rng = new ScriptedRng();
    const { session, player } = createSession({
      rng,
      playerOverrides: { iq: 10 },
    });

    session.step('S');
    const result = session.step('F');

    expectEvent(result.events, 'You have insufficient intelligence.');
    expect(player.spells[Spell.FIREBALL]).toBe(1);
  });

  it('rejects spells with no charges', () => {
    const rng = new ScriptedRng();
    const { session, player } = createSession({
      rng,
      playerOverrides: {
        iq: 14,
        spells: { ...buildPlayer().spells, [Spell.FIREBALL]: 0 },
      },
    });

    session.step('S');
    const result = session.step('F');

    expectEvent(result.events, 'You know not that spell.');
    expect(player.spells[Spell.FIREBALL]).toBe(0);
  });

  it('casts protection and reduces damage with armor bonus', () => {
    const rng = new ScriptedRng({ randint: [90, 2] });
    const { session, player } = createSession({ rng });

    session.step('S');
    const result = session.step('P');

    expect(player.tempArmorBonus).toBe(3);
    expectEvent(result.events, 'The Troll hits you!');
    expect(player.hp).toBe(18);
  });

  it('casts fireball and applies damage formula', () => {
    // iq 14 → +4; roll 3 → 7 damage; 20 − 7 = 13 vitality remaining.
    const rng = new ScriptedRng({ randint: [3, 10] });
    const { session, room } = createSession({ rng, vitality: 20 });

    session.step('S');
    session.step('F');

    expect(room.monsterVitality).toBe(13);
  });

  it('casts lightning and applies damage formula', () => {
    // iq 14 → +7; roll 6 → 13 damage; 20 − 13 = 7 vitality remaining.
    const rng = new ScriptedRng({ randint: [6, 10] });
    const { session, room } = createSession({ rng, vitality: 20 });

    session.step('S');
    session.step('L');

    expect(room.monsterVitality).toBe(7);
  });

  it('casts weaken and halves vitality', () => {
    const rng = new ScriptedRng({ randint: [10] });
    const { session, room } = createSession({ rng, vitality: 11 });

    session.step('S');
    session.step('W');

    expect(room.monsterVitality).toBe(5);
  });

  // The kill-flavour tests deliberately supply no `random` queue: a spell kill
  // must NOT roll the melee-only desperate attack, or ScriptedRng would throw.
  it('a fireball kill shows the pyrotechnic death, no desperate attack', () => {
    const rng = new ScriptedRng({ randint: [1] }); // fireball roll → 1 + 4 dmg
    const { session } = createSession({ rng, vitality: 3 });

    session.step('S');
    const result = session.step('F');

    expectEvent(
      result.events,
      'The Troll evaporates in a magnificent pyrotechnic display.'
    );
    expect(result.defeatedMonster).toBe(true);
  });

  it('a lightning kill shows the lethal-charge death', () => {
    const rng = new ScriptedRng({ randint: [1] }); // lightning roll → 1 + 7 dmg
    const { session } = createSession({ rng, vitality: 3 });

    session.step('S');
    const result = session.step('L');

    expectEvent(
      result.events,
      'The massive electrical charge proves lethal to the Troll.'
    );
    expect(result.defeatedMonster).toBe(true);
  });

  it('a weaken kill shows the no-surprise death', () => {
    const rng = new ScriptedRng(); // weaken consumes no rng; just halves vitality
    const { session } = createSession({ rng, vitality: 1 });

    session.step('S');
    const result = session.step('W');

    expectEvent(
      result.events,
      'Seeing that the Troll had barely any energy to begin with, its death is no surprise.'
    );
    expect(result.defeatedMonster).toBe(true);
  });

  it('casts teleport and ends encounter', () => {
    const rng = new ScriptedRng();
    const { session, player } = createSession({ rng });

    session.step('S');
    const result = session.step('T');

    expect(result.done).toBe(true);
    expect(result.relocate).toBe(true);
    expect(result.enterRoom).toBe(true);
    expect(player.fatigued).toBe(false);
    expect(player.tempArmorBonus).toBe(0);
  });
});

describe('EncounterSession real RNG bounds', () => {
  it('player damage stays within expected bounds across many hits', () => {
    const targetSamples = 500;
    const rng = defaultRandomSource;
    let samples = 0;
    let iterations = 0;

    while (samples < targetSamples) {
      iterations += 1;
      const str = rng.randint(1, 18);
      const dex = rng.randint(1, 18);
      const weaponTier = rng.randint(0, 3);
      const monsterLevel = rng.randint(1, 10);
      const minDamage = Math.max(weaponTier + Math.floor(str / 3) - 2, 1);
      const maxDamage = weaponTier + Math.floor(str / 3) + 2;
      const room = buildRoom({ monsterLevel, monsterVitality: 999 });
      const session = EncounterSession.fromSave({
        rng,
        player: buildPlayer({
          str,
          dex,
          weaponTier,
          weaponName: WEAPON_NAMES[weaponTier],
        }),
        room,
        save: {
          awaitingSpell: false,
        },
      });

      session.step('F');
      // Only the player's hit changes monster vitality; an unchanged value
      // means the player missed, so there's no damage sample this round.
      const damage = 999 - room.monsterVitality;
      if (damage <= 0) {
        continue;
      }
      expect(damage).toBeGreaterThanOrEqual(minDamage);
      expect(damage).toBeLessThanOrEqual(maxDamage);
      samples += 1;
    }

    expect(samples).toBe(targetSamples);
  });

  it('monster damage stays within expected bounds across many hits', () => {
    const targetSamples = 500;
    const rng = defaultRandomSource;
    let samples = 0;
    let iterations = 0;

    while (samples < targetSamples) {
      iterations += 1;
      const level = rng.randint(1, 10);
      const armor = rng.randint(0, 3);
      const tempArmorBonus = rng.randint(0, 3);
      const totalArmor = armor + tempArmorBonus;
      const minDamage = Math.max(Math.floor(2.5 + level / 3) - totalArmor, 0);
      const maxDamage = Math.max(
        level - 1 + Math.floor(2.5 + level / 3) - totalArmor,
        0
      );
      const player = buildPlayer({
        dex: rng.randint(1, 18),
        armorTier: armor,
        armorName: ARMOR_NAMES[armor],
        tempArmorBonus,
        hp: 999,
        mhp: 999,
        weaponTier: 0,
        weaponName: '(None)',
      });
      const session = EncounterSession.fromSave({
        rng: rng,
        player,
        room: buildRoom({ monsterLevel: level, monsterVitality: 999 }),
        save: {
          awaitingSpell: false,
        },
      });

      session.step('F');
      const damage = 999 - player.hp;
      if (damage <= 0) {
        continue;
      }
      expect(damage).toBeGreaterThanOrEqual(minDamage);
      expect(damage).toBeLessThanOrEqual(maxDamage);
      samples += 1;
    }

    expect(samples).toBe(targetSamples);
  });
});

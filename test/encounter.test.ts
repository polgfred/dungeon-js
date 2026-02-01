import { describe, expect, it } from 'vitest';
import { EncounterSession } from '../src/dungeon/encounter.js';
import { MONSTER_NAMES, Spell } from '../src/dungeon/constants.js';
import type { Event } from '../src/dungeon/types.js';
import { buildPlayer, buildRoom } from './helpers/factories.js';
import { ScriptedRng } from './helpers/rng.js';

function eventTexts(events: Event[]): string[] {
  return events.map((event) => event.text);
}

function expectEvent(events: Event[], text: string): void {
  expect(eventTexts(events)).toContain(text);
}

function createSession(options: {
  rng: ScriptedRng;
  playerOverrides?: Parameters<typeof buildPlayer>[0];
  roomOverrides?: Partial<ReturnType<typeof buildRoom>>;
  vitality?: number;
  awaitingSpell?: boolean;
  debug?: boolean;
}) {
  const monsterLevel = 5;
  const monsterName = MONSTER_NAMES[monsterLevel - 1];
  const player = buildPlayer(options.playerOverrides);
  const room = buildRoom({
    monsterLevel,
    treasureId: 0,
    ...options.roomOverrides,
  });
  const session = EncounterSession.resume({
    rng: options.rng,
    player,
    room,
    debug: options.debug ?? false,
    save: {
      monsterLevel,
      monsterName,
      vitality: options.vitality ?? 12,
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

  it('player hits and kills monster, awards gold', () => {
    const rng = new ScriptedRng({ randint: [10, 1, 7], random: [0.1, 0.1] });
    const { session, player, room } = createSession({ rng, vitality: 3 });

    const result = session.step('F');

    expectEvent(result.events, 'The foul Troll expires.');
    expect(result.done).toBe(true);
    expect(room.monsterLevel).toBe(0);
    expect(player.gold).toBe(32);
    expect(player.fatigued).toBe(false);
    expect(player.tempArmorBonus).toBe(0);
  });

  it('weapon breaks on hit', () => {
    const rng = new ScriptedRng({ randint: [10, 1, 10, 2], random: [0.01] });
    const { session, player } = createSession({ rng, vitality: 20 });

    const result = session.step('F');

    expectEvent(result.events, 'Your weapon breaks with the impact!');
    expect(player.weaponTier).toBe(0);
    expect(player.weaponName).toBe('(None)');
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
    const rng = new ScriptedRng({ randint: [3, 10] });
    const { session } = createSession({ rng, debug: true, vitality: 20 });

    session.step('S');
    const result = session.step('F');

    expectEvent(
      result.events,
      'DEBUG SPELL: fireball_roll=3 iq=14 damage=7 vitality=13'
    );
  });

  it('casts lightning and applies damage formula', () => {
    const rng = new ScriptedRng({ randint: [6, 10] });
    const { session } = createSession({ rng, debug: true, vitality: 20 });

    session.step('S');
    const result = session.step('L');

    expectEvent(
      result.events,
      'DEBUG SPELL: lightning_roll=6 iq=14 damage=13 vitality=7'
    );
  });

  it('casts weaken and halves vitality', () => {
    const rng = new ScriptedRng({ randint: [10] });
    const { session } = createSession({ rng, debug: true, vitality: 11 });

    session.step('S');
    const result = session.step('W');

    expectEvent(result.events, 'DEBUG SPELL: weakened_vitality=5');
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

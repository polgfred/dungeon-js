import { describe, expect, it } from 'vitest';
import { Game } from '../src/dungeon/engine.js';
import { Feature, Mode, Spell } from '../src/dungeon/constants.js';
import { buildPlayer } from './helpers/factories.js';
import { ScriptedRng } from './helpers/rng.js';
import { createEmptyDungeon } from './helpers/dungeon.js';

function setupGame(options: { feature: Feature; rng: ScriptedRng }) {
  const player = buildPlayer({
    z: 0,
    y: 0,
    x: 0,
    hp: 10,
    mhp: 20,
  });
  const game = new Game({ seed: 0, player });
  const dungeon = createEmptyDungeon();
  dungeon.rooms[0][0][0].feature = options.feature;
  game.dungeon = dungeon;
  game.rng = options.rng;
  return { game, player, dungeon };
}

describe('Game interactions', () => {
  it('reads a scroll and gains a spell', () => {
    const rng = new ScriptedRng({ randint: [2] });
    const { game, player, dungeon } = setupGame({
      feature: Feature.SCROLL,
      rng,
    });

    const result = game.step('R');

    expect(result.events[0].text).toBe(
      'The scroll contains the fireball spell.'
    );
    expect(player.spells[Spell.FIREBALL]).toBe(2);
    expect(dungeon.rooms[0][0][0].feature).toBe(Feature.EMPTY);
  });

  it('opens a chest and finds gold', () => {
    const rng = new ScriptedRng({ randint: [5, 7] });
    const { game, player, dungeon } = setupGame({
      feature: Feature.CHEST,
      rng,
    });

    const result = game.step('O');

    expect(result.events[0].text).toBe('You find 17 gold pieces!');
    expect(player.gold).toBe(17);
    expect(dungeon.rooms[0][0][0].feature).toBe(Feature.EMPTY);
  });

  it('looks in a mirror and reveals a treasure location', () => {
    const rng = new ScriptedRng({ randint: [1, 0] });
    const { game, player, dungeon } = setupGame({
      feature: Feature.MIRROR,
      rng,
    });

    dungeon.rooms[0][0][1].treasureId = 1;

    const result = game.step('L');

    expect(result.events[0].text).toBe(
      'You see the Gold Fleece at 1,1,2!'
    );
    expect(player.treasuresFound.size).toBe(0);
    expect(dungeon.rooms[0][0][0].feature).toBe(Feature.EMPTY);
  });

  it('drinks a potion and heals', () => {
    const rng = new ScriptedRng({ randint: [1, 5] });
    const { game, player, dungeon } = setupGame({
      feature: Feature.POTION,
      rng,
    });

    const result = game.step('P');

    expect(result.events[0].text).toBe('You drink the potion...');
    expect(result.events[1].text).toBe('Healing results.');
    expect(player.hp).toBe(20);
    expect(dungeon.rooms[0][0][0].feature).toBe(Feature.EMPTY);
  });

  it('looks in a mirror and gets a cloudy vision when all treasures are found', () => {
    const rng = new ScriptedRng();
    const { game, dungeon } = setupGame({
      feature: Feature.MIRROR,
      rng,
    });
    game.player.treasuresFound = new Set([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);

    const result = game.step('L');

    expect(result.events[0].text).toBe(
      'The mirror is cloudy and yields no vision.'
    );
    expect(dungeon.rooms[0][0][0].feature).toBe(Feature.EMPTY);
  });

  it('opens a chest and destroys armor when the trap triggers', () => {
    const rng = new ScriptedRng({ randint: [1] });
    const { game, player, dungeon } = setupGame({
      feature: Feature.CHEST,
      rng,
    });
    player.armorTier = 1;

    const result = game.step('O');

    expect(result.events[0].text).toBe(
      'The perverse thing explodes as you open it, destroying your armour!'
    );
    expect(player.armorTier).toBe(0);
    expect(dungeon.rooms[0][0][0].feature).toBe(Feature.EMPTY);
  });

  it('opens a chest and dies from the explosion when unarmored', () => {
    const rng = new ScriptedRng({ randint: [1, 2] });
    const { game, player, dungeon } = setupGame({
      feature: Feature.CHEST,
      rng,
    });
    player.armorTier = 0;
    player.hp = 4;

    const result = game.step('O');

    expect(result.mode).toBe(Mode.GAME_OVER);
    expect(result.events[0].text).toBe(
      'The perverse thing explodes as you open it, wounding you!'
    );
    expect(result.events[1].text).toBe('YOU HAVE DIED.');
    expect(dungeon.rooms[0][0][0].feature).toBe(Feature.EMPTY);
  });

  it('drinks a potion and changes an attribute', () => {
    const rng = new ScriptedRng({ randint: [2, 2, 3], random: [0.6] });
    const { game, player, dungeon } = setupGame({
      feature: Feature.POTION,
      rng,
    });

    const result = game.step('P');

    expect(result.events[0].text).toBe('You drink the potion...');
    expect(result.events[1].text).toBe('The potion makes you dumber.');
    expect(player.iq).toBe(11);
    expect(dungeon.rooms[0][0][0].feature).toBe(Feature.EMPTY);
  });
});

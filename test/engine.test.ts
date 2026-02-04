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
  describe('scrolls', () => {
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
  });

  describe('chests', () => {
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
  });

  describe('mirrors', () => {
    it('looks in a mirror and reveals a treasure location', () => {
      const rng = new ScriptedRng({ randint: [1, 0] });
      const { game, player, dungeon } = setupGame({
        feature: Feature.MIRROR,
        rng,
      });

      dungeon.rooms[0][0][1].treasureId = 1;

      const result = game.step('L');

      expect(result.events[0].text).toBe('You see the Gold Fleece at 1,1,2!');
      expect(player.treasuresFound.size).toBe(0);
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
  });

  describe('potions', () => {
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

  describe('encounter handoff', () => {
    function setupEncounter(options: {
      monsterLevel: number;
      treasureId?: number;
      rng: ScriptedRng;
      playerOverrides?: Parameters<typeof buildPlayer>[0];
    }) {
      const player = buildPlayer({
        z: 0,
        y: 0,
        x: 0,
        hp: 10,
        mhp: 20,
        ...options.playerOverrides,
      });
      const game = new Game({ seed: 0, player });
      const dungeon = createEmptyDungeon();
      dungeon.rooms[0][0][0].monsterLevel = options.monsterLevel;
      dungeon.rooms[0][0][0].treasureId = options.treasureId ?? 0;
      game.dungeon = dungeon;
      game.rng = options.rng;
      game.startEvents();
      return { game, player, dungeon };
    }

    it('enters GAME_OVER when player dies in encounter', () => {
      const rng = new ScriptedRng({ randint: [0, 90, 90, 0] });
      const { game, dungeon } = setupEncounter({
        monsterLevel: 1,
        rng,
        playerOverrides: { hp: 1, mhp: 1, dex: 1 },
      });

      const result = game.step('F');

      expect(result.mode).toBe(Mode.GAME_OVER);
      expect(dungeon.rooms[0][0][0].monsterLevel).toBe(1);
    });

    it('awards treasure and clears room monster after defeating it', () => {
      const rng = new ScriptedRng({
        randint: [0, 10, 4],
        random: [0.1],
      });
      const { game, player, dungeon } = setupEncounter({
        monsterLevel: 1,
        treasureId: 1,
        rng,
      });

      const result = game.step('F');

      expect(result.mode).toBe(Mode.EXPLORE);
      expect(dungeon.rooms[0][0][0].monsterLevel).toBe(0);
      expect(dungeon.rooms[0][0][0].treasureId).toBe(0);
      expect(player.treasuresFound.has(1)).toBe(true);
    });

    it('relocates on successful run', () => {
      const rng = new ScriptedRng({
        randint: [0, 1, 2],
        random: [0.1],
      });
      const { game, player } = setupEncounter({
        monsterLevel: 1,
        rng,
      });

      const result = game.step('R');

      expect(result.mode).toBe(Mode.EXPLORE);
      expect(player.y).toBe(1);
      expect(player.x).toBe(2);
    });

    it('stays in encounter mode when relocation lands in another monster room', () => {
      const rng = new ScriptedRng({
        randint: [0, 1, 1, 0],
        random: [0.1],
      });
      const { game, dungeon } = setupEncounter({
        monsterLevel: 1,
        rng,
      });
      dungeon.rooms[0][1][1].monsterLevel = 2;

      const result = game.step('R');

      expect(result.mode).toBe(Mode.ENCOUNTER);
      expect(result.events.some((event) => event.kind === 'COMBAT')).toBe(true);
    });

    it('relocates on teleport without clearing monster room', () => {
      const rng = new ScriptedRng({ randint: [0, 3, 4] });
      const { game, player, dungeon } = setupEncounter({
        monsterLevel: 1,
        rng,
      });

      game.step('S');
      const result = game.step('T');

      expect(result.mode).toBe(Mode.EXPLORE);
      expect(player.y).toBe(3);
      expect(player.x).toBe(4);
      expect(dungeon.rooms[0][0][0].monsterLevel).toBe(1);
    });
  });

  describe('save rehydration mode', () => {
    it('restores GAME_OVER and VICTORY from serialized mode', () => {
      const losePlayer = buildPlayer({ z: 0, y: 0, x: 0 });
      const loseGame = new Game({ seed: 0, player: losePlayer });
      const loseDungeon = createEmptyDungeon();
      loseDungeon.rooms[0][0][0].feature = Feature.EXIT;
      loseGame.dungeon = loseDungeon;
      expect(loseGame.step('X').mode).toBe(Mode.GAME_OVER);

      const winPlayer = buildPlayer({ z: 0, y: 0, x: 0 });
      winPlayer.treasuresFound = new Set([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
      const winGame = new Game({ seed: 0, player: winPlayer });
      const winDungeon = createEmptyDungeon();
      winDungeon.rooms[0][0][0].feature = Feature.EXIT;
      winGame.dungeon = winDungeon;
      expect(winGame.step('X').mode).toBe(Mode.VICTORY);

      const resumedLose = Game.fromSave(loseGame.toSave());
      const resumedWin = Game.fromSave(winGame.toSave());
      expect(resumedLose.mode).toBe(Mode.GAME_OVER);
      expect(resumedWin.mode).toBe(Mode.VICTORY);
    });

    it('ignores stale non-terminal mode and derives from session state', () => {
      const player = buildPlayer({ z: 0, y: 0, x: 0 });
      const game = new Game({ seed: 0, player });
      const dungeon = createEmptyDungeon();
      dungeon.rooms[0][0][0].monsterLevel = 1;
      game.dungeon = dungeon;
      game.startEvents();

      const encounterSave = game.toSave();
      encounterSave.mode = Mode.EXPLORE;
      expect(encounterSave.encounter).not.toBeNull();
      const resumedEncounter = Game.fromSave(encounterSave);
      expect(resumedEncounter.mode).toBe(Mode.ENCOUNTER);

      const exploreSave = game.toSave();
      exploreSave.mode = Mode.ENCOUNTER;
      exploreSave.encounter = null;
      const resumedExplore = Game.fromSave(exploreSave);
      expect(resumedExplore.mode).toBe(Mode.EXPLORE);
    });

    it('resumes in encounter spell selection with spell prompt events', () => {
      const player = buildPlayer({ z: 0, y: 0, x: 0 });
      const game = new Game({ seed: 0, player });
      const dungeon = createEmptyDungeon();
      dungeon.rooms[0][0][0].monsterLevel = 1;
      game.dungeon = dungeon;
      game.rng = new ScriptedRng({ randint: [0] });
      game.startEvents();
      game.step('S');

      const resumed = Game.fromSave(game.toSave());
      const events = resumed.resumeEvents();
      const promptEvent = events.find((event) => event.kind === 'PROMPT');

      expect(resumed.mode).toBe(Mode.ENCOUNTER);
      expect(events).toHaveLength(1);
      expect(promptEvent?.text).toBe('Choose a spell:');
      expect(promptEvent?.data?.hasCancel).toBe(true);
      expect(promptEvent?.data?.options).toHaveLength(5);
    });

    it('resumes in vendor item selection with vendor intro and item prompt', () => {
      const player = buildPlayer({ z: 0, y: 0, x: 0, gold: 100 });
      const game = new Game({ seed: 0, player });
      const dungeon = createEmptyDungeon();
      dungeon.rooms[0][0][0].feature = Feature.VENDOR;
      game.dungeon = dungeon;
      game.step('B');
      game.step('W');

      const resumed = Game.fromSave(game.toSave());
      const events = resumed.resumeEvents();
      const promptEvent = events.find((event) => event.kind === 'PROMPT');

      expect(events).toHaveLength(2);
      expect(events[0]).toMatchObject({
        kind: 'INFO',
        text: 'There is a vendor here. Do you wish to purchase something?',
      });
      expect(promptEvent?.text).toBe('Choose a weapon:');
      expect(promptEvent?.data?.hasCancel).toBe(true);
      expect(promptEvent?.data?.options).toHaveLength(3);
    });

    it('throws when save version is missing', () => {
      const game = new Game({ seed: 0, player: buildPlayer() });
      const save = game.toSave() as Record<string, unknown>;
      delete save.version;

      expect(() => Game.fromSave(save as never)).toThrow(
        'Save file is missing a valid version.'
      );
    });

    it('throws when save version does not match', () => {
      const game = new Game({ seed: 0, player: buildPlayer() });
      const save = game.toSave();
      save.version = Game.SAVE_VERSION + 1;

      expect(() => Game.fromSave(save)).toThrow('Unsupported save version');
    });
  });
});

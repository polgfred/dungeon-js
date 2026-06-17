import { describe, expect, it } from 'vitest';
import { Game } from '../../src/engine.js';
import { Feature, MapTile, Mode, Spell } from '../../src/constants.js';
import { buildPlayer } from '../helpers/factories.js';
import { ScriptedRng } from '../helpers/rng.js';
import { createEmptyDungeon } from '../helpers/dungeon.js';

const ID = 'p1';

function setupGame(options: { feature: Feature; rng: ScriptedRng }) {
  const player = buildPlayer({
    z: 0,
    y: 0,
    x: 0,
    hp: 10,
    mhp: 20,
  });
  const game = new Game();
  game.addPlayer(ID, player);
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

      const result = game.step(ID, 'R');

      expect(result.playerId).toBe(ID);
      expect(result.events[0].text).toBe(
        'The scroll contains the fireball spell.'
      );
      expect(player.spells[Spell.FIREBALL]).toBe(2);
      expect(dungeon.rooms[0][0][0].feature).toBe(Feature.EMPTY);
    });
  });

  describe('chests', () => {
    it('opens a chest and finds gold', () => {
      const rng = new ScriptedRng({ random: [0.5], randint: [7] });
      const { game, player, dungeon } = setupGame({
        feature: Feature.CHEST,
        rng,
      });

      const result = game.step(ID, 'O');

      expect(result.events[0].text).toBe('You find 17 gold pieces!');
      expect(player.gold).toBe(17);
      expect(dungeon.rooms[0][0][0].feature).toBe(Feature.EMPTY);
    });

    it('opens a chest and destroys armor when the trap triggers', () => {
      const rng = new ScriptedRng({ random: [0.05] });
      const { game, player, dungeon } = setupGame({
        feature: Feature.CHEST,
        rng,
      });
      player.armorTier = 1;

      const result = game.step(ID, 'O');

      expect(result.events[0].text).toBe(
        'The perverse thing explodes as you open it, destroying your armour!'
      );
      expect(player.armorTier).toBe(0);
      expect(dungeon.rooms[0][0][0].feature).toBe(Feature.EMPTY);
    });

    it('opens a chest and dies from the explosion when unarmored', () => {
      const rng = new ScriptedRng({ random: [0.05], randint: [2] });
      const { game, player, dungeon } = setupGame({
        feature: Feature.CHEST,
        rng,
      });
      player.armorTier = 0;
      player.hp = 4;

      const result = game.step(ID, 'O');

      expect(result.mode).toBe(Mode.GAME_OVER);
      expect(result.events[0].text).toBe(
        'The perverse thing explodes as you open it, killing you!'
      );
      expect(result.events[1].text).toBe('YOU HAVE DIED.');
      expect(dungeon.rooms[0][0][0].feature).toBe(Feature.EMPTY);
    });

    it('opens a chest and is wounded but survives when unarmored', () => {
      const rng = new ScriptedRng({ random: [0.05], randint: [2] });
      const { game, player, dungeon } = setupGame({
        feature: Feature.CHEST,
        rng,
      });
      player.armorTier = 0;
      player.hp = 10;

      const result = game.step(ID, 'O');

      expect(result.mode).toBe(Mode.EXPLORE);
      expect(result.events[0].text).toBe(
        'The perverse thing explodes as you open it, wounding you!'
      );
      expect(player.hp).toBe(5);
      expect(dungeon.rooms[0][0][0].feature).toBe(Feature.EMPTY);
    });

    it('clears the chest from the map even when it contains nothing', () => {
      // 0.1 <= rand < 0.4 is the "naught" branch, which returns early — the
      // observed tile must still refresh, or the chest lingers on the map.
      const rng = new ScriptedRng({ random: [0.2] });
      const { game } = setupGame({ feature: Feature.CHEST, rng });

      game.startEvents(ID); // observe the room: the chest is on the map
      expect(game.mapView(ID)[0][0]).toBe(Feature.CHEST);

      const result = game.step(ID, 'O');
      expect(result.events[0].text).toBe('It containeth naught.');
      expect(game.mapView(ID)[0][0]).toBe(Feature.EMPTY);
    });
  });

  describe('mirrors', () => {
    it('looks in a mirror and reveals a treasure location', () => {
      const rng = new ScriptedRng({ randint: [1, 1] });
      const { game, dungeon } = setupGame({
        feature: Feature.MIRROR,
        rng,
      });

      dungeon.rooms[0][0][1].treasureId = 1;

      const result = game.step(ID, 'L');

      expect(result.events[0].text).toBe('You see the Gold Fleece at 1,1,2!');
      expect(game.treasuresFound.size).toBe(0);
      expect(dungeon.rooms[0][0][0].feature).toBe(Feature.EMPTY);
    });

    it('looks in a mirror and gets a random vision when all treasures are found', () => {
      const rng = new ScriptedRng({ randint: [0] });
      const { game, dungeon } = setupGame({
        feature: Feature.MIRROR,
        rng,
      });
      game.treasuresFound = new Set([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);

      const result = game.step(ID, 'L');

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

      const result = game.step(ID, 'P');

      expect(result.events[0].text).toBe('You drink the potion...');
      expect(result.events[1].text).toBe('Healing results.');
      expect(player.hp).toBe(20);
      expect(dungeon.rooms[0][0][0].feature).toBe(Feature.EMPTY);
    });

    it('clears the potion from the map when it only heals', () => {
      // roll === 1 is the healing branch, which returns early — the observed
      // tile must still refresh, or the drained potion lingers on the map.
      const rng = new ScriptedRng({ randint: [1, 5] });
      const { game } = setupGame({ feature: Feature.POTION, rng });

      game.startEvents(ID); // observe the room: the potion is on the map
      expect(game.mapView(ID)[0][0]).toBe(Feature.POTION);

      game.step(ID, 'P');
      expect(game.mapView(ID)[0][0]).toBe(Feature.EMPTY);
    });

    it('drinks a potion and changes an attribute', () => {
      const rng = new ScriptedRng({ randint: [2, 2, 3], random: [0.6] });
      const { game, player, dungeon } = setupGame({
        feature: Feature.POTION,
        rng,
      });

      const result = game.step(ID, 'P');

      expect(result.events[0].text).toBe('You drink the potion...');
      expect(result.events[1].text).toBe('The potion makes you dumber.');
      expect(player.iq).toBe(11);
      expect(dungeon.rooms[0][0][0].feature).toBe(Feature.EMPTY);
    });

    it('drinks an MHP potion and increases max HP by double', () => {
      const rng = new ScriptedRng({ randint: [2, 3, 3], random: [0.4] });
      const { game, player, dungeon } = setupGame({
        feature: Feature.POTION,
        rng,
      });

      const result = game.step(ID, 'P');

      expect(result.events[0].text).toBe('You drink the potion...');
      expect(result.events[1].text).toBe('Strange energies surge through you.');
      expect(player.mhp).toBe(26);
      expect(player.hp).toBe(16);
      expect(dungeon.rooms[0][0][0].feature).toBe(Feature.EMPTY);
    });

    it('drinks an MHP potion and decreases max HP by double', () => {
      const rng = new ScriptedRng({ randint: [2, 3, 3], random: [0.6] });
      const { game, player, dungeon } = setupGame({
        feature: Feature.POTION,
        rng,
      });

      const result = game.step(ID, 'P');

      expect(result.events[0].text).toBe('You drink the potion...');
      expect(result.events[1].text).toBe('You feel weaker.');
      expect(player.mhp).toBe(14);
      expect(player.hp).toBe(4);
      expect(dungeon.rooms[0][0][0].feature).toBe(Feature.EMPTY);
    });
  });

  describe('thief', () => {
    it('damages a player with no gold and kills him', () => {
      const rng = new ScriptedRng({ randint: [4] });
      const { game, player, dungeon } = setupGame({
        feature: Feature.THIEF,
        rng,
      });

      player.hp = 4;
      const result = game.startEvents(ID);

      expect(result[0].text).toBe(
        'A thief sneaks from the shadows and attacks you!'
      );
      expect(player.hp).toBe(0);
      expect(result[1].text).toBe('YOU HAVE DIED.');
      expect(game.mode(ID)).toBe(Mode.GAME_OVER);
      expect(dungeon.rooms[0][0][0].feature).toBe(Feature.EMPTY);
    });

    it('steals gold if player has gold', () => {
      const rng = new ScriptedRng({ randint: [3] });
      const { game, player, dungeon } = setupGame({
        feature: Feature.THIEF,
        rng,
      });

      player.gold = 10;
      const result = game.startEvents(ID);

      expect(result[0].text).toBe(
        'A thief sneaks from the shadows and removes 3 gold pieces from your possession.'
      );
      expect(player.gold).toBe(7);
      expect(player.hp).toBe(10);
      expect(game.mode(ID)).toBe(Mode.EXPLORE);
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
      const game = new Game();
      game.addPlayer(ID, player);
      const dungeon = createEmptyDungeon();
      dungeon.rooms[0][0][0].monsterLevel = options.monsterLevel;
      dungeon.rooms[0][0][0].treasureId = options.treasureId ?? 0;
      game.dungeon = dungeon;
      game.rng = options.rng;
      game.startEvents(ID);
      return { game, player, dungeon };
    }

    it('enters GAME_OVER when player dies in encounter', () => {
      const rng = new ScriptedRng({ randint: [0, 90, 90, 0] });
      const { game, dungeon } = setupEncounter({
        monsterLevel: 1,
        rng,
        playerOverrides: { hp: 1, mhp: 1, dex: 1 },
      });

      const result = game.step(ID, 'F');

      expect(result.mode).toBe(Mode.GAME_OVER);
      expect(dungeon.rooms[0][0][0].monsterLevel).toBe(1);
    });

    it('awards treasure and clears room monster after defeating it', () => {
      const rng = new ScriptedRng({
        randint: [0, 10, 4],
        random: [0.1],
      });
      const { game, dungeon } = setupEncounter({
        treasureId: 1,
        monsterLevel: 1,
        rng,
      });

      const result = game.step(ID, 'F');

      expect(result.mode).toBe(Mode.EXPLORE);
      expect(dungeon.rooms[0][0][0].monsterLevel).toBe(0);
      expect(dungeon.rooms[0][0][0].treasureId).toBe(0);
      expect(game.treasuresFound.has(1)).toBe(true);
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

      const result = game.step(ID, 'R');

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

      const result = game.step(ID, 'R');

      expect(result.mode).toBe(Mode.ENCOUNTER);
      expect(result.events.some((event) => event.kind === 'COMBAT')).toBe(true);
    });

    it('relocates on teleport without clearing monster room', () => {
      const rng = new ScriptedRng({ randint: [0, 3, 4] });
      const { game, player, dungeon } = setupEncounter({
        monsterLevel: 1,
        rng,
      });

      game.step(ID, 'S');
      const result = game.step(ID, 'T');

      expect(result.mode).toBe(Mode.EXPLORE);
      expect(player.y).toBe(3);
      expect(player.x).toBe(4);
      expect(dungeon.rooms[0][0][0].monsterLevel).toBe(1);
    });
  });

  describe('party end state', () => {
    function twoPlayerGame() {
      const a = buildPlayer({ z: 0, y: 0, x: 0, hp: 4 });
      const b = buildPlayer({ z: 0, y: 0, x: 0 });
      const game = new Game();
      game.addPlayer('a', a);
      game.addPlayer('b', b);
      const dungeon = createEmptyDungeon();
      game.dungeon = dungeon;
      return { game, dungeon };
    }

    it('ends the game for the whole party when any one player dies', () => {
      const { game, dungeon } = twoPlayerGame();
      dungeon.rooms[0][0][0].feature = Feature.THIEF;
      game.rng = new ScriptedRng({ randint: [4] });

      game.startEvents('a');

      expect(game.mode('a')).toBe(Mode.GAME_OVER);
      expect(game.mode('b')).toBe(Mode.GAME_OVER);
    });

    it('blocks the exit until every treasure is found, without losing', () => {
      const { game, dungeon } = twoPlayerGame();
      dungeon.rooms[0][0][0].feature = Feature.EXIT;

      const result = game.step('a', 'X');

      expect(result.mode).toBe(Mode.EXPLORE);
      expect(game.mode('a')).toBe(Mode.EXPLORE);
    });

    it('declares victory only once the last player has exited', () => {
      const { game, dungeon } = twoPlayerGame();
      dungeon.rooms[0][0][0].feature = Feature.EXIT;
      game.treasuresFound = new Set([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);

      const first = game.step('a', 'X');
      expect(first.mode).not.toBe(Mode.VICTORY);
      expect(game.mode('b')).toBe(Mode.EXPLORE);

      const last = game.step('b', 'X');
      expect(last.mode).toBe(Mode.VICTORY);
      expect(game.mode('a')).toBe(Mode.VICTORY);
    });

    it('clears the encounter for every co-fighter the instant the monster dies', () => {
      const a = buildPlayer({ z: 0, y: 0, x: 0 });
      const b = buildPlayer({ z: 0, y: 0, x: 0 });
      const game = new Game();
      game.addPlayer('a', a);
      game.addPlayer('b', b);
      const dungeon = createEmptyDungeon();
      dungeon.rooms[0][0][0].monsterLevel = 1;
      game.dungeon = dungeon;
      // vitality roll (a enters) = 3; attack roll hits; damage 4 kills; no dying
      // attack; then a gold roll for the loot.
      game.rng = new ScriptedRng({ randint: [0, 1, 0, 5], random: [0.1] });

      game.startEvents('a');
      game.startEvents('b');
      expect(game.mode('a')).toBe(Mode.ENCOUNTER);
      expect(game.mode('b')).toBe(Mode.ENCOUNTER);

      game.step('a', 'F');

      // b never acted, but is dropped out of combat immediately.
      expect(game.mode('a')).toBe(Mode.EXPLORE);
      expect(game.mode('b')).toBe(Mode.EXPLORE);
    });

    it('broadcasts treasure-found and monster-slain to the whole party', () => {
      const player = buildPlayer({ z: 0, y: 0, x: 0 });
      const game = new Game();
      game.addPlayer(ID, player);
      const dungeon = createEmptyDungeon();
      dungeon.rooms[0][0][0].monsterLevel = 1;
      dungeon.rooms[0][0][0].treasureId = 1;
      game.dungeon = dungeon;
      game.rng = new ScriptedRng({ randint: [0, 1, 0], random: [0.1] });
      game.startEvents(ID);

      const result = game.step(ID, 'F');

      // Each party-wide moment is emitted as a pair (actor copy + broadcast
      // copy); the broadcast copy is the one teammates receive.
      const slain = result.events.filter(
        (event) => event.text === 'The foul Skeleton expires.'
      );
      const found = result.events.filter(
        (event) => event.text === 'You find the Gold Fleece!'
      );
      expect(slain.some((event) => event.broadcast)).toBe(true);
      expect(found.some((event) => event.broadcast)).toBe(true);
    });
  });

  describe('save rehydration mode', () => {
    it('restores GAME_OVER and VICTORY from serialized end state', () => {
      const losePlayer = buildPlayer({ z: 0, y: 0, x: 0, hp: 4 });
      const loseGame = new Game();
      loseGame.addPlayer(ID, losePlayer);
      const loseDungeon = createEmptyDungeon();
      loseDungeon.rooms[0][0][0].feature = Feature.THIEF;
      loseGame.dungeon = loseDungeon;
      loseGame.rng = new ScriptedRng({ randint: [4] });
      loseGame.startEvents(ID);
      expect(loseGame.mode(ID)).toBe(Mode.GAME_OVER);

      const winPlayer = buildPlayer({ z: 0, y: 0, x: 0 });
      const winGame = new Game();
      winGame.addPlayer(ID, winPlayer);
      winGame.treasuresFound = new Set([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
      const winDungeon = createEmptyDungeon();
      winDungeon.rooms[0][0][0].feature = Feature.EXIT;
      winGame.dungeon = winDungeon;
      expect(winGame.step(ID, 'X').mode).toBe(Mode.VICTORY);

      const resumedLose = Game.fromSave(loseGame.toSave());
      const resumedWin = Game.fromSave(winGame.toSave());
      expect(resumedLose.mode(ID)).toBe(Mode.GAME_OVER);
      expect(resumedWin.mode(ID)).toBe(Mode.VICTORY);
    });

    it('derives mode from per-player encounter session, not a stored mode', () => {
      const player = buildPlayer({ z: 0, y: 0, x: 0 });
      const game = new Game();
      game.addPlayer(ID, player);
      const dungeon = createEmptyDungeon();
      dungeon.rooms[0][0][0].monsterLevel = 1;
      game.dungeon = dungeon;
      game.startEvents(ID);

      const encounterSave = game.toSave();
      expect(encounterSave.players[0].encounter).not.toBeNull();
      const resumedEncounter = Game.fromSave(encounterSave);
      expect(resumedEncounter.mode(ID)).toBe(Mode.ENCOUNTER);

      const exploreSave = game.toSave();
      exploreSave.players[0].encounter = null;
      const resumedExplore = Game.fromSave(exploreSave);
      expect(resumedExplore.mode(ID)).toBe(Mode.EXPLORE);
    });

    it('resumes in encounter spell selection with spell prompt events', () => {
      const player = buildPlayer({ z: 0, y: 0, x: 0 });
      const game = new Game();
      game.addPlayer(ID, player);
      const dungeon = createEmptyDungeon();
      dungeon.rooms[0][0][0].monsterLevel = 1;
      game.dungeon = dungeon;
      game.rng = new ScriptedRng({ randint: [0] });
      game.startEvents(ID);
      game.step(ID, 'S');

      const resumed = Game.fromSave(game.toSave());
      const events = resumed.resumeEvents(ID);
      const promptEvent = events.find((event) => event.kind === 'PROMPT');

      expect(resumed.mode(ID)).toBe(Mode.ENCOUNTER);
      expect(events).toHaveLength(1);
      expect(promptEvent?.text).toBe('Choose a spell:');
      expect(promptEvent?.data?.hasCancel).toBe(true);
      expect(promptEvent?.data?.options).toHaveLength(5);
    });

    it('resumes in vendor item selection with vendor intro and item prompt', () => {
      const player = buildPlayer({ z: 0, y: 0, x: 0, gold: 100 });
      const game = new Game();
      game.addPlayer(ID, player);
      const dungeon = createEmptyDungeon();
      dungeon.rooms[0][0][0].feature = Feature.VENDOR;
      game.dungeon = dungeon;
      game.step(ID, 'B');
      game.step(ID, 'W');

      const resumed = Game.fromSave(game.toSave());
      const events = resumed.resumeEvents(ID);
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
      const game = new Game();
      game.addPlayer(ID, buildPlayer());
      const save = game.toSave() as Record<string, unknown>;
      delete save.version;

      expect(() => Game.fromSave(save as never)).toThrow(
        'Save file is missing a valid version.'
      );
    });

    it('throws when save version does not match', () => {
      const game = new Game();
      game.addPlayer(ID, buildPlayer());
      const save = game.toSave();
      save.version = Game.SAVE_VERSION + 1;

      expect(() => Game.fromSave(save)).toThrow('Unsupported save version');
    });
  });

  describe('per-player map memory', () => {
    it('refreshes every co-fighter in the room the instant the monster dies', () => {
      const a = buildPlayer({ z: 0, y: 0, x: 0 });
      const b = buildPlayer({ z: 0, y: 0, x: 0 });
      const game = new Game();
      game.addPlayer('a', a);
      game.addPlayer('b', b);
      const dungeon = createEmptyDungeon();
      dungeon.rooms[0][0][0].monsterLevel = 1;
      game.dungeon = dungeon;
      // a enters (vitality 0), then a's attack kills (1, 0) and loots gold (5).
      game.rng = new ScriptedRng({ randint: [0, 1, 0, 5], random: [0.1] });

      game.startEvents('a');
      game.startEvents('b');
      expect(game.mapView('a')[0][0]).toBe(MapTile.MONSTER);
      expect(game.mapView('b')[0][0]).toBe(MapTile.MONSTER);

      game.step('a', 'F');

      // b never acted, but watched it die from the same room — both tiles clear.
      expect(game.mapView('a')[0][0]).toBe(Feature.EMPTY);
      expect(game.mapView('b')[0][0]).toBe(Feature.EMPTY);
    });

    it('re-scouts a stale tile when a flare relights a cleared room', () => {
      const a = buildPlayer({ z: 0, y: 0, x: 1 });
      const b = buildPlayer({ z: 0, y: 0, x: 0, flares: 5 });
      const game = new Game();
      game.addPlayer('a', a);
      game.addPlayer('b', b);
      const dungeon = createEmptyDungeon();
      dungeon.rooms[0][0][1].monsterLevel = 1;
      game.dungeon = dungeon;
      game.rng = new ScriptedRng({ randint: [0, 1, 0, 5], random: [0.1] });

      game.startEvents('a');
      game.startEvents('b');

      // b flares from the doorway and sees the monster next door.
      game.step('b', 'F');
      expect(game.mapView('b')[0][1]).toBe(MapTile.MONSTER);

      // a clears the room; b's memory is now stale.
      game.step('a', 'F');
      expect(game.mapView('b')[0][1]).toBe(MapTile.MONSTER);

      // a second flare overwrites the stale tile with current truth.
      game.step('b', 'F');
      expect(game.mapView('b')[0][1]).toBe(Feature.EMPTY);
    });
  });
});

describe('Party setup', () => {
  function roster(count: number) {
    return Array.from({ length: count }, (_, i) => ({
      id: `p${i}`,
      player: buildPlayer({ z: 0, y: 3, x: 3 }),
    }));
  }

  it('deepens the dungeon for a larger party', () => {
    expect(new Game().depth).toBe(7);
    expect(new Game({ players: roster(2) }).depth).toBe(9);
    expect(new Game({ players: roster(4) }).depth).toBe(13);
  });

  it('keeps a solo adventurer at their character start', () => {
    const a = buildPlayer({ z: 0, y: 3, x: 3 });
    const game = new Game({
      dungeon: createEmptyDungeon(),
      players: [{ id: ID, player: a }],
    });
    expect({ y: a.y, x: a.x }).toEqual({ y: 3, x: 3 });
  });

  it('scatters a party across distinct first-floor rooms', () => {
    const rng = new ScriptedRng({ randint: [1, 2, 5, 6] });
    const a = buildPlayer({ z: 0, y: 3, x: 3 });
    const b = buildPlayer({ z: 0, y: 3, x: 3 });
    new Game({
      dungeon: createEmptyDungeon(),
      rng,
      players: [
        { id: 'a', player: a },
        { id: 'b', player: b },
      ],
    });

    expect({ z: a.z, y: a.y, x: a.x }).toEqual({ z: 0, y: 1, x: 2 });
    expect({ z: b.z, y: b.y, x: b.x }).toEqual({ z: 0, y: 5, x: 6 });
  });

  it('re-rolls when a scattered start collides with an earlier one', () => {
    // a -> (1,2); b rolls (1,2) first (taken), then (3,4).
    const rng = new ScriptedRng({ randint: [1, 2, 1, 2, 3, 4] });
    const a = buildPlayer({ z: 0, y: 3, x: 3 });
    const b = buildPlayer({ z: 0, y: 3, x: 3 });
    new Game({
      dungeon: createEmptyDungeon(),
      rng,
      players: [
        { id: 'a', player: a },
        { id: 'b', player: b },
      ],
    });

    expect({ y: a.y, x: a.x }).toEqual({ y: 1, x: 2 });
    expect({ y: b.y, x: b.x }).toEqual({ y: 3, x: 4 });
  });
});

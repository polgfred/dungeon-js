import {
  ARMOR_NAMES,
  EXPLORE_COMMANDS,
  Feature,
  MapTile,
  Mode,
  monsterName,
  spellName,
  treasureName,
  type Spell,
  type Tile,
} from './constants.js';
import { EncounterSession, rollMonsterVitality } from './encounter.js';
import { generateDungeon } from './generation.js';
import { applyAttributeChange } from './model.js';
import type { Dungeon, Player, Room } from './model.js';
import {
  type GameSave,
  type EncounterSave,
  deserializeDungeon,
  serializeDungeon,
} from './serialization.js';
import {
  Event,
  type PlayerId,
  type PromptEvent,
  type StepResult,
} from './types.js';
import { VendorSession } from './vendor.js';
import { defaultRandomSource, type RandomSource } from './rng.js';
import {
  drinkAttributePotionEvents,
  drinkHealingPotionEvents,
} from './potions.js';

function pluralize(count: number, singular: string, plural = `${singular}s`) {
  return count === 1 ? singular : plural;
}

export interface PlayerState {
  readonly id: PlayerId;
  player: Player;
  observed: Tile[][][];
  encounter: EncounterSession | null;
  vendor: VendorSession | null;
  exited: boolean;
}

function createObservedGrid(): Tile[][][] {
  return Array.from({ length: Game.SIZE }, () =>
    Array.from({ length: Game.SIZE }, () =>
      Array.from({ length: Game.SIZE }, () => MapTile.UNSEEN as Tile)
    )
  );
}

export class Game {
  static readonly SIZE = 7;
  static readonly SAVE_VERSION = 5;

  saveVersion = Game.SAVE_VERSION;
  rng: RandomSource;
  dungeon: Dungeon;
  treasuresFound: Set<number>;
  endMode: Mode.GAME_OVER | Mode.VICTORY | null = null;
  private players: Map<PlayerId, PlayerState> = new Map();

  constructor(options: {
    rng?: RandomSource | null;
    dungeon?: Dungeon;
    treasuresFound?: Set<number>;
  } = {}) {
    this.rng = options.rng ?? defaultRandomSource;
    this.dungeon = options.dungeon ?? generateDungeon(this.rng);
    this.treasuresFound = options.treasuresFound ?? new Set<number>();
  }

  addPlayer(id: PlayerId, player: Player): PlayerState {
    const state: PlayerState = {
      id,
      player,
      observed: createObservedGrid(),
      encounter: null,
      vendor: null,
      exited: false,
    };
    this.players.set(id, state);
    return state;
  }

  removePlayer(id: PlayerId): void {
    this.players.delete(id);
  }

  hasPlayer(id: PlayerId): boolean {
    return this.players.has(id);
  }

  get playerIds(): PlayerId[] {
    return [...this.players.keys()];
  }

  getPlayer(id: PlayerId): Player {
    return this.state(id).player;
  }

  private state(id: PlayerId): PlayerState {
    const state = this.players.get(id);
    if (!state) {
      throw new Error(`Unknown player: ${id}`);
    }
    return state;
  }

  mode(id: PlayerId): Mode {
    if (this.endMode) {
      return this.endMode;
    }

    const state = this.state(id);
    if (state.encounter) {
      return Mode.ENCOUNTER;
    }
    return Mode.EXPLORE;
  }

  static fromSave(
    save: GameSave,
    rng: RandomSource = defaultRandomSource
  ): Game {
    if (typeof save.version !== 'number' || !Number.isInteger(save.version)) {
      throw new Error('Save file is missing a valid version.');
    }
    if (save.version !== Game.SAVE_VERSION) {
      throw new Error(
        `Unsupported save version ${save.version}. Expected ${Game.SAVE_VERSION}.`
      );
    }
    const dungeon = deserializeDungeon(save.dungeon);
    const game = new Game({
      rng,
      dungeon,
      treasuresFound: new Set(save.treasuresFound),
    });
    game.saveVersion = save.version;
    game.endMode =
      save.endMode === Mode.GAME_OVER || save.endMode === Mode.VICTORY
        ? save.endMode
        : null;

    for (const entry of save.players) {
      const { player } = entry;
      const state: PlayerState = {
        id: entry.id,
        player,
        observed: entry.observed,
        encounter: null,
        vendor: null,
        exited: entry.exited,
      };
      if (entry.encounter) {
        state.encounter = EncounterSession.fromSave({
          rng,
          player,
          room: dungeon.rooms[player.z][player.y][player.x],
          save: entry.encounter,
        });
      } else if (entry.vendor) {
        state.vendor = VendorSession.fromSave({
          rng,
          player,
          save: entry.vendor,
        });
      }
      game.players.set(entry.id, state);
    }
    return game;
  }

  toSave(): GameSave {
    return {
      version: this.saveVersion,
      savedAt: new Date().toISOString(),
      dungeon: serializeDungeon(this.dungeon),
      treasuresFound: [...this.treasuresFound],
      endMode: this.endMode,
      players: Array.from(this.players.values(), (state) => ({
        id: state.id,
        player: state.player,
        observed: state.observed,
        encounter: state.encounter ? state.encounter.toSave() : null,
        vendor: state.vendor ? state.vendor.toSave() : null,
        exited: state.exited,
      })),
    };
  }

  getEncounterSave(id: PlayerId): EncounterSave | null {
    const state = this.state(id);
    return state.encounter ? state.encounter.toSave() : null;
  }

  startEvents(id: PlayerId): Event[] {
    const state = this.state(id);
    const events = this.enterRoom(state);
    // Update the map on start
    this.observe(state);
    return events;
  }

  private stepResult(id: PlayerId, events: Event[]): StepResult {
    return { playerId: id, events, mode: this.mode(id) };
  }

  step(id: PlayerId, command: string): StepResult {
    const result = this.runStep(id, command);
    const state = this.players.get(id);
    // Update the map after each turn
    if (state) this.observe(state);
    return result;
  }

  private runStep(id: PlayerId, command: string): StepResult {
    const state = this.state(id);
    const raw = command.trim().toUpperCase();
    if (!raw) {
      return this.stepResult(id, [Event.error("I don't understand that.")]);
    }

    if (this.endMode) {
      return this.stepResult(id, [Event.error("I don't understand that.")]);
    }

    if (state.exited) {
      return this.stepResult(id, [
        Event.info('You have left the dungeon and await your companions.'),
      ]);
    }

    if (state.vendor) {
      const result = state.vendor.step(raw);
      if (result.done) {
        state.vendor = null;
      }
      return this.stepResult(id, result.events);
    }

    if (state.encounter) {
      const room = this.currentRoom(state.player);
      // The monster may have been slain by another player who shared this room.
      if (room.monsterLevel <= 0) {
        state.encounter = null;
        this.observe(state);
        return this.stepResult(id, this.describeRoom(room));
      }

      const result = state.encounter.step(raw);
      const events = result.events;
      if (result.done) {
        state.encounter = null;
        if (result.defeatedMonster) {
          const monsterLevel = room.monsterLevel;
          room.monsterLevel = 0;
          room.monsterVitality = 0;
          if (state.player.hp > 0) {
            if (room.treasureId) {
              events.push(...this.awardTreasure(room.treasureId));
              room.treasureId = 0;
            } else {
              const gold = 5 * monsterLevel + this.rng.randint(0, 20);
              state.player.gold += gold;
              events.push(
                Event.loot(
                  `You find ${gold} gold ${pluralize(gold, 'piece')}.`,
                  `<@> finds ${gold} gold ${pluralize(gold, 'piece')}.`
                )
              );
            }
          }
          this.observe(state);
          // Reobserve for everyone in the room.
          this.clearEncountersAt(
            state.player.z,
            state.player.y,
            state.player.x
          );
        }
        if (result.relocate) {
          this.randomRelocate(state, {
            anyFloor: Boolean(result.relocateAnyFloor),
            avoidMonsters: Boolean(result.relocateAvoidMonsters),
          });
          if (result.enterRoom) {
            events.push(...this.enterRoom(state));
          }
        }
        if (state.player.hp <= 0) {
          this.endMode = Mode.GAME_OVER;
        }
      }
      return this.stepResult(id, events);
    }

    const key = raw[0];
    if (!EXPLORE_COMMANDS.has(key)) {
      return this.stepResult(id, [Event.error("I don't understand that.")]);
    }
    return this.stepResult(id, this.handleExplore(state, key));
  }

  attemptCancel(id: PlayerId): StepResult {
    const state = this.state(id);
    if (this.endMode || state.exited) {
      return this.stepResult(id, []);
    }

    if (state.vendor) {
      const result = state.vendor.attemptCancel();
      if (result.done) {
        state.vendor = null;
      }
      return this.stepResult(id, result.events);
    }

    if (state.encounter) {
      const result = state.encounter.attemptCancel();
      return this.stepResult(id, result.events);
    }

    return this.stepResult(id, [Event.info("I don't understand that.")]);
  }

  mapView(id: PlayerId): Tile[][] {
    const state = this.state(id);
    // Only ever used for sending JSON over a socket, so don't need to defensively copy
    return state.observed[state.player.z];
  }

  private resolveTile(room: Room): Tile {
    if (room.monsterLevel > 0) {
      return MapTile.MONSTER;
    }
    if (room.treasureId > 0) {
      return MapTile.TREASURE;
    }
    return room.feature;
  }

  private observe(
    state: PlayerState,
    z: number = state.player.z,
    y: number = state.player.y,
    x: number = state.player.x
  ): void {
    state.observed[z][y][x] = this.resolveTile(this.dungeon.rooms[z][y][x]);
  }

  resumeEvents(id: PlayerId): Event[] {
    // Don't re-describe a room when the game is over
    if (this.endMode) return [];
    const state = this.state(id);
    if (state.vendor) {
      return [
        Event.info(
          'There is a vendor here. Do you wish to purchase something?'
        ),
        ...state.vendor.viewEvents(),
      ];
    }
    if (state.encounter) {
      return state.encounter.viewEvents();
    }
    return this.describeRoom(this.currentRoom(state.player));
  }

  currentPrompt(id: PlayerId): PromptEvent | null {
    for (const event of this.resumeEvents(id)) {
      if (event.kind === 'PROMPT') return event;
    }
    return null;
  }

  private currentRoom(player: Player): Room {
    return this.dungeon.rooms[player.z][player.y][player.x];
  }

  currentMonster(id: PlayerId): string | null {
    const state = this.state(id);
    if (!state.encounter) return null;
    const room = this.currentRoom(state.player);
    if (room.monsterLevel <= 0) return null;
    return monsterName(room.monsterLevel);
  }

  private handleExplore(state: PlayerState, key: string): Event[] {
    switch (key) {
      case 'N':
        return this.move(state, -1, 0);
      case 'S':
        return this.move(state, 1, 0);
      case 'E':
        return this.move(state, 0, 1);
      case 'W':
        return this.move(state, 0, -1);
      case 'U':
        return this.stairsUp(state);
      case 'D':
        return this.stairsDown(state);
      case 'F':
        return this.useFlare(state);
      case 'X':
        return this.attemptExit(state);
      case 'L':
        return this.useMirror(state);
      case 'O':
        return this.openChest(state);
      case 'R':
        return this.readScroll(state);
      case 'P':
        return this.drinkPotion(state);
      case 'B':
        return this.openVendor(state);
      default:
        return [];
    }
  }

  private move(state: PlayerState, dy: number, dx: number): Event[] {
    const player = state.player;
    const ny = player.y + dy;
    const nx = player.x + dx;
    if (ny < 0 || ny >= Game.SIZE || nx < 0 || nx >= Game.SIZE) {
      return [Event.info('A wall interposes itself.')];
    }
    player.y = ny;
    player.x = nx;
    return this.enterRoom(state);
  }

  private stairsUp(state: PlayerState): Event[] {
    const room = this.currentRoom(state.player);
    if (room.feature !== Feature.STAIRS_UP) {
      return [
        Event.info('There are no stairs leading up here, foolish adventurer.'),
      ];
    }
    state.player.z += 1;
    return this.enterRoom(state);
  }

  private stairsDown(state: PlayerState): Event[] {
    const room = this.currentRoom(state.player);
    if (room.feature !== Feature.STAIRS_DOWN) {
      return [
        Event.info(
          'There is no downward staircase here, so how do you propose to go down?'
        ),
      ];
    }
    state.player.z -= 1;
    return this.enterRoom(state);
  }

  private enterRoom(state: PlayerState): Event[] {
    const player = state.player;
    const room = this.currentRoom(player);

    if (room.monsterLevel > 0) {
      if (room.monsterVitality <= 0) {
        room.monsterVitality = rollMonsterVitality(this.rng, room.monsterLevel);
      }
      state.encounter = EncounterSession.start({
        rng: this.rng,
        player,
        room,
      });
      return state.encounter.viewEvents();
    }

    if (room.treasureId) {
      const treasureId = room.treasureId;
      room.treasureId = 0;
      return this.awardTreasure(treasureId);
    }

    switch (room.feature) {
      case Feature.FLARES: {
        const gained = this.rng.randint(1, 5);
        player.flares += gained;
        room.feature = Feature.EMPTY;
        return [Event.info('You pick up some flares here.')];
      }
      case Feature.THIEF: {
        room.feature = Feature.EMPTY;
        if (player.gold === 0) {
          const damage = this.rng.randint(2, 4);
          player.hp = Math.max(0, player.hp - damage);
          const events: Event[] = [
            Event.info(
              'A thief sneaks from the shadows and attacks you!',
              '<@> is attacked by a thief!'
            ),
          ];
          if (player.hp <= 0) {
            events.push(Event.info('YOU HAVE DIED.', '<@> HAS DIED.'));
            this.endMode = Mode.GAME_OVER;
          }
          return events;
        }
        const stolen = Math.min(this.rng.randint(1, 50), player.gold);
        player.gold -= stolen;
        return [
          Event.info(
            `A thief sneaks from the shadows and removes ${stolen} gold ${pluralize(stolen, 'piece')} ` +
              `from your possession.`,
            `<@> is robbed by a thief.`
          ),
        ];
      }
      case Feature.WARP: {
        room.feature = Feature.EMPTY;
        const events: Event[] = [
          Event.info(
            'This room contains a warp. Before you realize what is going on, you appear elsewhere...',
            '<@> is warped away...'
          ),
        ];
        // Observe the departed warp room before we relocate away
        this.observe(state);
        this.randomRelocate(state, { anyFloor: true, avoidMonsters: false });
        events.push(...this.enterRoom(state));
        return events;
      }
      default:
        return this.describeRoom(room);
    }
  }

  private describeRoom(room: Room): Event[] {
    if (room.monsterLevel > 0) {
      const name = monsterName(room.monsterLevel);
      return [Event.combat(`You are facing an angry ${name}!`)];
    }

    switch (room.feature) {
      case Feature.MIRROR:
        return [
          Event.info('There is a magic mirror mounted on the wall here.'),
        ];
      case Feature.SCROLL:
        return [Event.info('There is a spell scroll here.')];
      case Feature.CHEST:
        return [Event.info('There is a chest here.')];
      case Feature.POTION:
        return [Event.info('There is a magic potion here.')];
      case Feature.VENDOR:
        return [
          Event.info(
            'There is a vendor here. Do you wish to purchase something?'
          ),
        ];
      case Feature.STAIRS_UP:
        return [Event.info('There are stairs up here.')];
      case Feature.STAIRS_DOWN:
        return [Event.info('There are stairs down here.')];
      case Feature.EXIT:
        return [Event.info('You see the exit to the DUNGEON of DOOM here.')];
      default:
        return [Event.info('This room is empty.')];
    }
  }

  private attemptExit(state: PlayerState): Event[] {
    const room = this.currentRoom(state.player);
    if (room.feature !== Feature.EXIT) {
      return [Event.info('There is no exit here.')];
    }

    if (this.treasuresFound.size < 10) {
      return [
        Event.info(
          'What? And wilt thou abandon thy quest before it is accomplished? ' +
            'Verily thy triumph is incomplete!'
        ),
      ];
    }

    state.exited = true;
    if (this.allExited()) {
      this.endMode = Mode.VICTORY;
      return [Event.info('ALL HAIL THE VICTOR!', 'ALL HAIL THE VICTOR!')];
    }

    return [
      Event.info(
        'You step out of the DUNGEON of DOOM and await your companions.',
        '<@> steps out of the DUNGEON of DOOM.'
      ),
    ];
  }

  private allExited(): boolean {
    for (const state of this.players.values()) {
      if (!state.exited) {
        return false;
      }
    }
    return true;
  }

  private useFlare(state: PlayerState): Event[] {
    const player = state.player;
    if (player.flares < 1) {
      return [Event.info('Thou hast no flares.')];
    }

    player.flares -= 1;
    for (const dy of [-1, 0, 1]) {
      for (const dx of [-1, 0, 1]) {
        if (dy === 0 && dx === 0) {
          continue;
        }
        const ny = player.y + dy;
        const nx = player.x + dx;
        if (ny >= 0 && ny < Game.SIZE && nx >= 0 && nx < Game.SIZE) {
          this.observe(state, player.z, ny, nx);
        }
      }
    }

    return [Event.info('The flare illuminates nearby rooms.')];
  }

  private useMirror(state: PlayerState): Event[] {
    const player = state.player;
    const room = this.currentRoom(player);
    if (room.feature !== Feature.MIRROR) {
      return [Event.info('There is no mirror here.')];
    }

    room.feature = Feature.EMPTY;

    const visions = [
      'The mirror is cloudy and yields no vision.',
      'You see yourself dead and lying in a black coffin.',
      'You see a dragon beckoning to you.',
      'You see the three heads of a chimaera grinning at you.',
      'You see the exit on the 7th floor, big and friendly-looking.',
    ];

    if (this.treasuresFound.size === 10) {
      return [Event.info(this.rng.choice(visions))];
    }

    if (this.rng.randint(1, 50) > player.iq) {
      if (this.rng.randint(1, 10) <= 5) {
        return [Event.info(this.rng.choice(visions))];
      }
      const treasure = this.rng.randint(1, 10);
      const tx = this.rng.randint(1, Game.SIZE);
      const ty = this.rng.randint(1, Game.SIZE);
      const tz = this.rng.randint(1, Game.SIZE);
      return [
        Event.info(
          `You see the ${treasureName(treasure)} at ${tz},${ty},${tx}!`
        ),
      ];
    }

    const remaining = 10 - this.treasuresFound.size;
    const target = this.rng.randint(1, remaining);
    let seen = 0;
    for (let z = 0; z < this.dungeon.rooms.length; z += 1) {
      const floor = this.dungeon.rooms[z];
      for (let y = 0; y < floor.length; y += 1) {
        const row = floor[y];
        for (let x = 0; x < row.length; x += 1) {
          const candidate = row[x];
          if (
            candidate.treasureId &&
            !this.treasuresFound.has(candidate.treasureId)
          ) {
            seen += 1;
            if (seen === target) {
              return [
                Event.info(
                  `You see the ${treasureName(candidate.treasureId)} at ${z + 1},${y + 1},${x + 1}!`
                ),
              ];
            }
          }
        }
      }
    }

    // Technically shouldn't be able to get here
    return [Event.info(this.rng.choice(visions))];
  }

  private openChest(state: PlayerState): Event[] {
    const player = state.player;
    const room = this.currentRoom(player);
    if (room.feature !== Feature.CHEST) {
      return [Event.info('There is no chest here.')];
    }

    room.feature = Feature.EMPTY;

    const rand = this.rng.random();
    if (rand < 0.1) {
      if (player.armorTier > 0) {
        player.armorTier -= 1;
        if (player.armorTier === 0) {
          player.armorName = ARMOR_NAMES[0];
          player.armorDamaged = false;
          return [
            Event.info(
              'The perverse thing explodes as you open it, destroying your armour!',
              "An exploding chest destroys <@>'s armour!"
            ),
          ];
        }

        player.armorDamaged = true;
        return [
          Event.info(
            'The perverse thing explodes as you open it, damaging your armour!',
            "An exploding chest damages <@>'s armour!"
          ),
        ];
      }

      player.armorName = ARMOR_NAMES[0];
      player.armorDamaged = false;
      player.hp -= this.rng.randint(0, 4) + 3;
      if (player.hp <= 0) {
        this.endMode = Mode.GAME_OVER;
        return [
          Event.info(
            'The perverse thing explodes as you open it, killing you!',
            'An exploding chest kills <@>!'
          ),
          Event.info('YOU HAVE DIED.', '<@> HAS DIED.'),
        ];
      }

      return [
        Event.info(
          'The perverse thing explodes as you open it, wounding you!',
          'An exploding chest wounds <@>!'
        ),
      ];
    }

    if (rand < 0.4) {
      return [Event.info('It containeth naught.')];
    }

    const gold = 10 + this.rng.randint(0, 20);
    player.gold += gold;
    return [
      Event.loot(
        `You find ${gold} gold ${pluralize(gold, 'piece')}!`,
        `<@> finds ${gold} gold ${pluralize(gold, 'piece')}!`
      ),
    ];
  }

  private readScroll(state: PlayerState): Event[] {
    const player = state.player;
    const room = this.currentRoom(player);
    if (room.feature !== Feature.SCROLL) {
      return [Event.info('Sorry. There is nothing to read here.')];
    }

    room.feature = Feature.EMPTY;
    const spell = this.rng.randint(1, 5) as Spell;
    player.spells[spell] = (player.spells[spell] ?? 0) + 1;

    return [
      Event.info(
        `The scroll contains the ${spellName(spell).toLowerCase()} spell.`
      ),
    ];
  }

  private drinkPotion(state: PlayerState): Event[] {
    const player = state.player;
    const room = this.currentRoom(player);
    if (room.feature !== Feature.POTION) {
      return [Event.info('There is no potion here, I fear.')];
    }

    room.feature = Feature.EMPTY;

    const roll = this.rng.randint(1, 5);
    if (roll === 1) {
      const heal = 5 + this.rng.randint(1, 10);
      player.hp = Math.min(player.mhp, player.hp + heal);
      return drinkHealingPotionEvents();
    }

    const effect = this.rng.choice(['ST', 'DX', 'IQ', 'MHP'] as const);
    let change = this.rng.randint(1, 3);
    if (effect === 'MHP') {
      change *= 2;
    }
    if (this.rng.random() > 0.5) {
      change = -change;
    }

    applyAttributeChange(player, { target: effect, change });
    return drinkAttributePotionEvents({ target: effect, change });
  }

  private openVendor(state: PlayerState): Event[] {
    const room = this.currentRoom(state.player);
    if (room.feature !== Feature.VENDOR) {
      return [Event.info('There is no vendor here.')];
    }

    state.vendor = new VendorSession({
      rng: this.rng,
      player: state.player,
    });
    return state.vendor.viewEvents();
  }

  private randomRelocate(
    state: PlayerState,
    options: {
      anyFloor: boolean;
      avoidMonsters: boolean;
    }
  ): void {
    const player = state.player;
    if (options.anyFloor) {
      player.z = this.rng.randrange(Game.SIZE);
    }

    while (true) {
      const ny = this.rng.randrange(Game.SIZE);
      const nx = this.rng.randrange(Game.SIZE);
      if (ny === player.y && nx === player.x) {
        continue;
      }
      if (
        options.avoidMonsters &&
        this.dungeon.rooms[player.z][ny][nx].monsterLevel > 0
      ) {
        continue;
      }
      player.y = ny;
      player.x = nx;
      return;
    }
  }

  private awardTreasure(treasureId: number): Event[] {
    if (this.treasuresFound.has(treasureId)) {
      return [];
    }

    this.treasuresFound.add(treasureId);
    return [
      Event.loot(
        `You find the ${treasureName(treasureId)}!`,
        `<@> finds the ${treasureName(treasureId)}!`
      ),
    ];
  }

  private clearEncountersAt(z: number, y: number, x: number): void {
    for (const other of this.players.values()) {
      const p = other.player;
      if (other.encounter && p.z === z && p.y === y && p.x === x) {
        other.encounter = null;
        this.observe(other);
      }
    }
  }
}

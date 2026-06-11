import {
  ARMOR_NAMES,
  EXPLORE_COMMANDS,
  Feature,
  Mode,
  monsterName,
  spellName,
  treasureName,
  type Spell,
} from './constants.js';
import { EncounterSession, rollMonsterVitality } from './encounter.js';
import { generateDungeon } from './generation.js';
import type { Dungeon, Player, Room, RoomView } from './model.js';
import {
  type GameSave,
  type EncounterSave,
  deserializeDungeon,
  deserializePlayer,
  serializeDungeon,
  serializePlayer,
} from './serialization.js';
import { Event, type StepResult } from './types.js';
import { VendorSession } from './vendor.js';
import { defaultRandomSource, type RandomSource } from './rng.js';
import {
  drinkAttributePotionEvents,
  drinkHealingPotionEvents,
} from './potions.js';

function pluralize(count: number, singular: string, plural = `${singular}s`) {
  return count === 1 ? singular : plural;
}

export type PlayerId = string;

export interface PlayerState {
  readonly id: PlayerId;
  player: Player;
  /** Per-player explored grid, indexed [z][y][x]. */
  explored: boolean[][][];
  encounter: EncounterSession | null;
  vendor: VendorSession | null;
  endMode: Mode.GAME_OVER | Mode.VICTORY | null;
}

function createExploredGrid(): boolean[][][] {
  return Array.from({ length: Game.SIZE }, () =>
    Array.from({ length: Game.SIZE }, () =>
      Array.from({ length: Game.SIZE }, () => false)
    )
  );
}

export class Game {
  static readonly SIZE = 7;
  static readonly SAVE_VERSION = 3;

  saveVersion = Game.SAVE_VERSION;
  rng: RandomSource;
  dungeon: Dungeon;
  treasuresFound: Set<number>;
  private players: Map<PlayerId, PlayerState> = new Map();
  private debug: boolean;

  constructor(options: {
    seed?: number;
    rng?: RandomSource | null;
    debug?: boolean;
    dungeon?: Dungeon;
    treasuresFound?: Set<number>;
  }) {
    this.rng = options.rng ?? defaultRandomSource;
    this.dungeon = options.dungeon ?? generateDungeon(this.rng);
    this.treasuresFound = options.treasuresFound ?? new Set<number>();
    this.debug = options.debug ?? false;
  }

  addPlayer(id: PlayerId, player: Player): PlayerState {
    const state: PlayerState = {
      id,
      player,
      explored: createExploredGrid(),
      encounter: null,
      vendor: null,
      endMode: null,
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
    const state = this.state(id);
    if (state.endMode) {
      return state.endMode;
    }
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
      debug: save.debug,
      treasuresFound: new Set(save.treasuresFound),
    });
    game.saveVersion = save.version;

    for (const entry of save.players) {
      const player = deserializePlayer(entry.player);
      const endMode =
        entry.endMode === Mode.GAME_OVER || entry.endMode === Mode.VICTORY
          ? entry.endMode
          : null;
      const state: PlayerState = {
        id: entry.id,
        player,
        explored: entry.explored.map((floor) => floor.map((row) => [...row])),
        encounter: null,
        vendor: null,
        endMode,
      };
      if (entry.encounter) {
        state.encounter = EncounterSession.resume({
          rng,
          player,
          room: dungeon.rooms[player.z][player.y][player.x],
          debug: game.debug,
          save: entry.encounter,
        });
      }
      if (entry.vendor) {
        state.vendor = VendorSession.resume({
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
      players: [...this.players.values()].map((state) => ({
        id: state.id,
        player: serializePlayer(state.player),
        explored: state.explored.map((floor) => floor.map((row) => [...row])),
        encounter: state.encounter ? state.encounter.toSave() : null,
        vendor: state.vendor ? state.vendor.toSave() : null,
        endMode: state.endMode,
      })),
      debug: this.debug,
    };
  }

  getEncounterSave(id: PlayerId): EncounterSave | null {
    const state = this.state(id);
    return state.encounter ? state.encounter.toSave() : null;
  }

  startEvents(id: PlayerId): Event[] {
    return this.enterRoom(this.state(id));
  }

  step(id: PlayerId, command: string): StepResult {
    const state = this.state(id);
    const raw = command.trim().toUpperCase();
    if (!raw) {
      return {
        events: [Event.error("I don't understand that.")],
        mode: this.mode(id),
      };
    }

    if (state.endMode) {
      return {
        events: [Event.error("I don't understand that.")],
        mode: this.mode(id),
      };
    }

    if (state.vendor) {
      const result = state.vendor.step(raw);
      if (result.done) {
        state.vendor = null;
      }
      return {
        events: result.events,
        mode: this.mode(id),
      };
    }

    if (state.encounter) {
      const room = this.currentRoom(state.player);
      // The monster may have been slain by another player who shared this room.
      if (room.monsterLevel <= 0) {
        state.encounter = null;
        return {
          events: this.describeRoom(room),
          mode: this.mode(id),
        };
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
                Event.loot(`You find ${gold} gold ${pluralize(gold, 'piece')}.`)
              );
            }
          }
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
          state.endMode = Mode.GAME_OVER;
        }
      }
      return {
        events,
        mode: this.mode(id),
      };
    }

    const key = raw[0];
    if (!EXPLORE_COMMANDS.has(key)) {
      return {
        events: [Event.error("I don't understand that.")],
        mode: this.mode(id),
      };
    }
    return {
      events: this.handleExplore(state, key),
      mode: this.mode(id),
    };
  }

  attemptCancel(id: PlayerId): StepResult {
    const state = this.state(id);
    if (state.endMode) {
      return {
        events: [],
        mode: this.mode(id),
      };
    }

    if (state.vendor) {
      const result = state.vendor.attemptCancel();
      if (result.done) {
        state.vendor = null;
      }
      return {
        events: result.events,
        mode: this.mode(id),
      };
    }

    if (state.encounter) {
      const result = state.encounter.attemptCancel();
      return {
        events: result.events,
        mode: this.mode(id),
      };
    }

    return {
      events: [Event.info("I don't understand that.")],
      mode: this.mode(id),
    };
  }

  mapView(id: PlayerId): RoomView[][] {
    const state = this.state(id);
    const z = state.player.z;
    return this.dungeon.rooms[z].map((row, y) =>
      row.map((room, x) => ({
        feature: room.feature,
        monsterLevel: room.monsterLevel,
        treasureId: room.treasureId,
        seen: state.explored[z][y][x],
      }))
    );
  }

  resumeEvents(id: PlayerId): Event[] {
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

  private currentRoom(player: Player): Room {
    return this.dungeon.rooms[player.z][player.y][player.x];
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
    const events: Event[] = [];
    const player = state.player;
    const room = this.currentRoom(player);
    state.explored[player.z][player.y][player.x] = true;

    if (room.monsterLevel > 0) {
      if (room.monsterVitality <= 0) {
        room.monsterVitality = rollMonsterVitality(this.rng, room.monsterLevel);
      }
      state.encounter = EncounterSession.start({
        rng: this.rng,
        player,
        room,
        debug: this.debug,
      });
      events.push(...state.encounter.viewEvents());
      return events;
    }

    if (room.treasureId) {
      events.push(...this.awardTreasure(room.treasureId));
      room.treasureId = 0;
      return events;
    }

    switch (room.feature) {
      case Feature.FLARES: {
        const gained = this.rng.randint(1, 5);
        player.flares += gained;
        room.feature = Feature.EMPTY;
        events.push(Event.info('You pick up some flares here.'));
        break;
      }
      case Feature.THIEF: {
        room.feature = Feature.EMPTY;
        if (player.gold === 0) {
          const damage = this.rng.randint(2, 4);
          player.hp = Math.max(0, player.hp - damage);
          events.push(
            Event.info('A thief sneaks from the shadows and attacks you!')
          );
          if (player.hp <= 0) {
            events.push(Event.info('YOU HAVE DIED.'));
            state.endMode = Mode.GAME_OVER;
          }
          break;
        }
        const stolen = Math.min(this.rng.randint(1, 50), player.gold);
        player.gold -= stolen;
        events.push(
          Event.info(
            `A thief sneaks from the shadows and removes ${stolen} gold ${pluralize(stolen, 'piece')} ` +
              `from your possession.`
          )
        );
        break;
      }
      case Feature.WARP:
        room.feature = Feature.EMPTY;
        events.push(
          Event.info(
            'This room contains a warp. Before you realize what is going on, you appear elsewhere...'
          )
        );
        this.randomRelocate(state, {
          anyFloor: true,
          avoidMonsters: false,
        });
        events.push(...this.enterRoom(state));
        break;
      default:
        events.push(...this.describeRoom(room));
        break;
    }

    return events;
  }

  private describeRoom(room: Room): Event[] {
    const events: Event[] = [];

    if (room.monsterLevel > 0) {
      const name = monsterName(room.monsterLevel);
      events.push(Event.combat(`You are facing an angry ${name}!`));
      return events;
    }

    switch (room.feature) {
      case Feature.MIRROR:
        events.push(
          Event.info('There is a magic mirror mounted on the wall here.')
        );
        break;
      case Feature.SCROLL:
        events.push(Event.info('There is a spell scroll here.'));
        break;
      case Feature.CHEST:
        events.push(Event.info('There is a chest here.'));
        break;
      case Feature.POTION:
        events.push(Event.info('There is a magic potion here.'));
        break;
      case Feature.VENDOR:
        events.push(
          Event.info(
            'There is a vendor here. Do you wish to purchase something?'
          )
        );
        break;
      case Feature.STAIRS_UP:
        events.push(Event.info('There are stairs up here.'));
        break;
      case Feature.STAIRS_DOWN:
        events.push(Event.info('There are stairs down here.'));
        break;
      case Feature.EXIT:
        events.push(
          Event.info('You see the exit to the DUNGEON of DOOM here.')
        );
        break;
      default:
        events.push(Event.info('This room is empty.'));
        break;
    }

    return events;
  }

  private attemptExit(state: PlayerState): Event[] {
    const room = this.currentRoom(state.player);
    if (room.feature !== Feature.EXIT) {
      return [Event.info('There is no exit here.')];
    }
    if (this.treasuresFound.size < 10) {
      state.endMode = Mode.GAME_OVER;
      const remaining = 10 - this.treasuresFound.size;
      return [
        Event.info(
          'What? And hast thou abandoned thy quest before it was accomplished?'
        ),
        Event.info(
          `The DUNGEON of DOOM still holds ${remaining} ${pluralize(remaining, 'treasure')} ` +
            `that thine eyes shall never behold! Verily thy triumph is incomplete!`
        ),
      ];
    }
    state.endMode = Mode.VICTORY;
    return [Event.info('ALL HAIL THE VICTOR!')];
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
          state.explored[player.z][ny][nx] = true;
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

    const visions = [
      'The mirror is cloudy and yields no vision.',
      'You see yourself dead and lying in a black coffin.',
      'You see a dragon beckoning to you.',
      'You see the three heads of a chimaera grinning at you.',
      'You see the exit on the 7th floor, big and friendly-looking.',
    ];
    const events: Event[] = [];
    if (this.treasuresFound.size === 10) {
      events.push(Event.info(this.rng.choice(visions)));
    } else if (this.rng.randint(1, 50) > player.iq) {
      if (this.rng.randint(1, 10) <= 5) {
        events.push(Event.info(this.rng.choice(visions)));
      } else {
        const treasure = this.rng.randint(1, 10);
        const tx = this.rng.randint(1, Game.SIZE);
        const ty = this.rng.randint(1, Game.SIZE);
        const tz = this.rng.randint(1, Game.SIZE);
        events.push(
          Event.info(
            `You see the ${treasureName(treasure)} at ${tz},${ty},${tx}!`
          )
        );
      }
    } else {
      const remaining = 10 - this.treasuresFound.size;
      const target = this.rng.randint(1, remaining);
      let seen = 0;
      outer: for (let z = 0; z < this.dungeon.rooms.length; z += 1) {
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
                events.push(
                  Event.info(
                    `You see the ${treasureName(candidate.treasureId)} at ${z + 1},${y + 1},${x + 1}!`
                  )
                );
                break outer;
              }
            }
          }
        }
      }
    }
    room.feature = Feature.EMPTY;
    return events;
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
              'The perverse thing explodes as you open it, destroying your armour!'
            ),
          ];
        }
        player.armorDamaged = true;
        return [
          Event.info(
            'The perverse thing explodes as you open it, damaging your armour!'
          ),
        ];
      }
      player.armorName = ARMOR_NAMES[0];
      player.armorDamaged = false;
      player.hp -= this.rng.randint(0, 4) + 3;
      if (player.hp <= 0) {
        state.endMode = Mode.GAME_OVER;
        return [
          Event.info(
            'The perverse thing explodes as you open it, wounding you!'
          ),
          Event.info('YOU HAVE DIED.'),
        ];
      }
      return [
        Event.info('The perverse thing explodes as you open it, wounding you!'),
      ];
    }
    if (rand < 0.4) {
      return [Event.info('It containeth naught.')];
    }

    const gold = 10 + this.rng.randint(0, 20);
    player.gold += gold;
    return [Event.loot(`You find ${gold} gold ${pluralize(gold, 'piece')}!`)];
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
    player.applyAttributeChange({ target: effect, change });
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
    return [Event.loot(`You find the ${treasureName(treasureId)}!`)];
  }
}

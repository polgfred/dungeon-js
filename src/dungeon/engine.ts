import {
  ARMOR_NAMES,
  EXPLORE_COMMANDS,
  FEATURE_SYMBOLS,
  MONSTER_NAMES,
  TREASURE_NAMES,
  Feature,
  Mode,
  Spell,
} from './constants.js';
import { EncounterSession } from './encounter.js';
import { generateDungeon } from './generation.js';
import { Player } from './model.js';
import {
  type GameSave,
  type EncounterSave,
  deserializeGame,
  serializeGame,
} from './serialization.js';
import { Event, StepResult } from './types.js';
import { VendorSession } from './vendor.js';
import { defaultRandomSource, type RandomSource } from './rng.js';
import {
  drinkAttributePotionEvents,
  drinkHealingPotionEvents,
} from './potions.js';

function pluralize(count: number, singular: string, plural = `${singular}s`) {
  return count === 1 ? singular : plural;
}

export class Game {
  static readonly SIZE = 7;
  static readonly SAVE_VERSION = 2;

  saveVersion = Game.SAVE_VERSION;
  rng: RandomSource;
  player: Player;
  dungeon: ReturnType<typeof generateDungeon>;
  private endMode: Mode.GAME_OVER | Mode.VICTORY | null = null;
  private encounterSession: EncounterSession | null = null;
  private shopSession: VendorSession | null = null;
  private debug: boolean;

  get mode(): Mode {
    if (this.endMode) {
      return this.endMode;
    }
    if (this.encounterSession) {
      return Mode.ENCOUNTER;
    }
    return Mode.EXPLORE;
  }

  constructor(options: {
    seed: number;
    player: Player;
    rng?: RandomSource | null;
    debug?: boolean;
    dungeon?: ReturnType<typeof generateDungeon>;
  }) {
    this.rng = options.rng ?? defaultRandomSource;
    this.player = options.player;
    this.dungeon = options.dungeon ?? generateDungeon(this.rng);
    this.encounterSession = null;
    this.shopSession = null;
    this.debug = options.debug ?? false;
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
    const state = deserializeGame(save);
    const player = state.player;
    const game = new Game({
      seed: 0,
      player,
      rng,
      dungeon: state.dungeon,
      debug: state.debug,
    });
    game.saveVersion = state.version;
    if (state.mode === Mode.GAME_OVER || state.mode === Mode.VICTORY) {
      game.endMode = state.mode;
    }
    if (state.encounter) {
      game.encounterSession = EncounterSession.resume({
        rng,
        player,
        debug: game.debug,
        save: state.encounter,
      });
    }
    if (state.vendor) {
      game.shopSession = VendorSession.resume({
        rng,
        player,
        save: state.vendor,
      });
    }
    return game;
  }

  toSave(): GameSave {
    return serializeGame({
      version: this.saveVersion,
      mode: this.mode,
      player: this.player,
      dungeon: this.dungeon,
      encounter: this.encounterSession ? this.encounterSession.toSave() : null,
      vendor: this.shopSession ? this.shopSession.toSave() : null,
      debug: this.debug,
    });
  }

  getEncounterSave(): EncounterSave | null {
    return this.encounterSession ? this.encounterSession.toSave() : null;
  }

  startEvents(): Event[] {
    return this.enterRoom();
  }

  step(command: string): StepResult {
    const raw = command.trim().toUpperCase();
    if (!raw) {
      return {
        events: [Event.error("I don't understand that.")],
        mode: this.mode,
      };
    }

    if (this.mode === Mode.GAME_OVER || this.mode === Mode.VICTORY) {
      return {
        events: [Event.error("I don't understand that.")],
        mode: this.mode,
      };
    }

    if (this.shopSession) {
      const result = this.shopSession.step(raw);
      if (result.done) {
        this.shopSession = null;
      }
      return {
        events: result.events,
        mode: this.mode,
      };
    }

    if (this.encounterSession) {
      const result = this.encounterSession.step(raw);
      const events = result.events;
      if (result.done) {
        this.encounterSession = null;
        if (result.defeatedMonster) {
          const room = this.currentRoom();
          const monsterLevel = room.monsterLevel;
          room.monsterLevel = 0;
          if (this.player.hp > 0) {
            if (room.treasureId) {
              events.push(...this.awardTreasure(room.treasureId));
              room.treasureId = 0;
            } else {
              const gold = 5 * monsterLevel + this.rng.randint(0, 20);
              this.player.gold += gold;
              events.push(
                Event.loot(`You find ${gold} gold ${pluralize(gold, 'piece')}.`)
              );
            }
          }
        }
        if (result.relocate) {
          this.randomRelocate({ anyFloor: Boolean(result.relocateAnyFloor) });
          if (result.enterRoom) {
            events.push(...this.enterRoom());
          }
        }
        if (this.player.hp <= 0) {
          this.endMode = Mode.GAME_OVER;
        }
      }
      return {
        events,
        mode: this.mode,
      };
    }

    const key = raw[0];
    if (!EXPLORE_COMMANDS.has(key)) {
      return {
        events: [Event.error("I don't understand that.")],
        mode: this.mode,
      };
    }
    return {
      events: this.handleExplore(key),
      mode: this.mode,
    };
  }

  attemptCancel(): StepResult {
    if (this.mode === Mode.GAME_OVER || this.mode === Mode.VICTORY) {
      return {
        events: [],
        mode: this.mode,
      };
    }

    if (this.shopSession) {
      const result = this.shopSession.attemptCancel();
      if (result.done) {
        this.shopSession = null;
      }
      return {
        events: result.events,
        mode: this.mode,
      };
    }

    if (this.encounterSession) {
      const result = this.encounterSession.attemptCancel();
      return {
        events: result.events,
        mode: this.mode,
      };
    }

    return {
      events: [Event.info("I don't understand that.")],
      mode: this.mode,
    };
  }

  mapGrid(): string[][] {
    const grid: string[][] = [];
    for (let y = 0; y < Game.SIZE; y += 1) {
      const row: string[] = [];
      for (let x = 0; x < Game.SIZE; x += 1) {
        const room = this.dungeon.rooms[this.player.z][y][x];
        if (!room.seen) {
          row.push('·');
        } else if (room.monsterLevel > 0) {
          row.push('M');
        } else if (room.treasureId) {
          row.push('T');
        } else {
          row.push(FEATURE_SYMBOLS[room.feature] ?? '-');
        }
      }
      grid.push(row);
    }
    return grid;
  }

  resumeEvents(): Event[] {
    if (this.shopSession) {
      return [
        Event.info(
          'There is a vendor here. Do you wish to purchase something?'
        ),
        ...this.shopSession.viewEvents(),
      ];
    }
    if (this.encounterSession) {
      return this.encounterSession.viewEvents();
    }
    return this.describeRoom(this.currentRoom());
  }

  private currentRoom() {
    return this.dungeon.rooms[this.player.z][this.player.y][this.player.x];
  }

  private handleExplore(key: string): Event[] {
    switch (key) {
      case 'N':
        return this.move(-1, 0);
      case 'S':
        return this.move(1, 0);
      case 'E':
        return this.move(0, 1);
      case 'W':
        return this.move(0, -1);
      case 'U':
        return this.stairsUp();
      case 'D':
        return this.stairsDown();
      case 'F':
        return this.useFlare();
      case 'X':
        return this.attemptExit();
      case 'L':
        return this.useMirror();
      case 'O':
        return this.openChest();
      case 'R':
        return this.readScroll();
      case 'P':
        return this.drinkPotion();
      case 'B':
        return this.openVendor();
      case 'H':
        return [Event.info(this.helpText())];
      default:
        return [];
    }
  }

  private move(dy: number, dx: number): Event[] {
    const ny = this.player.y + dy;
    const nx = this.player.x + dx;
    if (ny < 0 || ny >= Game.SIZE || nx < 0 || nx >= Game.SIZE) {
      return [Event.info('A wall interposes itself.')];
    }
    this.player.y = ny;
    this.player.x = nx;
    return this.enterRoom();
  }

  private stairsUp(): Event[] {
    const room = this.currentRoom();
    if (room.feature !== Feature.STAIRS_UP) {
      return [
        Event.info('There are no stairs leading up here, foolish adventurer.'),
      ];
    }
    this.player.z += 1;
    return this.enterRoom();
  }

  private stairsDown(): Event[] {
    const room = this.currentRoom();
    if (room.feature !== Feature.STAIRS_DOWN) {
      return [
        Event.info(
          'There is no downward staircase here, so how do you propose to go down?'
        ),
      ];
    }
    this.player.z -= 1;
    return this.enterRoom();
  }

  private enterRoom(): Event[] {
    const events: Event[] = [];
    const room = this.currentRoom();
    room.seen = true;

    if (room.monsterLevel > 0) {
      this.encounterSession = EncounterSession.start({
        rng: this.rng,
        player: this.player,
        monsterLevel: room.monsterLevel,
        debug: this.debug,
      });
      events.push(...this.encounterSession.viewEvents());
      return events;
    }

    if (room.treasureId) {
      events.push(...this.awardTreasure(room.treasureId));
      room.treasureId = 0;
    }

    switch (room.feature) {
      case Feature.FLARES: {
        const gained = this.rng.randint(1, 5);
        this.player.flares += gained;
        room.feature = Feature.EMPTY;
        events.push(Event.info('You pick up some flares here.'));
        break;
      }
      case Feature.THIEF: {
        const stolen = Math.min(this.rng.randint(1, 50), this.player.gold);
        this.player.gold -= stolen;
        room.feature = Feature.EMPTY;
        events.push(
          Event.info(
            `A thief sneaks from the shadows and removes ${stolen} gold ${pluralize(stolen, 'piece')} ` +
              `from your possession.`
          )
        );
        break;
      }
      case Feature.WARP:
        events.push(
          Event.info(
            'This room contains a warp. Before you realize what is going on, you appear elsewhere...'
          )
        );
        this.randomRelocate({ anyFloor: true });
        events.push(...this.enterRoom());
        break;
      default:
        events.push(...this.describeRoom(room));
        break;
    }

    return events;
  }

  private describeRoom(room: ReturnType<typeof this.currentRoom>): Event[] {
    const events: Event[] = [];

    if (room.monsterLevel > 0) {
      const name = MONSTER_NAMES[room.monsterLevel - 1];
      events.push(Event.combat(`You are facing an angry ${name}!`));
      return events;
    }

    if (room.treasureId) {
      events.push(
        Event.loot(`You find the ${this.treasureName(room.treasureId)}!`)
      );
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

  private attemptExit(): Event[] {
    const room = this.currentRoom();
    if (room.feature !== Feature.EXIT) {
      return [Event.info('There is no exit here.')];
    }
    if (this.player.treasuresFound.size < 10) {
      this.endMode = Mode.GAME_OVER;
      const remaining = 10 - this.player.treasuresFound.size;
      return [
        Event.info(
          'What? And hast thou abandoned thy quest before it was accomplished?'
        ),
        Event.info(
          `The DUNGEON of DOOM still holds ${remaining} treasures that thine eyes shall never behold! Verily thy triumph is incomplete!`
        ),
      ];
    }
    this.endMode = Mode.VICTORY;
    return [Event.info('ALL HAIL THE VICTOR!')];
  }

  private useFlare(): Event[] {
    if (this.player.flares < 1) {
      return [Event.info('Thou hast no flares.')];
    }
    this.player.flares -= 1;
    for (const dy of [-1, 0, 1]) {
      for (const dx of [-1, 0, 1]) {
        if (dy === 0 && dx === 0) {
          continue;
        }
        const ny = this.player.y + dy;
        const nx = this.player.x + dx;
        if (ny >= 0 && ny < Game.SIZE && nx >= 0 && nx < Game.SIZE) {
          this.dungeon.rooms[this.player.z][ny][nx].seen = true;
        }
      }
    }
    return [Event.info('The flare illuminates nearby rooms.')];
  }

  private helpText(): string {
    return (
      'COMMAND SUMMARY:\n' +
      'Move: N=North  S=South  E=East  W=West  U=Up  D=Down\n' +
      'Act:  L=Look  O=Open chest  R=Read scroll  P=Potion  F=Flare  B=Buy\n' +
      'Info: H=Help  X=eXit\n' +
      '\n' +
      'Encounter: F=Fight  R=Run  S=Spell\n' +
      '\n' +
      'MAP LEGEND:\n' +
      '-=Empty  m=Mirror  s=Scroll  c=Chest  f=Flares  p=Potion\n' +
      'v=Vendor  t=Thief  w=Warp  U=Up  D=Down  X=eXit\n' +
      'T=Treasure  M=Monster  *=You  ·=Unknown'
    );
  }

  private useMirror(): Event[] {
    const room = this.currentRoom();
    if (room.feature !== Feature.MIRROR) {
      return [Event.info('There is no mirror here.')];
    }

    const events: Event[] = [];
    if (this.player.treasuresFound.size === 10) {
      events.push(Event.info('The mirror is cloudy and yields no vision.'));
    } else if (this.rng.randint(1, 50) > this.player.iq) {
      const visions = [
        'The mirror is cloudy and yields no vision.',
        'You see yourself dead and lying in a black coffin.',
        'You see a dragon beckoning to you.',
        'You see the three heads of a chimaera grinning at you.',
        'You see the exit on the 7th floor, big and friendly-looking.',
      ];
      if (this.rng.randint(1, 10) <= 5) {
        events.push(Event.info(this.rng.choice(visions)));
      } else {
        const treasure = this.rng.randint(1, 10);
        const tx = this.rng.randint(1, Game.SIZE);
        const ty = this.rng.randint(1, Game.SIZE);
        const tz = this.rng.randint(1, Game.SIZE);
        events.push(
          Event.info(
            `You see the ${this.treasureName(treasure)} at ${tz},${ty},${tx}!`
          )
        );
      }
    } else {
      const locations: Array<[number, number, number, number]> = [];
      for (let z = 0; z < this.dungeon.rooms.length; z += 1) {
        const floor = this.dungeon.rooms[z];
        for (let y = 0; y < floor.length; y += 1) {
          const row = floor[y];
          for (let x = 0; x < row.length; x += 1) {
            const candidate = row[x];
            if (
              candidate.treasureId &&
              !this.player.treasuresFound.has(candidate.treasureId)
            ) {
              locations.push([candidate.treasureId, z, y, x]);
            }
          }
        }
      }
      if (locations.length === 0) {
        events.push(Event.info('The mirror is cloudy and yields no vision.'));
      } else {
        const [treasure, z, y, x] = this.rng.choice(locations);
        events.push(
          Event.info(
            `You see the ${this.treasureName(treasure)} at ${z + 1},${y + 1},${x + 1}!`
          )
        );
      }
    }
    room.feature = Feature.EMPTY;
    return events;
  }

  private openChest(): Event[] {
    const room = this.currentRoom();
    if (room.feature !== Feature.CHEST) {
      return [Event.info('There is no chest here.')];
    }
    room.feature = Feature.EMPTY;
    const roll = this.rng.randint(1, 10);
    switch (roll) {
      case 1:
        if (this.player.armorTier > 0) {
          this.player.armorTier -= 1;
          if (this.player.armorTier === 0) {
            this.player.armorName = ARMOR_NAMES[0];
            this.player.armorDamaged = false;
            return [
              Event.info(
                'The perverse thing explodes as you open it, destroying your armour!'
              ),
            ];
          }
          this.player.armorDamaged = true;
          return [
            Event.info(
              'The perverse thing explodes as you open it, damaging your armour!'
            ),
          ];
        }
        this.player.armorName = ARMOR_NAMES[0];
        this.player.armorDamaged = false;
        this.player.hp -= this.rng.randint(0, 4) + 3;
        if (this.player.hp <= 0) {
          this.endMode = Mode.GAME_OVER;
          return [
            Event.info(
              'The perverse thing explodes as you open it, wounding you!'
            ),
            Event.info('YOU HAVE DIED.'),
          ];
        }
        return [
          Event.info(
            'The perverse thing explodes as you open it, wounding you!'
          ),
        ];
      case 2:
      case 3:
      case 4:
        return [Event.info('It containeth naught.')];
      default: {
        const gold = 10 + this.rng.randint(0, 20);
        this.player.gold += gold;
        return [
          Event.info(`You find ${gold} gold ${pluralize(gold, 'piece')}!`),
        ];
      }
    }
  }

  private readScroll(): Event[] {
    const room = this.currentRoom();
    if (room.feature !== Feature.SCROLL) {
      return [Event.info('Sorry. There is nothing to read here.')];
    }
    room.feature = Feature.EMPTY;
    const spell = this.rng.randint(1, 5) as Spell;
    this.player.spells[spell] = (this.player.spells[spell] ?? 0) + 1;
    return [
      Event.info(
        `The scroll contains the ${Spell[spell].toLowerCase()} spell.`
      ),
    ];
  }

  private drinkPotion(): Event[] {
    const room = this.currentRoom();
    if (room.feature !== Feature.POTION) {
      return [Event.info('There is no potion here, I fear.')];
    }
    room.feature = Feature.EMPTY;
    const roll = this.rng.randint(1, 5);
    if (roll === 1) {
      const heal = 5 + this.rng.randint(1, 10);
      this.player.hp = Math.min(this.player.mhp, this.player.hp + heal);
      return drinkHealingPotionEvents();
    }

    const effect = this.rng.choice(['ST', 'DX', 'IQ', 'MHP'] as const);
    let change = this.rng.randint(1, 3);
    if (this.rng.random() > 0.5) {
      change = -change;
    }
    this.player.applyAttributeChange({ target: effect, change });
    return drinkAttributePotionEvents({ target: effect, change });
  }

  private openVendor(): Event[] {
    const room = this.currentRoom();
    if (room.feature !== Feature.VENDOR) {
      return [Event.info('There is no vendor here.')];
    }
    this.shopSession = new VendorSession({
      rng: this.rng,
      player: this.player,
    });
    return this.shopSession.viewEvents();
  }

  private armorDisplayName(): string {
    if (this.player.armorDamaged) {
      return `${this.player.armorName} (damaged)`;
    }
    return this.player.armorName;
  }

  private randomRelocate(options: { anyFloor: boolean }): void {
    if (options.anyFloor) {
      this.player.z = this.rng.randrange(Game.SIZE);
    }
    while (true) {
      const ny = this.rng.randrange(Game.SIZE);
      const nx = this.rng.randrange(Game.SIZE);
      if (ny === this.player.y && nx === this.player.x) {
        continue;
      }
      this.player.y = ny;
      this.player.x = nx;
      return;
    }
  }

  private awardTreasure(treasureId: number): Event[] {
    if (this.player.treasuresFound.has(treasureId)) {
      return [];
    }
    this.player.treasuresFound.add(treasureId);
    return [Event.loot(`You find the ${this.treasureName(treasureId)}!`)];
  }

  private treasureName(treasureId: number): string {
    return TREASURE_NAMES[treasureId - 1];
  }
}

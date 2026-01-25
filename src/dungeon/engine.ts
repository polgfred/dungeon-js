import {
  EXPLORE_COMMANDS,
  FEATURE_SYMBOLS,
  Feature,
  Mode,
  Spell,
  TREASURE_NAMES,
} from "./constants";
import { EncounterSession } from "./encounter";
import { generateDungeon } from "./generation";
import type { Player } from "./model";
import { Event, StepResult } from "./types";
import { VendorSession } from "./vendor";
import { defaultRandomSource, type RandomSource } from "./rng";

export class Game {
  static readonly SIZE = 7;
  static readonly SAVE_VERSION = 1;

  saveVersion = Game.SAVE_VERSION;
  rng: RandomSource;
  player: Player;
  dungeon: ReturnType<typeof generateDungeon>;
  mode = Mode.EXPLORE;
  private encounterSession: EncounterSession | null = null;
  private shopSession: VendorSession | null = null;
  private debug: boolean;

  constructor(options: {
    seed: number;
    player: Player;
    rng?: RandomSource | null;
    debug?: boolean;
  }) {
    this.rng = options.rng ?? defaultRandomSource;
    this.player = options.player;
    this.dungeon = generateDungeon(this.rng);
    this.mode = Mode.EXPLORE;
    this.encounterSession = null;
    this.shopSession = null;
    this.debug = options.debug ?? false;
  }

  startEvents(): Event[] {
    return this.enterRoom();
  }

  step(command: string): StepResult {
    const events: Event[] = [];
    const raw = command.trim().toUpperCase();
    if (!raw) {
      return {
        events: [Event.error("I don't understand that.")],
        mode: this.mode,
        needsInput: true,
      };
    }

    if (this.mode === Mode.GAME_OVER || this.mode === Mode.VICTORY) {
      return { events: [], mode: this.mode, needsInput: false };
    }

    if (this.shopSession) {
      const result = this.shopSession.step(raw);
      events.push(...result.events);
      if (result.done) {
        this.shopSession = null;
      }
      return { events, mode: this.mode, needsInput: true };
    }

    if (this.encounterSession) {
      const result = this.encounterSession.step(raw);
      events.push(...result.events);
      if (result.mode !== Mode.ENCOUNTER) {
        this.encounterSession = null;
      }
      this.mode = result.mode;
      if (result.relocate) {
        this.randomRelocate({ anyFloor: Boolean(result.relocateAnyFloor) });
        if (result.enterRoom) {
          events.push(...this.enterRoom());
        }
      }
      return {
        events,
        mode: this.mode,
        needsInput: this.mode !== Mode.GAME_OVER && this.mode !== Mode.VICTORY,
      };
    }

    const key = raw[0];
    if (!EXPLORE_COMMANDS.has(key)) {
      return {
        events: [Event.error("I don't understand that.")],
        mode: this.mode,
        needsInput: true,
      };
    }
    events.push(...this.handleExplore(key));
    return { events, mode: this.mode, needsInput: true };
  }

  prompt(): string {
    return this.nextPrompt([]);
  }

  statusEvents(): Event[] {
    const events: Event[] = [Event.status(this.statusData())];
    if (this.debug) {
      events.push(
        Event.debug(
          "DEBUG STATS: " +
          `weapon_tier=${this.player.weaponTier} ` +
          `armor_tier=${this.player.armorTier} ` +
          `armor_damaged=${this.player.armorDamaged} ` +
          `temp_armor_bonus=${this.player.tempArmorBonus} ` +
          `fatigued=${this.player.fatigued}`
        )
      );
    }
    return events;
  }

  resumeEvents(): Event[] {
    const events: Event[] = [];
    if (this.encounterSession) {
      events.push(...this.encounterSession.startEvents());
    }
    events.push(Event.map(this.mapGrid()));
    return events;
  }

  private nextPrompt(events: Event[]): string {
    if (this.shopSession) {
      return this.shopSession.prompt();
    }
    if (this.encounterSession) {
      return this.encounterSession.prompt();
    }
    if (events.some((event) => event.kind === "PROMPT")) {
      return "?> ";
    }
    return "--> ";
  }

  private currentRoom() {
    return this.dungeon.rooms[this.player.z][this.player.y][this.player.x];
  }

  private handleExplore(key: string): Event[] {
    switch (key) {
      case "N":
        return this.move(-1, 0);
      case "S":
        return this.move(1, 0);
      case "E":
        return this.move(0, 1);
      case "W":
        return this.move(0, -1);
      case "U":
        return this.stairsUp();
      case "D":
        return this.stairsDown();
      case "M":
        return [Event.map(this.mapGrid())];
      case "F":
        return this.useFlare();
      case "X":
        return this.attemptExit();
      case "L":
        return this.useMirror();
      case "O":
        return this.openChest();
      case "R":
        return this.readScroll();
      case "P":
        return this.drinkPotion();
      case "B":
        return this.openVendor();
      case "H":
        return [Event.info(this.helpText())];
      default:
        return [];
    }
  }

  private move(dy: number, dx: number): Event[] {
    const ny = this.player.y + dy;
    const nx = this.player.x + dx;
    if (ny < 0 || ny >= Game.SIZE || nx < 0 || nx >= Game.SIZE) {
      return [Event.info("A wall interposes itself.")];
    }
    this.player.y = ny;
    this.player.x = nx;
    return this.enterRoom();
  }

  private stairsUp(): Event[] {
    const room = this.currentRoom();
    if (room.feature !== Feature.STAIRS_UP) {
      return [
        Event.info("There are no stairs leading up here, foolish adventurer."),
      ];
    }
    this.player.z += 1;
    return this.enterRoom();
  }

  private stairsDown(): Event[] {
    const room = this.currentRoom();
    if (room.feature !== Feature.STAIRS_DOWN) {
      return [Event.info("There is no downward staircase here.")];
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
        room,
        debug: this.debug,
      });
      events.push(...this.encounterSession.startEvents());
      this.mode = Mode.ENCOUNTER;
      return events;
    }

    if (room.treasureId) {
      events.push(...this.awardTreasure(room.treasureId));
      room.treasureId = 0;
    }

    switch (room.feature) {
      case Feature.MIRROR:
        events.push(Event.info("There is a magic mirror mounted on the wall here."));
        break;
      case Feature.SCROLL:
        events.push(Event.info("There is a spell scroll here."));
        break;
      case Feature.CHEST:
        events.push(Event.info("There is a chest here."));
        break;
      case Feature.FLARES: {
        const gained = this.rng.randint(1, 5);
        this.player.flares += gained;
        room.feature = Feature.EMPTY;
        events.push(Event.info(`You pick up ${gained} flares.`));
        break;
      }
      case Feature.POTION:
        events.push(Event.info("There is a magic potion here."));
        break;
      case Feature.VENDOR:
        events.push(Event.info("There is a vendor here."));
        break;
      case Feature.THIEF: {
        const stolen = Math.min(this.rng.randint(1, 50), this.player.gold);
        this.player.gold -= stolen;
        room.feature = Feature.EMPTY;
        events.push(Event.info(`A thief steals ${stolen} gold pieces.`));
        break;
      }
      case Feature.WARP:
        events.push(
          Event.info("This room contains a warp. You are whisked elsewhere...")
        );
        this.randomRelocate({ anyFloor: true });
        events.push(...this.enterRoom());
        break;
      case Feature.STAIRS_UP:
        events.push(Event.info("There are stairs up here."));
        break;
      case Feature.STAIRS_DOWN:
        events.push(Event.info("There are stairs down here."));
        break;
      case Feature.EXIT:
        events.push(Event.info("You see the exit to the Dungeon of Doom here."));
        break;
      default:
        events.push(Event.info("This room is empty."));
        break;
    }

    return events;
  }

  private attemptExit(): Event[] {
    const room = this.currentRoom();
    if (room.feature !== Feature.EXIT) {
      return [Event.info("There is no exit here.")];
    }
    if (this.player.treasuresFound.size < 10) {
      this.mode = Mode.GAME_OVER;
      const remaining = 10 - this.player.treasuresFound.size;
      return [
        Event.info(`You abandon your quest with ${remaining} treasures remaining.`),
      ];
    }
    this.mode = Mode.VICTORY;
    return [Event.info("ALL HAIL THE VICTOR!")];
  }

  private useFlare(): Event[] {
    if (this.player.flares < 1) {
      return [Event.info("Thou hast no flares.")];
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
    return [
      Event.info("The flare illuminates nearby rooms."),
      Event.map(this.mapGrid()),
    ];
  }

  private mapGrid(): string[] {
    const grid: string[] = [];
    for (let y = 0; y < Game.SIZE; y += 1) {
      const row: string[] = [];
      for (let x = 0; x < Game.SIZE; x += 1) {
        const room = this.dungeon.rooms[this.player.z][y][x];
        if (this.player.y === y && this.player.x === x) {
          row.push("*");
        } else if (!room.seen) {
          row.push("?");
        } else if (room.monsterLevel > 0) {
          row.push("M");
        } else if (room.treasureId) {
          row.push("T");
        } else {
          row.push(FEATURE_SYMBOLS[room.feature] ?? "0");
        }
      }
      grid.push(row.join(" "));
    }
    return grid;
  }

  private statusData(): Record<string, number | string> {
    return {
      gold: this.player.gold,
      treasures: this.player.treasuresFound.size,
      flares: this.player.flares,
      protection: this.player.spells[Spell.PROTECTION] ?? 0,
      fireball: this.player.spells[Spell.FIREBALL] ?? 0,
      lightning: this.player.spells[Spell.LIGHTNING] ?? 0,
      weaken: this.player.spells[Spell.WEAKEN] ?? 0,
      teleport: this.player.spells[Spell.TELEPORT] ?? 0,
      armor: this.armorDisplayName(),
      weapon: this.player.weaponName,
      str: this.player.str_,
      dex: this.player.dex,
      iq: this.player.iq,
      hp: this.player.hp,
      mhp: this.player.mhp,
    };
  }

  private helpText(): string {
    return (
      "COMMAND SUMMARY:\n" +
      "Move: N=North  S=South  E=East  W=West  U=Up  D=Down\n" +
      "Act:  L=Look  O=Open chest  R=Read scroll  P=Potion  F=Flare  B=Buy\n" +
      "Info: M=Map  H=Help  X=eXit\n" +
      "\n" +
      "Encounter: F=Fight  R=Run  S=Spell\n" +
      "\n" +
      "MAP LEGEND:\n" +
      "0=Empty  m=Mirror  s=Scroll  c=Chest  f=Flares  p=Potion\n" +
      "v=Vendor  t=Thief  w=Warp  U=Up  D=Down  X=eXit\n" +
      "T=Treasure  M=Monster  *=You  ?=Unknown"
    );
  }

  private useMirror(): Event[] {
    const room = this.currentRoom();
    if (room.feature !== Feature.MIRROR) {
      return [Event.info("There is no mirror here.")];
    }
    if (this.rng.randint(1, 50) > this.player.iq) {
      const visions = [
        "The mirror is cloudy and yields no vision.",
        "You see yourself dead and lying in a black coffin.",
        "You see a dragon beckoning to you.",
        "You see the three heads of a chimaera grinning at you.",
        "You see the exit on the 7th floor, big and friendly-looking.",
      ];
      if (this.rng.randint(1, 10) <= 5) {
        return [Event.info(this.rng.choice(visions))];
      }
      const treasure = this.rng.randint(1, 10);
      const tx = this.rng.randint(1, Game.SIZE);
      const ty = this.rng.randint(1, Game.SIZE);
      const tz = this.rng.randint(1, Game.SIZE);
      return [
        Event.info(
          `You see the ${this.treasureName(treasure)} at ${tz},${ty},${tx}!`
        ),
      ];
    }

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
      return [Event.info("The mirror is cloudy and yields no vision.")];
    }
    const [treasure, z, y, x] = this.rng.choice(locations);
    return [
      Event.info(
        `You see the ${this.treasureName(treasure)} at ${z + 1},${y + 1},${x + 1}!`
      ),
    ];
  }

  private openChest(): Event[] {
    const room = this.currentRoom();
    if (room.feature !== Feature.CHEST) {
      return [Event.info("There is no chest here.")];
    }
    room.feature = Feature.EMPTY;
    const roll = this.rng.randint(1, 5);
    switch (roll) {
      case 1:
        return [Event.info("It containeth naught.")];
      case 2:
        if (this.player.armorTier > 0) {
          this.player.armorTier -= 1;
          this.player.armorDamaged = true;
        }
        return [Event.info("The perverse thing explodes, damaging your armor!")];
      default: {
        const gold = 10 + this.rng.randint(0, 20);
        this.player.gold += gold;
        return [Event.info(`You find ${gold} gold pieces!`)];
      }
    }
  }

  private readScroll(): Event[] {
    const room = this.currentRoom();
    if (room.feature !== Feature.SCROLL) {
      return [Event.info("Sorry. There is nothing to read here.")];
    }
    room.feature = Feature.EMPTY;
    const spell = this.rng.randint(1, 5) as Spell;
    this.player.spells[spell] = (this.player.spells[spell] ?? 0) + 1;
    return [Event.info(`The scroll contains the ${Spell[spell].toLowerCase()} spell.`)];
  }

  private drinkPotion(): Event[] {
    const room = this.currentRoom();
    if (room.feature !== Feature.POTION) {
      return [Event.info("There is no potion here, I fear.")];
    }
    room.feature = Feature.EMPTY;
    const roll = this.rng.randint(1, 5);
    if (roll === 1) {
      const heal = 5 + this.rng.randint(1, 10);
      this.player.hp = Math.min(this.player.mhp, this.player.hp + heal);
      return [Event.info("You drink the potion... healing results.")];
    }

    const effect = this.rng.choice(["STR", "DEX", "IQ", "MHP"]);
    let change = this.rng.randint(1, 6);
    if (this.rng.random() > 0.5) {
      change = -change;
    }
    this.player.applyAttributeChange({ target: effect, change });
    return [Event.info("You drink the potion... strange energies surge through you.")];
  }

  private openVendor(): Event[] {
    const room = this.currentRoom();
    if (room.feature !== Feature.VENDOR) {
      return [Event.info("There is no vendor here.")];
    }
    this.shopSession = new VendorSession({ rng: this.rng, player: this.player });
    return this.shopSession.startEvents();
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

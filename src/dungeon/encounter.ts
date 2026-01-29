import { Mode, MONSTER_NAMES, Spell, TREASURE_NAMES } from './constants.js';
import type { EncounterSave } from './serialization.js';
import type { Player, Room } from './model.js';
import { Event, PromptData } from './types.js';
import type { RandomSource } from './rng.js';

export interface EncounterResult {
  events: Event[];
  mode: Mode;
  relocate?: boolean;
  relocateAnyFloor?: boolean;
  enterRoom?: boolean;
}

function pluralize(count: number, singular: string, plural = `${singular}s`) {
  return count === 1 ? singular : plural;
}

export class EncounterSession {
  private rng: RandomSource;
  private player: Player;
  private room: Room;
  private monsterLevel: number;
  private monsterName: string;
  private vitality: number;
  private awaitingSpell = false;
  private debug: boolean;

  private constructor(options: {
    rng: RandomSource;
    player: Player;
    room: Room;
    monsterLevel: number;
    monsterName: string;
    vitality: number;
    debug: boolean;
  }) {
    this.rng = options.rng;
    this.player = options.player;
    this.room = options.room;
    this.monsterLevel = options.monsterLevel;
    this.monsterName = options.monsterName;
    this.vitality = options.vitality;
    this.debug = options.debug;
  }

  static start(options: {
    rng: RandomSource;
    player: Player;
    room: Room;
    debug: boolean;
  }): EncounterSession {
    const { rng, player, room, debug } = options;
    const level = room.monsterLevel;
    const name = MONSTER_NAMES[level - 1];
    const vitality = 3 * level + rng.randint(0, 3);
    player.fatigued = false;
    player.tempArmorBonus = 0;
    return new EncounterSession({
      rng,
      player,
      room,
      monsterLevel: level,
      monsterName: name,
      vitality,
      debug,
    });
  }

  static resume(options: {
    rng: RandomSource;
    player: Player;
    room: Room;
    debug: boolean;
    save: EncounterSave;
  }): EncounterSession {
    const { rng, player, room, debug, save } = options;
    const session = new EncounterSession({
      rng,
      player,
      room,
      monsterLevel: save.monsterLevel,
      monsterName: save.monsterName,
      vitality: save.vitality,
      debug,
    });
    session.awaitingSpell = save.awaitingSpell;
    return session;
  }

  startEvents(): Event[] {
    const events: Event[] = [
      Event.combat(`You are facing an angry ${this.monsterName}!`),
    ];
    if (this.debug) {
      events.push(this.debugMonsterEvent());
    }
    return events;
  }

  resumeEvents(): Event[] {
    if (this.awaitingSpell) {
      return [Event.prompt('Choose a spell:', this.spellMenu())];
    }
    return this.startEvents();
  }

  prompt(): string {
    if (this.awaitingSpell) {
      return '?> ';
    }
    return 'F/R/S> ';
  }

  toSave(): EncounterSave {
    return {
      monsterLevel: this.monsterLevel,
      monsterName: this.monsterName,
      vitality: this.vitality,
      awaitingSpell: this.awaitingSpell,
    };
  }

  step(raw: string): EncounterResult {
    if (this.awaitingSpell) {
      return this.withDebug(this.handleSpellChoice(raw));
    }
    if (!raw) {
      return this.withDebug({
        events: [Event.error("I don't understand that.")],
        mode: Mode.ENCOUNTER,
      });
    }
    const key = raw[0];
    switch (key) {
      case 'F':
        return this.withDebug(this.fightRound());
      case 'R':
        return this.withDebug(this.runAttempt());
      case 'S':
        this.awaitingSpell = true;
        return this.withDebug({
          events: [Event.prompt('Choose a spell:', this.spellMenu())],
          mode: Mode.ENCOUNTER,
        });
      default:
        return this.withDebug({
          events: [Event.error("I don't understand that.")],
          mode: Mode.ENCOUNTER,
        });
    }
  }

  attemptCancel(): EncounterResult {
    if (!this.awaitingSpell) {
      return this.withDebug({
        events: [Event.info("I don't understand that.")],
        mode: Mode.ENCOUNTER,
      });
    }
    this.awaitingSpell = false;
    return this.withDebug({
      events: [Event.info('You ready yourself for the fight.')],
      mode: Mode.ENCOUNTER,
    });
  }

  private withDebug(result: EncounterResult): EncounterResult {
    if (!this.debug) {
      return result;
    }
    return {
      events: [this.debugMonsterEvent(), ...result.events],
      mode: result.mode,
      relocate: result.relocate,
      relocateAnyFloor: result.relocateAnyFloor,
      enterRoom: result.enterRoom,
    };
  }

  private debugMonsterEvent(): Event {
    return Event.debug(
      `DEBUG MONSTER: name=${this.monsterName} level=${this.monsterLevel} vitality=${this.vitality}`
    );
  }

  private fightRound(): EncounterResult {
    const events: Event[] = [];
    const level = this.monsterLevel;
    const attackScore =
      20 + 5 * (11 - level) + this.player.dex + 3 * this.player.weaponTier;

    const roll = this.rng.randint(1, 100);
    if (this.debug) {
      events.push(
        Event.debug(
          `DEBUG FIGHT: attack_score=${attackScore} roll=${roll} ` +
            `weapon_tier=${this.player.weaponTier} st=${this.player.str} dx=${this.player.dex}`
        )
      );
    }
    if (roll > attackScore) {
      events.push(Event.combat(`The ${this.monsterName} evades your blow!`));
    } else {
      const damage = Math.max(
        this.player.weaponTier +
          Math.floor(this.player.str / 3) +
          this.rng.randint(0, 4) -
          2,
        1
      );
      this.vitality -= damage;
      events.push(Event.combat(`You hit the ${this.monsterName}!`));
      if (this.debug) {
        events.push(
          Event.debug(`DEBUG FIGHT: damage=${damage} vitality=${this.vitality}`)
        );
      }
      if (this.vitality <= 0) {
        return this.handleMonsterDeath(events);
      }
      if (this.rng.random() < 0.05 && this.player.weaponTier > 0) {
        this.player.weaponTier = 0;
        this.player.weaponName = '(None)';
        events.push(Event.info('Your weapon breaks with the impact!'));
      }
    }

    const [attackEvents, mode] = this.monsterAttack();
    events.push(...attackEvents);
    return { events, mode };
  }

  private runAttempt(): EncounterResult {
    if (this.player.fatigued) {
      return {
        events: [
          Event.info('You are quite fatigued after your previous efforts.'),
        ],
        mode: Mode.ENCOUNTER,
      };
    }
    if (this.rng.random() < 0.4) {
      const events = [
        Event.info(
          `You turn and flee, the vile ${this.monsterName} following close behind.`
        ),
        Event.info(
          `Suddenly, you realize that the ${this.monsterName} is no longer following you.`
        ),
      ];
      return {
        events,
        mode: Mode.EXPLORE,
        relocate: true,
        relocateAnyFloor: false,
        enterRoom: true,
      };
    }
    this.player.fatigued = true;
    return {
      events: [
        Event.info(
          'Although you run your hardest, your efforts to escape are made in vain.'
        ),
      ],
      mode: Mode.ENCOUNTER,
    };
  }

  private monsterAttack(): [Event[], Mode] {
    const events: Event[] = [];
    const level = this.monsterLevel;
    const dodgeScore = 20 + 5 * (11 - level) + 2 * this.player.dex;
    const roll = this.rng.randint(1, 100);
    if (this.debug) {
      events.push(
        Event.debug(
          `DEBUG MONSTER: dodge_score=${dodgeScore} roll=${roll} ` +
            `armor_tier=${this.player.armorTier} temp_armor_bonus=${this.player.tempArmorBonus}`
        )
      );
    }
    if (roll <= dodgeScore) {
      events.push(Event.combat('You deftly dodge the blow!'));
      return [events, Mode.ENCOUNTER];
    }

    const armor = this.player.armorTier + this.player.tempArmorBonus;
    const damage = Math.max(this.rng.randint(0, level - 1) + 3 - armor, 0);
    this.player.hp -= damage;
    events.push(Event.combat(`The ${this.monsterName} hits you!`));
    if (this.debug) {
      events.push(
        Event.debug(`DEBUG MONSTER: damage=${damage} hp=${this.player.hp}`)
      );
    }
    if (this.player.hp <= 0) {
      events.push(Event.info('YOU HAVE DIED.'));
      return [events, Mode.GAME_OVER];
    }
    return [events, Mode.ENCOUNTER];
  }

  private handleMonsterDeath(events: Event[]): EncounterResult {
    events.push(Event.combat(`The foul ${this.monsterName} expires.`));
    if (this.rng.random() > 0.7) {
      events.push(
        Event.combat(
          `As he dies, though, he launches one final desperate attack.`
        )
      );
      const [attackEvents, mode] = this.monsterAttack();
      events.push(...attackEvents);
      if (mode === Mode.GAME_OVER) {
        this.room.monsterLevel = 0;
        this.monsterLevel = 0;
        this.monsterName = '';
        this.vitality = 0;
        return { events, mode };
      }
    }

    if (this.room.treasureId) {
      events.push(...this.awardTreasure(this.room.treasureId));
      this.room.treasureId = 0;
    } else {
      const gold = 5 * this.monsterLevel + this.rng.randint(0, 20);
      this.player.gold += gold;
      events.push(
        Event.loot(`You find ${gold} gold ${pluralize(gold, 'piece')}.`)
      );
    }

    this.room.monsterLevel = 0;
    this.monsterLevel = 0;
    this.monsterName = '';
    this.vitality = 0;
    return { events, mode: Mode.EXPLORE };
  }

  private handleSpellChoice(raw: string): EncounterResult {
    this.awaitingSpell = false;
    const key = raw[0];
    const spellMap: Record<string, Spell> = {
      P: Spell.PROTECTION,
      F: Spell.FIREBALL,
      L: Spell.LIGHTNING,
      W: Spell.WEAKEN,
      T: Spell.TELEPORT,
    };
    const spell = spellMap[key];
    if (!spell) {
      return {
        events: [Event.error('Choose P/F/L/W/T or Esc to cancel.')],
        mode: Mode.ENCOUNTER,
      };
    }
    const charges = this.player.spells[spell] ?? 0;
    if (this.player.iq < 12) {
      return {
        events: [Event.info('You have insufficient intelligence.')],
        mode: Mode.ENCOUNTER,
      };
    }
    if (charges <= 0) {
      return {
        events: [Event.info('You know not that spell.')],
        mode: Mode.ENCOUNTER,
      };
    }

    this.player.spells[spell] = charges - 1;
    return this.castSpell(spell);
  }

  private spellMenu(): PromptData {
    const spells = this.player.spells;
    const iqTooLow = this.player.iq < 12;
    const options = [
      {
        key: 'P',
        label: `Protection (${spells[Spell.PROTECTION] ?? 0})`,
        disabled: iqTooLow || (spells[Spell.PROTECTION] ?? 0) <= 0,
      },
      {
        key: 'F',
        label: `Fireball (${spells[Spell.FIREBALL] ?? 0})`,
        disabled: iqTooLow || (spells[Spell.FIREBALL] ?? 0) <= 0,
      },
      {
        key: 'L',
        label: `Lightning (${spells[Spell.LIGHTNING] ?? 0})`,
        disabled: iqTooLow || (spells[Spell.LIGHTNING] ?? 0) <= 0,
      },
      {
        key: 'W',
        label: `Weaken (${spells[Spell.WEAKEN] ?? 0})`,
        disabled: iqTooLow || (spells[Spell.WEAKEN] ?? 0) <= 0,
      },
      {
        key: 'T',
        label: `Teleport (${spells[Spell.TELEPORT] ?? 0})`,
        disabled: iqTooLow || (spells[Spell.TELEPORT] ?? 0) <= 0,
      },
    ];
    return {
      type: 'spell',
      options,
      hasCancel: true,
    };
  }

  private castSpell(spell: Spell): EncounterResult {
    const events: Event[] = [];
    switch (spell) {
      case Spell.PROTECTION: {
        this.player.tempArmorBonus += 3;
        events.push(
          Event.info('Your armour glows briefly in response to your spell.')
        );
        if (this.debug) {
          events.push(
            Event.debug(
              `DEBUG SPELL: protection_bonus=3 temp_armor_bonus=${this.player.tempArmorBonus}`
            )
          );
        }
        const [attackEvents, mode] = this.monsterAttack();
        events.push(...attackEvents);
        return { events, mode };
      }
      case Spell.FIREBALL: {
        const roll = this.rng.randint(1, 5);
        const damage = Math.max(roll - Math.floor(this.player.iq / 3), 0);
        this.vitality -= damage;
        if (this.debug) {
          events.push(
            Event.debug(
              `DEBUG SPELL: fireball_roll=${roll} iq=${this.player.iq} damage=${damage} vitality=${this.vitality}`
            )
          );
        }
        events.push(
          Event.combat(
            `A glowing ball of fire converges with the ${this.monsterName}.`
          )
        );
        break;
      }
      case Spell.LIGHTNING: {
        const roll = this.rng.randint(1, 10);
        const damage = Math.max(roll - Math.floor(this.player.iq / 2), 0);
        this.vitality -= damage;
        if (this.debug) {
          events.push(
            Event.debug(
              `DEBUG SPELL: lightning_roll=${roll} iq=${this.player.iq} damage=${damage} vitality=${this.vitality}`
            )
          );
        }
        events.push(Event.combat(`The ${this.monsterName} is thunderstruck!`));
        break;
      }
      case Spell.WEAKEN: {
        this.vitality = Math.floor(this.vitality / 2);
        if (this.debug) {
          events.push(
            Event.debug(`DEBUG SPELL: weakened_vitality=${this.vitality}`)
          );
        }
        events.push(
          Event.combat(
            `A green mist envelops the ${this.monsterName}, depriving him of half his vitality.`
          )
        );
        break;
      }
      case Spell.TELEPORT: {
        events.push(
          Event.info(
            'Thy surroundings vibrate momentarily, as you are magically transported elsewhere...'
          )
        );
        this.monsterLevel = 0;
        this.monsterName = '';
        this.vitality = 0;
        if (this.debug) {
          events.push(Event.debug('DEBUG SPELL: teleport'));
        }
        return {
          events,
          mode: Mode.EXPLORE,
          relocate: true,
          relocateAnyFloor: false,
          enterRoom: true,
        };
      }
      default:
        break;
    }

    if (this.vitality <= 0) {
      return this.handleMonsterDeath(events);
    }
    const [attackEvents, mode] = this.monsterAttack();
    events.push(...attackEvents);
    return { events, mode };
  }

  private awardTreasure(treasureId: number): Event[] {
    if (this.player.treasuresFound.has(treasureId)) {
      return [];
    }
    this.player.treasuresFound.add(treasureId);
    return [Event.loot(`You find the ${TREASURE_NAMES[treasureId - 1]}!`)];
  }
}

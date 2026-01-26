import { Mode, MONSTER_NAMES, Spell, TREASURE_NAMES } from './constants.js';
import type { Player, Room } from './model.js';
import { Event } from './types.js';
import type { RandomSource } from './rng.js';

export interface EncounterResult {
  events: Event[];
  mode: Mode;
  relocate?: boolean;
  relocateAnyFloor?: boolean;
  enterRoom?: boolean;
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

  startEvents(): Event[] {
    const events: Event[] = [
      Event.combat(`You are facing an angry ${this.monsterName}!`),
      Event.info('Encounter mode: F=Fight  R=Run  S=Spell'),
    ];
    if (this.debug) {
      events.push(this.debugMonsterEvent());
    }
    return events;
  }

  prompt(): string {
    if (this.awaitingSpell) {
      return '?> ';
    }
    return 'F/R/S> ';
  }

  step(raw: string): EncounterResult {
    const withDebug = (result: EncounterResult): EncounterResult => {
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
    };

    if (this.awaitingSpell) {
      return withDebug(this.handleSpellChoice(raw));
    }
    if (!raw) {
      return withDebug({
        events: [Event.error("I don't understand that.")],
        mode: Mode.ENCOUNTER,
      });
    }
    const key = raw[0];
    switch (key) {
      case 'F':
        return withDebug(this.fightRound());
      case 'R':
        return withDebug(this.runAttempt());
      case 'S':
        this.awaitingSpell = true;
        return withDebug({
          events: [Event.prompt('Choose a spell:', this.spellMenu())],
          mode: Mode.ENCOUNTER,
        });
      default:
        return withDebug({
          events: [Event.error("I don't understand that.")],
          mode: Mode.ENCOUNTER,
        });
    }
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
            `weapon_tier=${this.player.weaponTier} str=${this.player.str_} dex=${this.player.dex}`
        )
      );
    }
    if (roll > attackScore) {
      events.push(Event.combat(`The ${this.monsterName} evades your blow!`));
    } else {
      const damage = Math.max(
        this.player.weaponTier +
          Math.floor(this.player.str_ / 3) +
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
        this.player.weaponName = '(Broken)';
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
        Event.info('You slip away and the monster no longer follows.'),
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
        Event.combat('As it dies, it launches one final desperate attack.')
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
      events.push(Event.loot(`You found ${gold} gold pieces.`));
    }

    this.room.monsterLevel = 0;
    this.monsterLevel = 0;
    this.monsterName = '';
    this.vitality = 0;
    return { events, mode: Mode.EXPLORE };
  }

  private handleSpellChoice(raw: string): EncounterResult {
    this.awaitingSpell = false;
    if (!['1', '2', '3', '4', '5'].includes(raw)) {
      return { events: [Event.error('Choose 1..5.')], mode: Mode.ENCOUNTER };
    }
    const spell = Number(raw) as Spell;
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

  private spellMenu(): Record<string, unknown> {
    const spells = this.player.spells;
    return {
      type: 'spell',
      options: {
        protection: spells[Spell.PROTECTION] ?? 0,
        fireball: spells[Spell.FIREBALL] ?? 0,
        lightning: spells[Spell.LIGHTNING] ?? 0,
        weaken: spells[Spell.WEAKEN] ?? 0,
        teleport: spells[Spell.TELEPORT] ?? 0,
      },
    };
  }

  private castSpell(spell: Spell): EncounterResult {
    const events: Event[] = [];
    switch (spell) {
      case Spell.PROTECTION: {
        this.player.tempArmorBonus += 3;
        events.push(
          Event.info('Your armor glows briefly in response to your spell.')
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
          Event.combat(`A ball of fire scorches the ${this.monsterName}.`)
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
        events.push(Event.combat('A green mist envelops your foe.'));
        break;
      }
      case Spell.TELEPORT: {
        events.push(
          Event.info(
            'Thy surroundings vibrate as you are transported elsewhere...'
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

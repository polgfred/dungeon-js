import { monsterName, Spell, SPELL_MIN_IQ, spellName } from './constants.js';
import type { EncounterSave } from './serialization.js';
import type { Player, Room } from './model.js';
import { Event, type PromptData } from './types.js';
import type { RandomSource } from './rng.js';

export function rollMonsterVitality(rng: RandomSource, level: number): number {
  return 3 * level + rng.randint(0, 3);
}

export interface EncounterResult {
  events: Event[];
  done?: boolean;
  defeatedMonster?: boolean;
  relocate?: boolean;
  relocateAnyFloor?: boolean;
  relocateAvoidMonsters?: boolean;
  enterRoom?: boolean;
}

export interface EncounterCancelResult {
  events: Event[];
}

const spellMap: Readonly<Record<string, Spell>> = Object.freeze({
  P: Spell.PROTECTION,
  F: Spell.FIREBALL,
  L: Spell.LIGHTNING,
  W: Spell.WEAKEN,
  T: Spell.TELEPORT,
});

function resetPlayerAfterEncounter(player: Player) {
  player.fatigued = false;
  player.tempArmorBonus = 0;
}

export class EncounterSession {
  private rng: RandomSource;
  private player: Player;
  private room: Room;
  private awaitingSpell = false;
  private debug: boolean;

  private get monsterLevel(): number {
    return this.room.monsterLevel;
  }

  private get monsterName(): string {
    return monsterName(this.room.monsterLevel);
  }

  private get vitality(): number {
    return this.room.monsterVitality;
  }

  private set vitality(value: number) {
    this.room.monsterVitality = value;
  }

  private constructor(options: {
    rng: RandomSource;
    player: Player;
    room: Room;
    debug: boolean;
  }) {
    this.rng = options.rng;
    this.player = options.player;
    this.room = options.room;
    this.debug = options.debug;
  }

  static start(options: {
    rng: RandomSource;
    player: Player;
    room: Room;
    debug: boolean;
  }): EncounterSession {
    const { rng, player, room, debug } = options;
    player.fatigued = false;
    player.tempArmorBonus = 0;
    return new EncounterSession({ rng, player, room, debug });
  }

  static resume(options: {
    rng: RandomSource;
    player: Player;
    room: Room;
    debug: boolean;
    save: EncounterSave;
  }): EncounterSession {
    const { rng, player, room, debug, save } = options;
    const session = new EncounterSession({ rng, player, room, debug });
    session.awaitingSpell = save.awaitingSpell;
    return session;
  }

  viewEvents(): Event[] {
    if (this.awaitingSpell) {
      return [Event.prompt('Choose a spell:', this.spellMenu())];
    }
    const events: Event[] = [
      Event.combat(
        `You are facing an angry ${this.monsterName}!`,
        `<@> is facing an angry ${this.monsterName}!`
      ),
    ];
    if (this.debug) {
      events.push(this.debugMonsterEvent());
    }
    return events;
  }

  toSave(): EncounterSave {
    return {
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
        });
      default:
        return this.withDebug({
          events: [Event.error("I don't understand that.")],
        });
    }
  }

  attemptCancel(): EncounterCancelResult {
    if (!this.awaitingSpell) {
      return this.withDebug({
        events: [Event.info("I don't understand that.")],
      });
    }
    this.awaitingSpell = false;
    return this.withDebug({
      events: [],
    });
  }

  private withDebug(result: EncounterResult): EncounterResult {
    if (!this.debug) {
      return result;
    }
    result.events.push(this.debugMonsterEvent());
    return result;
  }

  private debugMonsterEvent(): Event {
    return Event.debug({
      scope: 'monster',
      action: 'state',
      name: this.monsterName,
      level: this.monsterLevel,
      vitality: this.vitality,
    });
  }

  private fightRound(): EncounterResult {
    const events: Event[] = [];
    const level = this.monsterLevel;
    const attackScore =
      20 + 5 * (11 - level) + this.player.dex + 3 * this.player.weaponTier;

    const roll = this.rng.randint(1, 100);
    if (this.debug) {
      events.push(
        Event.debug({
          scope: 'fight',
          action: 'attack_roll',
          attackScore,
          roll,
          weaponTier: this.player.weaponTier,
          st: this.player.str,
          dx: this.player.dex,
        })
      );
    }
    if (roll > attackScore) {
      events.push(
        Event.combat(
          `The ${this.monsterName} evades your blow!`,
          `<@> misses the ${this.monsterName}!`
        )
      );
    } else {
      const damage = Math.max(
        this.player.weaponTier +
          Math.floor(this.player.str / 3) +
          this.rng.randint(0, 4) -
          2,
        1
      );
      this.vitality -= damage;
      events.push(
        Event.combat(
          `You hit the ${this.monsterName}!`,
          `<@> hits the ${this.monsterName}!`
        )
      );
      if (this.debug) {
        events.push(
          Event.debug({
            scope: 'fight',
            action: 'damage',
            damage,
            vitality: this.vitality,
          })
        );
      }
      if (this.vitality <= 0) {
        return this.defeatMonster(
          events,
          Event.combat(
            `The foul ${this.monsterName} expires.`,
            `<@> slays the foul ${this.monsterName}.`
          ),
          { desperateAttack: true }
        );
      }
      if (this.rng.random() < 0.05 && this.player.weaponTier > 0) {
        this.player.weaponTier = 0;
        this.player.weaponBroken = true;
        events.push(
          Event.info(
            'Your weapon breaks with the impact!',
            "<@>'s weapon breaks with the impact!"
          )
        );
      }
    }

    const attackResult = this.monsterAttack();
    events.push(...attackResult.events);
    return {
      events,
      done: attackResult.done,
    };
  }

  private runAttempt(): EncounterResult {
    if (this.player.fatigued) {
      return {
        events: [
          Event.info('You are quite fatigued after your previous efforts.'),
        ],
      };
    }
    if (this.rng.random() < 0.4) {
      const events = [
        Event.info(
          `You turn and flee, the vile ${this.monsterName} following close behind.`,
          `<@> flees the ${this.monsterName}.`
        ),
        Event.info(
          `Suddenly, you realize that the ${this.monsterName} is no longer following you.`
        ),
      ];
      resetPlayerAfterEncounter(this.player);
      return {
        events,
        done: true,
        relocate: true,
        relocateAnyFloor: false,
        enterRoom: true,
      };
    }
    this.player.fatigued = true;
    return {
      events: [
        Event.info(
          'Although you run your hardest, your efforts to escape are made in vain.',
          `<@> is unable to flee the ${this.monsterName}.`
        ),
      ],
    };
  }

  private monsterAttack(): { events: Event[]; done?: boolean } {
    const events: Event[] = [];
    const level = this.monsterLevel;
    const dodgeScore = 20 + 5 * (11 - level) + 2 * this.player.dex;
    const roll = this.rng.randint(1, 100);
    if (this.debug) {
      events.push(
        Event.debug({
          scope: 'monster',
          action: 'dodge_roll',
          dodgeScore,
          roll,
          armorTier: this.player.armorTier,
          tempArmorBonus: this.player.tempArmorBonus,
        })
      );
    }
    if (roll <= dodgeScore) {
      events.push(
        Event.combat('You deftly dodge the blow!', '<@> deftly dodges the blow!')
      );
      return { events };
    }

    const armor = this.player.armorTier + this.player.tempArmorBonus;
    const damage = Math.max(
      this.rng.randint(0, level - 1) + Math.floor(2.5 + level / 3) - armor,
      0
    );
    this.player.hp = Math.max(0, this.player.hp - damage);
    events.push(
      Event.combat(
        `The ${this.monsterName} hits you!`,
        `The ${this.monsterName} hits <@>!`
      )
    );
    if (this.debug) {
      events.push(
        Event.debug({
          scope: 'monster',
          action: 'damage',
          damage,
          hp: this.player.hp,
        })
      );
    }
    if (this.player.hp <= 0) {
      events.push(Event.info('YOU HAVE DIED.', '<@> HAS DIED.'));
      return {
        events,
        done: true,
      };
    }
    return { events };
  }

  private defeatMonster(
    events: Event[],
    death: Event,
    opts: { desperateAttack?: boolean } = {}
  ): EncounterResult {
    events.push(death);
    if (opts.desperateAttack && this.rng.random() > 0.7) {
      events.push(
        Event.combat(
          `As he dies, though, he launches one final desperate attack.`
        )
      );
      events.push(...this.monsterAttack().events);
    }
    this.vitality = 0;
    resetPlayerAfterEncounter(this.player);
    return { events, done: true, defeatedMonster: true };
  }

  private handleSpellChoice(raw: string): EncounterResult {
    this.awaitingSpell = false;
    const key = raw[0];
    const spell = spellMap[key];
    if (!spell) {
      return {
        events: [Event.error('Choose P/F/L/W/T or Esc to cancel.')],
      };
    }
    const charges = this.player.spells[spell] ?? 0;
    if (this.player.iq < SPELL_MIN_IQ) {
      return {
        events: [Event.info('You have insufficient intellect.')],
      };
    }
    if (charges <= 0) {
      return {
        events: [Event.info('You know not that spell.')],
      };
    }

    this.player.spells[spell] = charges - 1;
    return this.castSpell(spell);
  }

  private spellMenu(): PromptData {
    const spells = this.player.spells;
    const iqTooLow = this.player.iq < SPELL_MIN_IQ;
    const options = Object.entries(spellMap).map(([key, spell]) => ({
      key,
      label: `${spellName(spell)} (${spells[spell] ?? 0})`,
      disabled: iqTooLow || (spells[spell] ?? 0) <= 0,
    }));
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
        const protection =
          this.player.armorTier > 0
            ? 'Your armour glows briefly in response to your spell.'
            : 'Your clothes glow briefly, becoming, temporarily, armour.';
        events.push(Event.info(protection, `<@> casts a protection spell.`));
        if (this.debug) {
          events.push(
            Event.debug({
              scope: 'spell',
              spell: 'protection',
              protectionBonus: 3,
              tempArmorBonus: this.player.tempArmorBonus,
            })
          );
        }
        break;
      }
      case Spell.FIREBALL: {
        const roll = this.rng.randint(1, 5);
        const damage = roll + Math.floor(this.player.iq / 3);
        this.vitality -= damage;
        if (this.debug) {
          events.push(
            Event.debug({
              scope: 'spell',
              spell: 'fireball',
              roll,
              damage,
              iq: this.player.iq,
              vitality: this.vitality,
            })
          );
        }
        events.push(
          Event.combat(
            `A glowing ball of fire converges with the ${this.monsterName}.`,
            `<@> casts a fireball spell.`
          )
        );
        if (this.vitality <= 0) {
          return this.defeatMonster(
            events,
            Event.combat(
              `The ${this.monsterName} evaporates in a magnificent pyrotechnic display.`,
              `<@> slays the foul ${this.monsterName}.`
            )
          );
        }
        break;
      }
      case Spell.LIGHTNING: {
        const roll = this.rng.randint(1, 10);
        const damage = roll + Math.floor(this.player.iq / 2);
        this.vitality -= damage;
        if (this.debug) {
          events.push(
            Event.debug({
              scope: 'spell',
              spell: 'lightning',
              roll,
              damage,
              iq: this.player.iq,
              vitality: this.vitality,
            })
          );
        }
        events.push(
          Event.combat(
            `The ${this.monsterName} is thunderstruck!`,
            `<@> casts a lightning spell.`
          )
        );
        if (this.vitality <= 0) {
          return this.defeatMonster(
            events,
            Event.combat(
              `The massive electrical charge proves lethal to the ${this.monsterName}.`,
              `<@> slays the foul ${this.monsterName}.`
            )
          );
        }
        break;
      }
      case Spell.WEAKEN: {
        this.vitality = Math.floor(this.vitality / 2);
        if (this.debug) {
          events.push(
            Event.debug({
              scope: 'spell',
              spell: 'weaken',
              vitality: this.vitality,
            })
          );
        }
        events.push(
          Event.combat(
            `A green mist envelops the ${this.monsterName}, depriving him of half his vitality.`,
            `<@> casts a weaken spell.`
          )
        );
        if (this.vitality <= 0) {
          return this.defeatMonster(
            events,
            Event.combat(
              `Seeing that the ${this.monsterName} had barely any energy to begin with, its death is no surprise.`,
              `<@> slays the foul ${this.monsterName}.`
            )
          );
        }
        break;
      }
      case Spell.TELEPORT: {
        events.push(
          Event.info(
            'Thy surroundings vibrate momentarily, as you are magically transported elsewhere...',
            `<@> casts a teleport spell.`
          )
        );
        resetPlayerAfterEncounter(this.player);
        if (this.debug) {
          events.push(
            Event.debug({
              scope: 'spell',
              spell: 'teleport',
            })
          );
        }
        return {
          events,
          done: true,
          relocate: true,
          relocateAnyFloor: false,
          relocateAvoidMonsters: true,
          enterRoom: true,
        };
      }
      default:
        break;
    }

    // The spell didn't kill (or protection) — the monster strikes back.
    const attackResult = this.monsterAttack();
    events.push(...attackResult.events);
    return {
      events,
      done: attackResult.done,
    };
  }
}

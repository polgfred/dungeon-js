import { MONSTER_NAMES, Spell } from './constants.js';
import type { EncounterSave } from './serialization.js';
import type { Player } from './model.js';
import { Event, PromptData } from './types.js';
import type { RandomSource } from './rng.js';

export interface EncounterResult {
  events: Event[];
  done?: boolean;
  defeatedMonster?: boolean;
  relocate?: boolean;
  relocateAnyFloor?: boolean;
  enterRoom?: boolean;
}

export interface EncounterCancelResult {
  events: Event[];
}

function resetPlayerAfterEncounter(player: Player) {
  player.fatigued = false;
  player.tempArmorBonus = 0;
}

export class EncounterSession {
  private rng: RandomSource;
  private player: Player;
  private monsterLevel: number;
  private monsterName: string;
  private vitality: number;
  private awaitingSpell = false;
  private debug: boolean;

  private constructor(options: {
    rng: RandomSource;
    player: Player;
    monsterLevel: number;
    monsterName: string;
    vitality: number;
    debug: boolean;
  }) {
    this.rng = options.rng;
    this.player = options.player;
    this.monsterLevel = options.monsterLevel;
    this.monsterName = options.monsterName;
    this.vitality = options.vitality;
    this.debug = options.debug;
  }

  static start(options: {
    rng: RandomSource;
    player: Player;
    monsterLevel: number;
    debug: boolean;
  }): EncounterSession {
    const { rng, player, monsterLevel, debug } = options;
    const level = monsterLevel;
    const name = MONSTER_NAMES[level - 1];
    const vitality = 3 * level + rng.randint(0, 3);
    player.fatigued = false;
    player.tempArmorBonus = 0;
    return new EncounterSession({
      rng,
      player,
      monsterLevel: level,
      monsterName: name,
      vitality,
      debug,
    });
  }

  static resume(options: {
    rng: RandomSource;
    player: Player;
    debug: boolean;
    save: EncounterSave;
  }): EncounterSession {
    const { rng, player, debug, save } = options;
    const session = new EncounterSession({
      rng,
      player,
      monsterLevel: save.monsterLevel,
      monsterName: save.monsterName,
      vitality: save.vitality,
      debug,
    });
    session.awaitingSpell = save.awaitingSpell;
    return session;
  }

  viewEvents(): Event[] {
    if (this.awaitingSpell) {
      return [Event.prompt('Choose a spell:', this.spellMenu())];
    }
    const events: Event[] = [
      Event.combat(`You are facing an angry ${this.monsterName}!`),
    ];
    if (this.debug) {
      events.push(this.debugMonsterEvent());
    }
    return events;
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
      events: [Event.info('You ready yourself for the fight.')],
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
          Event.debug({
            scope: 'fight',
            action: 'damage',
            damage,
            vitality: this.vitality,
          })
        );
      }
      if (this.vitality <= 0) {
        return this.handleMonsterDeath(events);
      }
      if (this.rng.random() < 0.05 && this.player.weaponTier > 0) {
        this.player.weaponTier = 0;
        this.player.weaponBroken = true;
        events.push(Event.info('Your weapon breaks with the impact!'));
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
          `You turn and flee, the vile ${this.monsterName} following close behind.`
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
          'Although you run your hardest, your efforts to escape are made in vain.'
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
      events.push(Event.combat('You deftly dodge the blow!'));
      return { events };
    }

    const armor = this.player.armorTier + this.player.tempArmorBonus;
    const damage = Math.max(
      this.rng.randint(0, level - 1) + Math.floor(2.5 + level / 3) - armor,
      0
    );
    this.player.hp -= damage;
    events.push(Event.combat(`The ${this.monsterName} hits you!`));
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
      events.push(Event.info('YOU HAVE DIED.'));
      return {
        events,
        done: true,
      };
    }
    return { events };
  }

  private handleMonsterDeath(events: Event[]): EncounterResult {
    events.push(Event.combat(`The foul ${this.monsterName} expires.`));
    if (this.rng.random() > 0.7) {
      events.push(
        Event.combat(
          `As he dies, though, he launches one final desperate attack.`
        )
      );
      const attackResult = this.monsterAttack();
      events.push(...attackResult.events);
      if (attackResult.done) {
        this.monsterLevel = 0;
        this.monsterName = '';
        this.vitality = 0;
        return {
          events,
          done: true,
          defeatedMonster: true,
        };
      }
    }

    this.monsterLevel = 0;
    this.monsterName = '';
    this.vitality = 0;
    resetPlayerAfterEncounter(this.player);
    return {
      events,
      done: true,
      defeatedMonster: true,
    };
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
      };
    }
    const charges = this.player.spells[spell] ?? 0;
    if (this.player.iq < 12) {
      return {
        events: [Event.info('You have insufficient intelligence.')],
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
          this.player.armorTier > 0
            ? Event.info('Your armour glows briefly in response to your spell.')
            : Event.info(
                'Your clothes glow briefly, becoming, temporarily, armour.'
              )
        );
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
            `A glowing ball of fire converges with the ${this.monsterName}.`
          )
        );
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
        events.push(Event.combat(`The ${this.monsterName} is thunderstruck!`));
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
          enterRoom: true,
        };
      }
      default:
        break;
    }

    if (this.vitality <= 0) {
      return this.handleMonsterDeath(events);
    }
    const attackResult = this.monsterAttack();
    events.push(...attackResult.events);
    return {
      events,
      done: attackResult.done,
    };
  }
}

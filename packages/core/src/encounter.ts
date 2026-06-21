import { monsterName, Spell, SPELL_MIN_IQ, spellName } from './constants.js';
import type { EncounterSave } from './serialization.js';
import type { Player, Room } from './model.js';
import { Event, makePrompt, type Prompt, type PromptData } from './types.js';
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
  }) {
    this.rng = options.rng;
    this.player = options.player;
    this.room = options.room;
  }

  static start(options: {
    rng: RandomSource;
    player: Player;
    room: Room;
  }): EncounterSession {
    const { rng, player, room } = options;
    player.fatigued = false;
    player.tempArmorBonus = 0;
    return new EncounterSession({ rng, player, room });
  }

  static fromSave(options: {
    rng: RandomSource;
    player: Player;
    room: Room;
    save: EncounterSave;
  }): EncounterSession {
    const session = new EncounterSession({
      rng: options.rng,
      player: options.player,
      room: options.room,
    });
    session.awaitingSpell = options.save.awaitingSpell;
    return session;
  }

  toSave(): EncounterSave {
    return {
      awaitingSpell: this.awaitingSpell,
    };
  }

  viewEvents(): Event[] {
    if (this.awaitingSpell) return [];
    return [
      Event.combat(
        `You are facing an angry ${this.monsterName}!`,
        `<@> is facing an angry ${this.monsterName}!`
      ),
    ];
  }

  prompt(): Prompt | null {
    return this.awaitingSpell
      ? makePrompt('Choose a spell:', this.spellMenu())
      : null;
  }

  step(raw: string): EncounterResult {
    if (this.awaitingSpell) {
      return this.handleSpellChoice(raw);
    }
    if (!raw) {
      return { events: [Event.error("I don't understand that.")] };
    }
    const key = raw[0];
    switch (key) {
      case 'F':
        return this.fightRound();
      case 'R':
        return this.runAttempt();
      case 'S':
        this.awaitingSpell = true;
        return { events: [] };
      default:
        return { events: [Event.error("I don't understand that.")] };
    }
  }

  attemptCancel(): EncounterCancelResult {
    if (!this.awaitingSpell) {
      return { events: [Event.info("I don't understand that.")] };
    }
    this.awaitingSpell = false;
    return { events: [] };
  }

  private fightRound(): EncounterResult {
    const events: Event[] = [];
    const level = this.monsterLevel;
    const attackScore =
      20 + 5 * (11 - level) + this.player.dex + 3 * this.player.weaponTier;

    const roll = this.rng.randint(1, 100);
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
    if (roll <= dodgeScore) {
      events.push(Event.combat('You deftly dodge the blow!'));
      return { events };
    }

    const armor = this.player.armorTier + this.player.tempArmorBonus;
    const damage = Math.max(
      this.rng.randint(0, level - 1) + Math.floor(2.5 + level / 3) - armor,
      0
    );
    this.player.hp = Math.max(0, this.player.hp - damage);
    events.push(Event.combat(`The ${this.monsterName} hits you!`));
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
      const attackResult = this.monsterAttack();
      events.push(...attackResult.events);
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
    const charges = this.player.spells.get(spell) ?? 0;
    if (this.player.iq < SPELL_MIN_IQ) {
      return {
        events: [Event.info('You have insufficient intelligence.')],
      };
    }
    if (charges <= 0) {
      return {
        events: [Event.info('You know not that spell.')],
      };
    }

    this.player.spells.set(spell, charges - 1);
    return this.castSpell(spell);
  }

  private spellMenu(): PromptData {
    const spells = this.player.spells;
    const iqTooLow = this.player.iq < SPELL_MIN_IQ;
    const options = Object.entries(spellMap).map(([key, spell]) => ({
      key,
      label: spellName(spell),
      note: `${spells.get(spell) ?? 0}`,
      disabled: iqTooLow || (spells.get(spell) ?? 0) <= 0,
    }));
    return {
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
          Event.info(
            this.player.armorTier > 0
              ? 'Your armour glows briefly in response to your spell.'
              : 'Your clothes glow briefly, becoming, temporarily, armour.'
          )
        );
        break;
      }
      case Spell.FIREBALL: {
        const roll = this.rng.randint(1, 5);
        const damage = roll + Math.floor(this.player.iq / 3);
        this.vitality -= damage;
        events.push(
          Event.combat(
            `A glowing ball of fire converges with the ${this.monsterName}.`
          )
        );
        if (this.vitality <= 0) {
          return this.defeatMonster(
            events,
            Event.combat(
              `The ${this.monsterName} evaporates in a magnificent pyrotechnic display.`,
              `<@> slays the ${this.monsterName} with a fireball spell.`
            )
          );
        }
        break;
      }
      case Spell.LIGHTNING: {
        const roll = this.rng.randint(1, 10);
        const damage = roll + Math.floor(this.player.iq / 2);
        this.vitality -= damage;
        events.push(Event.combat(`The ${this.monsterName} is thunderstruck!`));
        if (this.vitality <= 0) {
          return this.defeatMonster(
            events,
            Event.combat(
              `The massive electrical charge proves lethal to the ${this.monsterName}.`,
              `<@> slays the ${this.monsterName} with a lightning spell.`
            )
          );
        }
        break;
      }
      case Spell.WEAKEN: {
        this.vitality = Math.floor(this.vitality / 2);
        events.push(
          Event.combat(
            `A green mist envelops the ${this.monsterName}, depriving him of half his vitality.`
          )
        );
        if (this.vitality <= 0) {
          return this.defeatMonster(
            events,
            Event.combat(
              `Seeing that the ${this.monsterName} had barely any energy to begin with, its death is no surprise.`,
              `<@> slays the ${this.monsterName} with a weaken spell.`
            )
          );
        }
        break;
      }
      case Spell.TELEPORT: {
        events.push(
          Event.info(
            'Thy surroundings vibrate momentarily, as you are magically transported elsewhere...'
          )
        );
        resetPlayerAfterEncounter(this.player);
        return {
          events,
          done: true,
          relocate: true,
          relocateAnyFloor: false,
          relocateAvoidMonsters: true,
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

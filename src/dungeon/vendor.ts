import {
  ARMOR_NAMES,
  ARMOR_PRICES,
  POTION_PRICES,
  SPELL_PRICES,
  WEAPON_NAMES,
  WEAPON_PRICES,
  Race,
  Spell,
} from './constants.js';
import type { VendorSave } from './serialization.js';
import type { Player } from './model.js';
import { Event } from './types.js';
import type { RandomSource } from './rng.js';

export interface VendorResult {
  events: Event[];
  done?: boolean;
}

const raceLabel = (race: Race): string => {
  switch (race) {
    case Race.HUMAN:
      return 'Human';
    case Race.DWARF:
      return 'Dwarf';
    case Race.ELF:
      return 'Elf';
    case Race.HALFLING:
      return 'Halfling';
    default:
      return 'Adventurer';
  }
};

export class VendorSession {
  private rng: RandomSource;
  private player: Player;
  private phase: 'category' | 'item' | 'attribute' = 'category';
  private category: string | null = null;

  constructor(options: { rng: RandomSource; player: Player }) {
    this.rng = options.rng;
    this.player = options.player;
  }

  static resume(options: {
    rng: RandomSource;
    player: Player;
    save: VendorSave;
  }): VendorSession {
    const session = new VendorSession({
      rng: options.rng,
      player: options.player,
    });
    session.phase = options.save.phase;
    session.category = options.save.category;
    return session;
  }

  startEvents(): Event[] {
    return [this.categoryPrompt()];
  }

  resumeEvents(): Event[] {
    switch (this.phase) {
      case 'item':
        return [this.itemPrompt()];
      case 'attribute':
        return [this.attributePrompt()];
      case 'category':
      default:
        return [this.categoryPrompt()];
    }
  }

  prompt(): string {
    return '?> ';
  }

  toSave(): VendorSave {
    return {
      phase: this.phase,
      category: this.category,
    };
  }

  step(raw: string): VendorResult {
    switch (this.phase) {
      case 'category':
        return this.handleShopCategory(raw);
      case 'item':
        return this.handleShopItem(raw);
      case 'attribute':
        return this.handleShopAttribute(raw);
      default:
        return {
          events: [
            Event.error('Choose W/A/S/P or Esc.'),
            this.categoryPrompt(),
          ],
        };
    }
  }

  attemptCancel(): VendorResult {
    switch (this.phase) {
      case 'attribute':
        this.phase = 'item';
        return { events: [this.itemPrompt()] };
      case 'item':
        this.phase = 'category';
        this.category = null;
        return { events: [this.categoryPrompt()] };
      case 'category':
      default:
        return { events: [Event.info('Perhaps another time.')], done: true };
    }
  }

  private handleShopCategory(raw: string): VendorResult {
    switch (raw) {
      case 'C':
        return { events: [Event.info('Perhaps another time.')], done: true };
      case 'W':
      case 'A':
      case 'S':
      case 'P':
        this.category = raw;
        this.phase = 'item';
        return { events: [this.itemPrompt()] };
      default:
        return {
          events: [
            Event.error('Choose W/A/S/P or Esc.'),
            this.categoryPrompt(),
          ],
        };
    }
  }

  private handleShopItem(raw: string): VendorResult {
    switch (raw) {
      case 'C':
        this.phase = 'category';
        this.category = null;
        return { events: [this.categoryPrompt()] };
      default:
        return this.handleShopItemChoice(raw);
    }
  }

  private handleShopItemChoice(raw: string): VendorResult {
    switch (this.category) {
      case 'W':
        return this.handleShopWeapons(raw);
      case 'A':
        return this.handleShopArmor(raw);
      case 'S':
        return this.handleShopScrolls(raw);
      case 'P':
        return this.handleShopPotions(raw);
      default:
        return {
          events: [
            Event.error('Choose W/A/S/P or Esc.'),
            this.categoryPrompt(),
          ],
        };
    }
  }

  private handleShopWeapons(raw: string): VendorResult {
    const tier = ({ D: 1, S: 2, B: 3 } as const)[raw as 'D' | 'S' | 'B'];
    if (!tier) {
      return { events: [Event.error('Choose D/S/B.'), this.itemPrompt()] };
    }
    const price = WEAPON_PRICES[tier];
    if (this.player.gold < price) {
      return {
        events: [
          Event.info(
            `Don't try to cheat me, you foolish ${raceLabel(this.player.race)}. It won't work!`
          ),
          this.itemPrompt(),
        ],
      };
    }
    this.player.weaponTier = tier;
    this.player.weaponName = WEAPON_NAMES[tier];
    this.player.gold -= price;
    return {
      events: [Event.info('A fine weapon for your quest.')],
      done: true,
    };
  }

  private handleShopArmor(raw: string): VendorResult {
    const tier = ({ L: 1, W: 2, C: 3 } as const)[raw as 'L' | 'W' | 'C'];
    if (!tier) {
      return { events: [Event.error('Choose L/W/C.'), this.itemPrompt()] };
    }
    const price = ARMOR_PRICES[tier];
    if (this.player.gold < price) {
      return {
        events: [
          Event.info(
            `Don't try to cheat me, you foolish ${raceLabel(this.player.race)}. It won't work!`
          ),
          this.itemPrompt(),
        ],
      };
    }
    this.player.armorTier = tier;
    this.player.armorName = ARMOR_NAMES[tier];
    this.player.armorDamaged = false;
    this.player.gold -= price;
    return { events: [Event.info('Armor fitted and ready.')], done: true };
  }

  private handleShopScrolls(raw: string): VendorResult {
    const spell = (
      {
        P: Spell.PROTECTION,
        F: Spell.FIREBALL,
        L: Spell.LIGHTNING,
        W: Spell.WEAKEN,
        T: Spell.TELEPORT,
      } as const
    )[raw as 'P' | 'F' | 'L' | 'W' | 'T'];
    if (!spell) {
      return { events: [Event.error('Choose P/F/L/W/T.'), this.itemPrompt()] };
    }
    const price = SPELL_PRICES[spell];
    if (this.player.gold < price) {
      return {
        events: [
          Event.info(
            `Don't try to cheat me, you foolish ${raceLabel(this.player.race)}. It won't work!`
          ),
          this.itemPrompt(),
        ],
      };
    }
    this.player.gold -= price;
    this.player.spells[spell] = (this.player.spells[spell] ?? 0) + 1;
    return { events: [Event.info('A scroll is yours.')], done: true };
  }

  private handleShopPotions(raw: string): VendorResult {
    switch (raw) {
      case 'H': {
        const price = POTION_PRICES['HEALING'];
        if (this.player.gold < price) {
          return {
            events: [
              Event.info(
                `Don't try to cheat me, you foolish ${raceLabel(this.player.race)}. It won't work!`
              ),
              this.itemPrompt(),
            ],
          };
        }
        this.player.gold -= price;
        this.player.hp = Math.min(this.player.mhp, this.player.hp + 10);
        return {
          events: [Event.info('You quaff a healing potion.')],
          done: true,
        };
      }
      case 'A': {
        const price = POTION_PRICES['ATTRIBUTE'];
        if (this.player.gold < price) {
          return {
            events: [
              Event.info(
                `Don't try to cheat me, you foolish ${raceLabel(this.player.race)}. It won't work!`
              ),
              this.itemPrompt(),
            ],
          };
        }
        this.phase = 'attribute';
        return {
          events: [this.attributePrompt()],
        };
      }
      default:
        return { events: [Event.error('Choose H or A.'), this.itemPrompt()] };
    }
  }

  private handleShopAttribute(raw: string): VendorResult {
    if (raw === 'C') {
      this.phase = 'item';
      return { events: [this.itemPrompt()] };
    }
    if (!['S', 'D', 'I', 'M'].includes(raw)) {
      return {
        events: [Event.error('Choose S/D/I/M or Esc.'), this.attributePrompt()],
      };
    }
    const price = POTION_PRICES['ATTRIBUTE'];
    if (this.player.gold < price) {
      return {
        events: [
          Event.info(
            `Don't try to cheat me, you foolish ${raceLabel(this.player.race)}. It won't work!`
          ),
        ],
        done: true,
      };
    }
    this.player.gold -= price;
    const change = this.rng.randint(1, 6);
    const targets: Record<string, string> = {
      S: 'ST',
      D: 'DX',
      I: 'IQ',
      M: 'MHP',
    };
    this.player.applyAttributeChange({ target: targets[raw], change });
    return { events: [Event.info('The potion takes effect.')], done: true };
  }

  private categoryPrompt(): Event {
    return Event.prompt('He is selling:', {
      hasCancel: true,
      options: [
        { key: 'W', label: 'Weapons', disabled: false },
        { key: 'A', label: 'Armor', disabled: false },
        { key: 'S', label: 'Scrolls', disabled: false },
        { key: 'P', label: 'Potions', disabled: false },
      ],
    });
  }

  private itemPrompt(): Event {
    if (this.category === 'W') {
      return Event.prompt('Choose a weapon:', {
        hasCancel: true,
        options: [
          {
            key: 'D',
            label: `Dagger (${WEAPON_PRICES[1]}g)`,
            disabled: this.player.gold < WEAPON_PRICES[1],
          },
          {
            key: 'S',
            label: `Short sword (${WEAPON_PRICES[2]}g)`,
            disabled: this.player.gold < WEAPON_PRICES[2],
          },
          {
            key: 'B',
            label: `Broadsword (${WEAPON_PRICES[3]}g)`,
            disabled: this.player.gold < WEAPON_PRICES[3],
          },
        ],
      });
    }
    if (this.category === 'A') {
      return Event.prompt('Choose armor:', {
        hasCancel: true,
        options: [
          {
            key: 'L',
            label: `Leather (${ARMOR_PRICES[1]}g)`,
            disabled: this.player.gold < ARMOR_PRICES[1],
          },
          {
            key: 'W',
            label: `Wooden (${ARMOR_PRICES[2]}g)`,
            disabled: this.player.gold < ARMOR_PRICES[2],
          },
          {
            key: 'C',
            label: `Chain mail (${ARMOR_PRICES[3]}g)`,
            disabled: this.player.gold < ARMOR_PRICES[3],
          },
        ],
      });
    }
    if (this.category === 'S') {
      return Event.prompt('Choose a scroll:', {
        hasCancel: true,
        options: [
          {
            key: 'P',
            label: `Protection (${SPELL_PRICES[Spell.PROTECTION]}g)`,
            disabled: this.player.gold < SPELL_PRICES[Spell.PROTECTION],
          },
          {
            key: 'F',
            label: `Fireball (${SPELL_PRICES[Spell.FIREBALL]}g)`,
            disabled: this.player.gold < SPELL_PRICES[Spell.FIREBALL],
          },
          {
            key: 'L',
            label: `Lightning (${SPELL_PRICES[Spell.LIGHTNING]}g)`,
            disabled: this.player.gold < SPELL_PRICES[Spell.LIGHTNING],
          },
          {
            key: 'W',
            label: `Weaken (${SPELL_PRICES[Spell.WEAKEN]}g)`,
            disabled: this.player.gold < SPELL_PRICES[Spell.WEAKEN],
          },
          {
            key: 'T',
            label: `Teleport (${SPELL_PRICES[Spell.TELEPORT]}g)`,
            disabled: this.player.gold < SPELL_PRICES[Spell.TELEPORT],
          },
        ],
      });
    }
    return Event.prompt('Choose a potion:', {
      hasCancel: true,
      options: [
        {
          key: 'H',
          label: `Healing (${POTION_PRICES['HEALING']}g)`,
          disabled: this.player.gold < POTION_PRICES['HEALING'],
        },
        {
          key: 'A',
          label: `Attribute enhancer (${POTION_PRICES['ATTRIBUTE']}g)`,
          disabled: this.player.gold < POTION_PRICES['ATTRIBUTE'],
        },
      ],
    });
  }

  private attributePrompt(): Event {
    return Event.prompt('Choose an attribute:', {
      hasCancel: true,
      options: [
        { key: 'S', label: 'Strength', disabled: false },
        { key: 'D', label: 'Dexterity', disabled: false },
        { key: 'I', label: 'Intelligence', disabled: false },
        { key: 'M', label: 'Max HP', disabled: false },
      ],
    });
  }
}

import {
  ARMOR_PRICES,
  FLARE_BATCH,
  FLARE_PRICE,
  POTION_PRICES,
  SPELL_PRICES,
  WEAPON_PRICES,
  Spell,
  raceName,
} from './constants.js';
import type { VendorSave } from './serialization.js';
import { applyAttributeChange } from './model.js';
import type { Player } from './model.js';
import { Event, makePrompt, type Prompt } from './types.js';
import type { RandomSource } from './rng.js';
import {
  drinkAttributePotionEvents,
  drinkHealingPotionEvents,
  type PotionAttributeTarget,
} from './potions.js';

export interface VendorResult {
  events: Event[];
  done?: boolean;
}

export class VendorSession {
  private rng: RandomSource;
  private player: Player;
  private phase: 'category' | 'item' | 'attribute' = 'category';
  private category: string | null = null;

  constructor(options: { rng: RandomSource; player: Player }) {
    this.rng = options.rng;
    this.player = options.player;
  }

  static fromSave(options: {
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

  toSave(): VendorSave {
    return {
      phase: this.phase,
      category: this.category,
    };
  }

  prompt(): Prompt {
    switch (this.phase) {
      case 'item':
        return this.itemPrompt();
      case 'attribute':
        return this.attributePrompt();
      case 'category':
      default:
        return this.categoryPrompt();
    }
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
          events: [Event.error('Choose W/A/S/P or Esc.')],
        };
    }
  }

  attemptCancel(): VendorResult {
    switch (this.phase) {
      case 'attribute':
        this.phase = 'item';
        return { events: [] };
      case 'item':
        this.phase = 'category';
        this.category = null;
        return { events: [] };
      case 'category':
      default:
        return {
          events: [],
          done: true,
        };
    }
  }

  private handleShopCategory(raw: string): VendorResult {
    switch (raw) {
      case 'W':
      case 'A':
      case 'S':
      case 'P':
        this.category = raw;
        this.phase = 'item';
        return { events: [] };
      case 'F':
        return this.purchaseFlares();
      default:
        return {
          events: [Event.error('Choose W/A/S/P/F or Esc.')],
        };
    }
  }

  private handleShopItem(raw: string): VendorResult {
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
          events: [Event.error('Choose W/A/S/P/F or Esc.')],
        };
    }
  }

  private handleShopWeapons(raw: string): VendorResult {
    const tier = { D: 1, S: 2, B: 3 }[raw];
    if (!tier) {
      return {
        events: [Event.error('Choose D/S/B.')],
      };
    }
    const price = WEAPON_PRICES[tier];
    if (this.player.gold < price) {
      return {
        events: [
          Event.info(
            `Don't try to cheat me, you foolish ${raceName(this.player.race)}. It won't work!`
          ),
        ],
      };
    }
    this.player.weaponTier = tier;
    this.player.weaponBroken = false;
    this.player.gold -= price;
    return {
      events: [],
      done: true,
    };
  }

  private handleShopArmor(raw: string): VendorResult {
    const tier = { L: 1, W: 2, C: 3 }[raw];
    if (!tier) {
      return {
        events: [Event.error('Choose L/W/C.')],
      };
    }
    const price = ARMOR_PRICES[tier];
    if (this.player.gold < price) {
      return {
        events: [
          Event.info(
            `Don't try to cheat me, you foolish ${raceName(this.player.race)}. It won't work!`
          ),
        ],
      };
    }
    this.player.armorTier = tier;
    this.player.armorDamage = 0;
    this.player.gold -= price;
    return { events: [], done: true };
  }

  private handleShopScrolls(raw: string): VendorResult {
    const spell = {
      P: Spell.PROTECTION,
      F: Spell.FIREBALL,
      L: Spell.LIGHTNING,
      W: Spell.WEAKEN,
      T: Spell.TELEPORT,
    }[raw];
    if (!spell) {
      return {
        events: [Event.error('Choose P/F/L/W/T.')],
      };
    }
    const price = SPELL_PRICES[spell];
    if (this.player.gold < price) {
      return {
        events: [
          Event.info(
            `Don't try to cheat me, you foolish ${raceName(this.player.race)}. It won't work!`
          ),
        ],
      };
    }
    this.player.gold -= price;
    this.player.spells.set(spell, (this.player.spells.get(spell) ?? 0) + 1);
    return { events: [], done: true };
  }

  private handleShopPotions(raw: string): VendorResult {
    switch (raw) {
      case 'H': {
        const price = POTION_PRICES['HEALING'];
        if (this.player.gold < price) {
          return {
            events: [
              Event.info(
                `Don't try to cheat me, you foolish ${raceName(this.player.race)}. It won't work!`
              ),
            ],
          };
        }
        this.player.gold -= price;
        this.player.hp = Math.min(this.player.mhp, this.player.hp + 10);
        return {
          events: drinkHealingPotionEvents(),
          done: true,
        };
      }
      case 'A': {
        const price = POTION_PRICES['ATTRIBUTE'];
        if (this.player.gold < price) {
          return {
            events: [
              Event.info(
                `Don't try to cheat me, you foolish ${raceName(this.player.race)}. It won't work!`
              ),
            ],
          };
        }
        this.phase = 'attribute';
        return { events: [] };
      }
      default:
        return {
          events: [Event.error('Choose H or A.')],
        };
    }
  }

  private purchaseFlares(): VendorResult {
    const price = FLARE_PRICE;
    if (this.player.gold < price) {
      return {
        events: [
          Event.info(
            `Don't try to cheat me, you foolish ${raceName(this.player.race)}. It won't work!`
          ),
        ],
      };
    }
    this.player.gold -= price;
    this.player.flares += FLARE_BATCH;
    return { events: [], done: true };
  }

  private handleShopAttribute(raw: string): VendorResult {
    let target: PotionAttributeTarget;
    switch (raw) {
      case 'S':
        target = 'ST';
        break;
      case 'D':
        target = 'DX';
        break;
      case 'I':
        target = 'IQ';
        break;
      case 'H':
        target = 'MHP';
        break;
      default:
        return {
          events: [Event.error('Choose S/D/I/H or Esc.')],
        };
    }
    const price = POTION_PRICES['ATTRIBUTE'];
    if (this.player.gold < price) {
      return {
        events: [
          Event.info(
            `Don't try to cheat me, you foolish ${raceName(this.player.race)}. It won't work!`
          ),
        ],
        done: true,
      };
    }
    this.player.gold -= price;
    let change = this.rng.randint(1, 3);
    if (target === 'MHP') {
      change *= 2;
    }
    applyAttributeChange(this.player, { target, change });
    return {
      events: drinkAttributePotionEvents({ target, change }),
      done: true,
    };
  }

  private cannotAfford(cheapest: number): boolean {
    return this.player.gold < cheapest;
  }

  private categoryPrompt(): Prompt {
    const cheapest = (prices: Record<PropertyKey, number>) =>
      Math.min(...Object.values(prices));
    return makePrompt('He is selling:', {
      hasCancel: true,
      options: [
        {
          key: 'W',
          label: 'Weapons',
          disabled: this.cannotAfford(cheapest(WEAPON_PRICES)),
        },
        {
          key: 'A',
          label: 'Armour',
          disabled: this.cannotAfford(cheapest(ARMOR_PRICES)),
        },
        {
          key: 'S',
          label: 'Scrolls',
          disabled: this.cannotAfford(cheapest(SPELL_PRICES)),
        },
        {
          key: 'P',
          label: 'Potions',
          disabled: this.cannotAfford(cheapest(POTION_PRICES)),
        },
        { key: 'F', label: 'Flares', disabled: this.cannotAfford(FLARE_PRICE) },
      ],
    });
  }

  private itemPrompt(): Prompt {
    switch (this.category) {
      case 'W':
        return makePrompt('Choose a weapon:', {
          hasCancel: true,
          options: [
            {
              key: 'D',
              label: 'Dagger',
              note: `${WEAPON_PRICES[1]}`,
              disabled: this.player.gold < WEAPON_PRICES[1],
            },
            {
              key: 'S',
              label: 'Short sword',
              note: `${WEAPON_PRICES[2]}`,
              disabled: this.player.gold < WEAPON_PRICES[2],
            },
            {
              key: 'B',
              label: 'Broadsword',
              note: `${WEAPON_PRICES[3]}`,
              disabled: this.player.gold < WEAPON_PRICES[3],
            },
          ],
        });
      case 'A':
        return makePrompt('Choose armour:', {
          hasCancel: true,
          options: [
            {
              key: 'L',
              label: 'Leather',
              note: `${ARMOR_PRICES[1]}`,
              disabled: this.player.gold < ARMOR_PRICES[1],
            },
            {
              key: 'W',
              label: 'Wooden',
              note: `${ARMOR_PRICES[2]}`,
              disabled: this.player.gold < ARMOR_PRICES[2],
            },
            {
              key: 'C',
              label: 'Chain mail',
              note: `${ARMOR_PRICES[3]}`,
              disabled: this.player.gold < ARMOR_PRICES[3],
            },
          ],
        });
      case 'S':
        return makePrompt('Choose a scroll:', {
          hasCancel: true,
          options: [
            {
              key: 'P',
              label: 'Protection',
              note: `${SPELL_PRICES[Spell.PROTECTION]}`,
              disabled: this.player.gold < SPELL_PRICES[Spell.PROTECTION],
            },
            {
              key: 'F',
              label: 'Fireball',
              note: `${SPELL_PRICES[Spell.FIREBALL]}`,
              disabled: this.player.gold < SPELL_PRICES[Spell.FIREBALL],
            },
            {
              key: 'L',
              label: 'Lightning',
              note: `${SPELL_PRICES[Spell.LIGHTNING]}`,
              disabled: this.player.gold < SPELL_PRICES[Spell.LIGHTNING],
            },
            {
              key: 'W',
              label: 'Weaken',
              note: `${SPELL_PRICES[Spell.WEAKEN]}`,
              disabled: this.player.gold < SPELL_PRICES[Spell.WEAKEN],
            },
            {
              key: 'T',
              label: 'Teleport',
              note: `${SPELL_PRICES[Spell.TELEPORT]}`,
              disabled: this.player.gold < SPELL_PRICES[Spell.TELEPORT],
            },
          ],
        });
      case 'P':
      default:
        return makePrompt('Choose a potion:', {
          hasCancel: true,
          options: [
            {
              key: 'H',
              label: 'Healing',
              note: `${POTION_PRICES['HEALING']}`,
              disabled: this.player.gold < POTION_PRICES['HEALING'],
            },
            {
              key: 'A',
              label: 'Attribute enhancer',
              note: `${POTION_PRICES['ATTRIBUTE']}`,
              disabled: this.player.gold < POTION_PRICES['ATTRIBUTE'],
            },
          ],
        });
    }
  }

  private attributePrompt(): Prompt {
    return makePrompt('Choose an attribute:', {
      hasCancel: true,
      options: [
        { key: 'S', label: 'Strength', disabled: false },
        { key: 'D', label: 'Dexterity', disabled: false },
        { key: 'I', label: 'Intellect', disabled: false },
        { key: 'H', label: 'Max Health', disabled: false },
      ],
    });
  }
}

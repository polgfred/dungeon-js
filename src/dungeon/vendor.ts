import {
  ARMOR_NAMES,
  ARMOR_PRICES,
  POTION_PRICES,
  SPELL_PRICES,
  Spell,
  WEAPON_NAMES,
  WEAPON_PRICES,
} from './constants.js';
import type { Player } from './model.js';
import { Event } from './types.js';
import type { RandomSource } from './rng.js';

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

  startEvents(): Event[] {
    return [
      Event.prompt('He is selling:', {
        options: [
          { key: '1', label: 'Weapons' },
          { key: '2', label: 'Armour' },
          { key: '3', label: 'Scrolls' },
          { key: '4', label: 'Potions' },
          { key: '0', label: 'Leave' },
        ],
      }),
    ];
  }

  prompt(): string {
    return '?> ';
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
        return { events: [Event.error('Choose 1..4.')] };
    }
  }

  private handleShopCategory(raw: string): VendorResult {
    switch (raw) {
      case '0':
        return { events: [Event.info('Perhaps another time.')], done: true };
      case '1':
      case '2':
      case '3':
      case '4':
        this.category = raw;
        this.phase = 'item';
        return { events: [this.itemPrompt()] };
      default:
        return { events: [Event.error('Choose 1..4.')] };
    }
  }

  private handleShopItem(raw: string): VendorResult {
    switch (raw) {
      case '0':
        return { events: [Event.info('Perhaps another time.')], done: true };
      case '1':
      case '2':
      case '3':
      case '4':
      case '5':
        return this.handleShopItemChoice(raw);
      default:
        return { events: [Event.error('Choose 1..5.')] };
    }
  }

  private handleShopItemChoice(raw: string): VendorResult {
    switch (this.category) {
      case '1':
        return this.handleShopWeapons(raw);
      case '2':
        return this.handleShopArmor(raw);
      case '3':
        return this.handleShopScrolls(raw);
      case '4':
        return this.handleShopPotions(raw);
      default:
        return { events: [Event.error('Choose 1..4.')] };
    }
  }

  private handleShopWeapons(raw: string): VendorResult {
    if (!['1', '2', '3'].includes(raw)) {
      return { events: [Event.error('Choose 1..3.')] };
    }
    const tier = Number(raw);
    const price = WEAPON_PRICES[tier];
    if (this.player.gold < price) {
      return { events: [Event.info("Don't try to cheat me. It won't work!")] };
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
    if (!['1', '2', '3'].includes(raw)) {
      return { events: [Event.error('Choose 1..3.')] };
    }
    const tier = Number(raw);
    const price = ARMOR_PRICES[tier];
    if (this.player.gold < price) {
      return { events: [Event.info("Don't try to cheat me. It won't work!")] };
    }
    this.player.armorTier = tier;
    this.player.armorName = ARMOR_NAMES[tier];
    this.player.armorDamaged = false;
    this.player.gold -= price;
    return { events: [Event.info('Armor fitted and ready.')], done: true };
  }

  private handleShopScrolls(raw: string): VendorResult {
    if (!['1', '2', '3', '4', '5'].includes(raw)) {
      return { events: [Event.error('Choose 1..5.')] };
    }
    const spell = Number(raw) as Spell;
    const price = SPELL_PRICES[spell];
    if (this.player.gold < price) {
      return { events: [Event.info("Don't try to cheat me. It won't work!")] };
    }
    this.player.gold -= price;
    this.player.spells[spell] = (this.player.spells[spell] ?? 0) + 1;
    return { events: [Event.info('A scroll is yours.')], done: true };
  }

  private handleShopPotions(raw: string): VendorResult {
    switch (raw) {
      case '1': {
        const price = POTION_PRICES['HEALING'];
        if (this.player.gold < price) {
          return {
            events: [Event.info("Don't try to cheat me. It won't work!")],
          };
        }
        this.player.gold -= price;
        this.player.hp = Math.min(this.player.mhp, this.player.hp + 10);
        return {
          events: [Event.info('You quaff a healing potion.')],
          done: true,
        };
      }
      case '2': {
        const price = POTION_PRICES['ATTRIBUTE'];
        if (this.player.gold < price) {
          return {
            events: [Event.info("Don't try to cheat me. It won't work!")],
          };
        }
        this.phase = 'attribute';
        return {
          events: [this.attributePrompt()],
        };
      }
      default:
        return { events: [Event.error('Choose 1 or 2.')] };
    }
  }

  private handleShopAttribute(raw: string): VendorResult {
    if (raw === '0') {
      return { events: [Event.info('Perhaps another time.')], done: true };
    }
    if (!['1', '2', '3', '4'].includes(raw)) {
      return { events: [Event.error('Choose 1..4.')] };
    }
    const price = POTION_PRICES['ATTRIBUTE'];
    if (this.player.gold < price) {
      return {
        events: [Event.info("Don't try to cheat me. It won't work!")],
        done: true,
      };
    }
    this.player.gold -= price;
    const change = this.rng.randint(1, 6);
    const targets: Record<string, string> = {
      '1': 'ST',
      '2': 'DX',
      '3': 'IQ',
      '4': 'MHP',
    };
    this.player.applyAttributeChange({ target: targets[raw], change });
    return { events: [Event.info('The potion takes effect.')], done: true };
  }

  private itemPrompt(): Event {
    if (this.category === '1') {
      return Event.prompt('Choose a weapon:', {
        options: [
          { key: '1', label: `Dagger (${WEAPON_PRICES[1]}g)` },
          { key: '2', label: `Short sword (${WEAPON_PRICES[2]}g)` },
          { key: '3', label: `Broadsword (${WEAPON_PRICES[3]}g)` },
          { key: '0', label: 'Leave' },
        ],
      });
    }
    if (this.category === '2') {
      return Event.prompt('Choose armor:', {
        options: [
          { key: '1', label: `Leather (${ARMOR_PRICES[1]}g)` },
          { key: '2', label: `Wooden (${ARMOR_PRICES[2]}g)` },
          { key: '3', label: `Chain mail (${ARMOR_PRICES[3]}g)` },
          { key: '0', label: 'Leave' },
        ],
      });
    }
    if (this.category === '3') {
      return Event.prompt('Choose a scroll:', {
        options: [
          { key: '1', label: `Protection (${SPELL_PRICES[Spell.PROTECTION]}g)` },
          { key: '2', label: `Fireball (${SPELL_PRICES[Spell.FIREBALL]}g)` },
          { key: '3', label: `Lightning (${SPELL_PRICES[Spell.LIGHTNING]}g)` },
          { key: '4', label: `Weaken (${SPELL_PRICES[Spell.WEAKEN]}g)` },
          { key: '5', label: `Teleport (${SPELL_PRICES[Spell.TELEPORT]}g)` },
          { key: '0', label: 'Leave' },
        ],
      });
    }
    return Event.prompt('Choose a potion:', {
      options: [
        { key: '1', label: `Healing (${POTION_PRICES['HEALING']}g)` },
        { key: '2', label: `Attribute enhancer (${POTION_PRICES['ATTRIBUTE']}g)` },
        { key: '0', label: 'Leave' },
      ],
    });
  }

  private attributePrompt(): Event {
    return Event.prompt('Choose an attribute:', {
      options: [
        { key: '1', label: 'Strength' },
        { key: '2', label: 'Dexterity' },
        { key: '3', label: 'Intelligence' },
        { key: '4', label: 'Max HP' },
        { key: '0', label: 'Leave' },
      ],
    });
  }
}

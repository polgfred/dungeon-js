import {
  ARMOR_NAMES,
  ARMOR_PRICES,
  POTION_PRICES,
  SPELL_PRICES,
  Spell,
  WEAPON_NAMES,
  WEAPON_PRICES,
} from "./constants.js";
import type { Player } from "./model.js";
import { Event } from "./types.js";
import type { RandomSource } from "./rng.js";

export interface VendorResult {
  events: Event[];
  done?: boolean;
}

export class VendorSession {
  private rng: RandomSource;
  private player: Player;
  private phase: "category" | "item" | "attribute" = "category";
  private category: string | null = null;

  constructor(options: { rng: RandomSource; player: Player }) {
    this.rng = options.rng;
    this.player = options.player;
  }

  startEvents(): Event[] {
    return [
      Event.prompt(
        "He is selling: 1> Weapons  2> Armour  3> Scrolls  4> Potions  0> Leave",
      ),
    ];
  }

  prompt(): string {
    return "?> ";
  }

  step(raw: string): VendorResult {
    switch (this.phase) {
      case "category":
        return this.handleShopCategory(raw);
      case "item":
        return this.handleShopItem(raw);
      case "attribute":
        return this.handleShopAttribute(raw);
      default:
        return { events: [Event.error("Choose 1..4.")] };
    }
  }

  private handleShopCategory(raw: string): VendorResult {
    const promptMap: Record<string, string> = {
      "1": "Weapons: 1> Dagger  2> Short sword  3> Broadsword  0> Leave",
      "2": "Armour: 1> Leather  2> Wooden  3> Chain mail  0> Leave",
      "3": "Scrolls: 1> Protection  2> Fireball  3> Lightning  4> Weaken  5> Teleport  0> Leave",
      "4": "Potions: 1> Healing  2> Attribute enhancer  0> Leave",
    };
    switch (raw) {
      case "0":
        return { events: [Event.info("Perhaps another time.")], done: true };
      case "1":
      case "2":
      case "3":
      case "4":
        this.category = raw;
        this.phase = "item";
        return { events: [Event.prompt(promptMap[raw])] };
      default:
        return { events: [Event.error("Choose 1..4.")] };
    }
  }

  private handleShopItem(raw: string): VendorResult {
    switch (raw) {
      case "0":
        return { events: [Event.info("Perhaps another time.")], done: true };
      case "1":
      case "2":
      case "3":
      case "4":
      case "5":
        return this.handleShopItemChoice(raw);
      default:
        return { events: [Event.error("Choose 1..5.")] };
    }
  }

  private handleShopItemChoice(raw: string): VendorResult {
    switch (this.category) {
      case "1":
        return this.handleShopWeapons(raw);
      case "2":
        return this.handleShopArmor(raw);
      case "3":
        return this.handleShopScrolls(raw);
      case "4":
        return this.handleShopPotions(raw);
      default:
        return { events: [Event.error("Choose 1..4.")] };
    }
  }

  private handleShopWeapons(raw: string): VendorResult {
    if (!["1", "2", "3"].includes(raw)) {
      return { events: [Event.error("Choose 1..3.")] };
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
      events: [Event.info("A fine weapon for your quest.")],
      done: true,
    };
  }

  private handleShopArmor(raw: string): VendorResult {
    if (!["1", "2", "3"].includes(raw)) {
      return { events: [Event.error("Choose 1..3.")] };
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
    return { events: [Event.info("Armor fitted and ready.")], done: true };
  }

  private handleShopScrolls(raw: string): VendorResult {
    if (!["1", "2", "3", "4", "5"].includes(raw)) {
      return { events: [Event.error("Choose 1..5.")] };
    }
    const spell = Number(raw) as Spell;
    const price = SPELL_PRICES[spell];
    if (this.player.gold < price) {
      return { events: [Event.info("Don't try to cheat me. It won't work!")] };
    }
    this.player.gold -= price;
    this.player.spells[spell] = (this.player.spells[spell] ?? 0) + 1;
    return { events: [Event.info("A scroll is yours.")], done: true };
  }

  private handleShopPotions(raw: string): VendorResult {
    switch (raw) {
      case "1": {
        const price = POTION_PRICES["HEALING"];
        if (this.player.gold < price) {
          return {
            events: [Event.info("Don't try to cheat me. It won't work!")],
          };
        }
        this.player.gold -= price;
        this.player.hp = Math.min(this.player.mhp, this.player.hp + 10);
        return {
          events: [Event.info("You quaff a healing potion.")],
          done: true,
        };
      }
      case "2": {
        const price = POTION_PRICES["ATTRIBUTE"];
        if (this.player.gold < price) {
          return {
            events: [Event.info("Don't try to cheat me. It won't work!")],
          };
        }
        this.phase = "attribute";
        return {
          events: [
            Event.prompt(
              "Attribute enhancer: 1> Strength  2> Dexterity  3> Intelligence  4> Max HP  0> Leave",
            ),
          ],
        };
      }
      default:
        return { events: [Event.error("Choose 1 or 2.")] };
    }
  }

  private handleShopAttribute(raw: string): VendorResult {
    if (raw === "0") {
      return { events: [Event.info("Perhaps another time.")], done: true };
    }
    if (!["1", "2", "3", "4"].includes(raw)) {
      return { events: [Event.error("Choose 1..4.")] };
    }
    const price = POTION_PRICES["ATTRIBUTE"];
    if (this.player.gold < price) {
      return {
        events: [Event.info("Don't try to cheat me. It won't work!")],
        done: true,
      };
    }
    this.player.gold -= price;
    const change = this.rng.randint(1, 6);
    const targets: Record<string, string> = {
      "1": "STR",
      "2": "DEX",
      "3": "IQ",
      "4": "MHP",
    };
    this.player.applyAttributeChange({ target: targets[raw], change });
    return { events: [Event.info("The potion takes effect.")], done: true };
  }
}

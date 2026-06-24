import { ARMOR_NAMES, WEAPON_NAMES } from './constants.js';
import type { GameSave } from './serialization.js';

/** A persisted save from some prior version. */
export type SaveBlob = { version: number } & Record<string, any>;

/**
 * Migrate a saved game to a later version. Will be called repeatedly until
 * either: nothing is returned, the version didn't advance, or the save blob
 * matches the current version.
 */
function migrate(save: SaveBlob): SaveBlob | undefined {
  switch(save.version) {
    case 8: {
      for (const state of save.players) {
        const p = state.player;
        if (p.weaponBroken) {
          let weaponTier = WEAPON_NAMES.indexOf(p.weaponName);
          if (weaponTier === -1) weaponTier = 0;
          p.weaponTier = weaponTier;
        }
        if (p.armorDamaged) {
          let armorTier = ARMOR_NAMES.indexOf(p.armorName);
          if (armorTier === -1) armorTier = 0;
          if (armorTier === 0) {
            p.armorDamage = 0;
            p.armorTier = 0;
          } else {
            p.armorDamage = armorTier - p.armorTier;
            p.armorTier = armorTier;
          }
        } else {
          p.armorDamage = 0;
        }
        delete p.weaponName;
        delete p.armorName;
        delete p.armorDamaged;
      }
      return { ...save, version: 9 };
    }
  }
}

/** Walk a save blob forward one version at a time until it reaches `target`. */
export function migrateSave(
  blob: SaveBlob,
  target: number,
): GameSave {
  let save = blob;
  while (save.version < target) {
    const next = migrate(save);
    if (!next) {
      throw new Error(
        `No migration path from save version ${save.version} to ${target}.`
      );
    }
    if (next.version <= save.version) {
      throw new Error(
        `Migration from save version ${save.version} did not advance the version.`
      );
    }
    save = next;
  }
  if (save.version !== target) {
    throw new Error(
      `Unsupported save version ${save.version}. Expected ${target}.`
    );
  }
  return save as unknown as GameSave;
}

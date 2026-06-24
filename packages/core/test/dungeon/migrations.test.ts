import { describe, expect, it } from 'vitest';
import { Game } from '../../src/engine.js';
import { migrateSave } from '../../src/migrations.js';

function migratePlayer(version: number, player: any) {
  return migrateSave({ version, players: [{ player }] }, Game.SAVE_VERSION);
}

describe('Migrations', () => {
  describe('8->9', () => {
    it('correctly migrates healthy weapon and armor', () => {
      const migrated = migratePlayer(8, {
        weaponTier: 3,
        weaponName: 'Broadsword',
        weaponBroken: false,
        armorTier: 3,
        armorName: 'Chain mail',
        armorDamaged: false,
      });

      const player = migrated.players[0].player;
      expect(player).toMatchObject({
        weaponTier: 3,
        weaponBroken: false,
        armorTier: 3,
        armorDamage: 0,
      });
      expect(player).not.toHaveProperty('weaponName');
      expect(player).not.toHaveProperty('armorName');
      expect(player).not.toHaveProperty('armorDamaged');
    });

    it('correctly migrates broken weapon', () => {
      const migrated = migratePlayer(8, {
        weaponTier: 0,
        weaponName: 'Broadsword',
        weaponBroken: true,
      });

      const player = migrated.players[0].player;
      expect(player).toMatchObject({
        weaponTier: 3,
        weaponBroken: true,
      });
      expect(player).not.toHaveProperty('weaponName');
    });

    it('correctly migrates damaged armor', () => {
      const migrated = migratePlayer(8, {
        armorTier: 1,
        armorName: 'Chain mail',
        armorDamaged: true,
      });

      const player = migrated.players[0].player;
      expect(player).toMatchObject({
        armorTier: 3,
        armorDamage: 2,
      });
      expect(player).not.toHaveProperty('armorName');
      expect(player).not.toHaveProperty('armorDamaged');
    });

    it('correctly migrates destroyed armor', () => {
      const migrated = migratePlayer(8, {
        armorTier: 0,
        armorDamaged: false,
      });

      const player = migrated.players[0].player;
      expect(player).toMatchObject({
        armorTier: 0,
        armorDamage: 0,
      });
      expect(player).not.toHaveProperty('armorName');
      expect(player).not.toHaveProperty('armorDamaged');
    });
  });
});

import clsx from 'clsx';

import type { Player } from '@dod/core';

import { CommandButton } from './CommandButton.js';
import {
  RaceStage,
  AllocationStage,
  ShopStage,
  ReadyStage,
} from './SetupGame.js';
import { useSetupGameModel, type SetupGameModel } from './SetupGameModel.js';
import styles from './Lobby.module.css';

const ACTION_IDS: Record<SetupGameModel['stage'], string[]> = {
  race: ['race-confirm', 'race-back'],
  allocate: ['alloc-confirm', 'alloc-back'],
  shop: ['shop-confirm', 'shop-back'],
  ready: ['ready-enter', 'ready-reset'],
};

/**
 * A compact, single-column character builder for the lobby. Reuses the
 * single-player `useSetupGameModel` rules and stage views, but drops the wide
 * stats column so the right rail can carry the party + chat.
 */
export function LobbyBuilder({
  onComplete,
  onLeave,
}: {
  onComplete: (player: Player) => void;
  onLeave: () => void;
}) {
  const model = useSetupGameModel({ onComplete, onBack: onLeave });
  const actions = model.commandList.filter((command) =>
    ACTION_IDS[model.stage].includes(command.id)
  );

  return (
    <div className={styles.builder}>
      <div className={clsx('ui-panel', styles.builderPanel)}>
        {model.stage === 'race' && (
          <RaceStage
            race={model.race}
            baseStats={model.baseStats}
            onSelect={model.handleRaceSelect}
          />
        )}
        {model.stage === 'allocate' && (
          <AllocationStage
            baseStats={model.baseStats}
            allocations={model.allocations}
            remainingPoints={model.remainingPoints}
            onAdjust={model.handleAdjust}
          />
        )}
        {model.stage === 'shop' && (
          <ShopStage
            weaponTier={model.weaponTier}
            armorTier={model.armorTier}
            flares={model.flares}
            maxFlares={model.maxFlares}
            goldRemaining={
              model.gold !== null ? model.gold - model.totalCost : null
            }
            setupError={model.setupError}
            onWeaponTier={model.setWeaponTier}
            onArmorTier={model.setArmorTier}
            onFlaresChange={model.setFlares}
          />
        )}
        {model.stage === 'ready' && model.player && (
          <ReadyStage player={model.player} />
        )}
      </div>
      <div className={styles.builderActions}>
        {actions.map((command) => (
          <CommandButton
            key={command.id}
            command={command}
            onTrigger={model.handleTrigger}
          />
        ))}
      </div>
    </div>
  );
}

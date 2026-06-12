import { CommandButton } from './CommandButton.js';
import {
  RaceStage,
  AllocationStage,
  ShopStage,
  ReadyStage,
} from './SetupGame.js';
import type { SetupGameModel } from './SetupGameModel.js';
import styles from './Lobby.module.css';

const ACTION_IDS: Record<SetupGameModel['stage'], string[]> = {
  race: ['race-confirm', 'race-back'],
  allocate: ['alloc-confirm', 'alloc-back'],
  shop: ['shop-confirm', 'shop-back'],
  ready: ['ready-enter', 'ready-reset'],
};

/**
 * The character build for the lobby's board quadrant: the active stage plus its
 * confirm/back actions. Presentational — the model is owned by `Lobby` so the
 * stats quadrant can read the same in-progress character.
 */
export function LobbyBuilder({ model }: { model: SetupGameModel }) {
  const actions = model.commandList.filter((command) =>
    ACTION_IDS[model.stage].includes(command.id)
  );

  return (
    <div className={styles.builder}>
      <div className={styles.builderStage}>
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

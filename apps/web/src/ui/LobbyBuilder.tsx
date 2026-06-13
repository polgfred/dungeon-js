import { Race } from '@dod/core';

import {
  PromptMenu,
  SelectChip,
  ActionChip,
  AdjustChip,
  keyCap,
} from './PromptMenu.js';
import {
  NARRATION,
  type AllocationKey,
  type SetupGameModel,
} from './SetupGameModel.js';

const RACE_BY_ID: Record<string, Race> = {
  'race-human': Race.HUMAN,
  'race-dwarf': Race.DWARF,
  'race-elf': Race.ELF,
  'race-halfling': Race.HALFLING,
};

const ALLOC_KEYS: AllocationKey[] = ['ST', 'DX', 'IQ'];
const ALLOC_LABEL: Record<AllocationKey, string> = {
  ST: 'Strength',
  DX: 'Dexterity',
  IQ: 'Intelligence',
};

/**
 * The character build as a prompt menu: each stage's keyed choices as chips,
 * driven by the model the way the gameplay menus are. The narrator's prose lives
 * in the feed (see Lobby), so the board carries only the choices.
 */
export function LobbyBuilder({ model }: { model: SetupGameModel }) {
  const byId = new Map(model.commandList.map((command) => [command.id, command]));
  const trigger = (id: string) => {
    const command = byId.get(id);
    if (command) model.handleTrigger(command);
  };

  const action = (id: string) => {
    const command = byId.get(id);
    if (!command) return null;
    return (
      <ActionChip
        key={id}
        cap={keyCap(command.key)}
        label={command.label}
        disabled={command.disabled}
        onTrigger={() => trigger(id)}
      />
    );
  };

  const select = (id: string, active: boolean) => {
    const command = byId.get(id);
    if (!command) return null;
    return (
      <SelectChip
        key={id}
        cap={keyCap(command.key)}
        label={command.label}
        note={command.note}
        active={active}
        disabled={command.disabled}
        onSelect={() => trigger(id)}
      />
    );
  };

  return (
    <PromptMenu question={NARRATION[model.stage]}>
      {model.stage === 'race' &&
        Object.entries(RACE_BY_ID).map(([id, value]) =>
          select(id, model.race === value)
        )}

      {model.stage === 'allocate' &&
        ALLOC_KEYS.map((key) => {
          const plus = byId.get(`alloc-${key.toLowerCase()}-plus`);
          const value = model.derivedStats ? model.derivedStats[key] : 0;
          return (
            <AdjustChip
              key={key}
              cap={plus ? keyCap(plus.key) : key}
              label={ALLOC_LABEL[key]}
              value={String(value)}
              onUp={() => trigger(`alloc-${key.toLowerCase()}-plus`)}
              onDown={() => trigger(`alloc-${key.toLowerCase()}-minus`)}
              upDisabled={byId.get(`alloc-${key.toLowerCase()}-plus`)?.disabled}
              downDisabled={byId.get(`alloc-${key.toLowerCase()}-minus`)?.disabled}
            />
          );
        })}

      {model.stage === 'weapon' &&
        [1, 2, 3].map((tier) =>
          select(`weapon-${tier}`, model.weaponTier === tier)
        )}

      {model.stage === 'armour' &&
        [1, 2, 3].map((tier) =>
          select(`armour-${tier}`, model.armorTier === tier)
        )}

      {model.stage === 'flares' && (
        <AdjustChip
          cap={keyCap('F')}
          label="Flares"
          value={String(model.flares)}
          onUp={() => trigger('flares-plus')}
          onDown={() => trigger('flares-minus')}
          upDisabled={byId.get('flares-plus')?.disabled}
          downDisabled={byId.get('flares-minus')?.disabled}
        />
      )}

      {/* Per-stage actions: Confirm / Back, or Enter / Reset on the ready step. */}
      {model.stage === 'race' && (
        <>
          {action('race-confirm')}
          {action('race-back')}
        </>
      )}
      {model.stage === 'allocate' && (
        <>
          {action('alloc-confirm')}
          {action('alloc-back')}
        </>
      )}
      {model.stage === 'weapon' && (
        <>
          {action('weapon-confirm')}
          {action('weapon-back')}
        </>
      )}
      {model.stage === 'armour' && (
        <>
          {action('armour-confirm')}
          {action('armour-back')}
        </>
      )}
      {model.stage === 'flares' && (
        <>
          {action('flares-confirm')}
          {action('flares-back')}
        </>
      )}
      {model.stage === 'ready' && (
        <>
          {action('ready-enter')}
          {action('ready-reset')}
        </>
      )}
    </PromptMenu>
  );
}

import { useEffect, type ReactElement } from 'react';

import { Race, raceName } from '@dod/core';

import { SelectChip, ActionChip, AdjustChip, keyCap } from './Chips.js';
import styles from './LobbyBuilder.module.css';
import { type AllocationKey, type SetupGameModel } from './SetupGameModel.js';

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
  IQ: 'Intellect',
};

type StageProps = { model: SetupGameModel };

/** Shared plumbing: map a command id → its chip, sourcing key/label/disabled
 *  from the model so the keyboard and the chips can't drift. */
function commandHelpers(model: SetupGameModel) {
  const byId = new Map(
    model.commandList.map((command) => [command.id, command])
  );
  const trigger = (id: string) => {
    const command = byId.get(id);
    if (command) model.handleTrigger(command);
  };
  const action = (id: string): ReactElement | null => {
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
  const select = (id: string, active: boolean): ReactElement | null => {
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
  return { byId, trigger, action, select };
}

function RaceStage({ model }: StageProps) {
  const { select } = commandHelpers(model);
  return (
    <div className={styles.menu}>
      <p className={styles.question}>
        Now, brave adventurer: prepare to choose thy race.
      </p>
      <div className={styles.body}>
        <div className={styles.choices}>
          {Object.entries(RACE_BY_ID).map(([id, value]) =>
            select(id, model.race === value)
          )}
        </div>
        <p className={styles.hint}>
          Hint: Press the key shown beside an option to choose it.
        </p>
      </div>
    </div>
  );
}

function AllocateStage({ model }: StageProps) {
  const { byId, trigger, action } = commandHelpers(model);
  return (
    <div className={styles.menu}>
      <p className={styles.question}>
        Thy characteristics are as follows. Thou may distribute 5 points among
        thy strength, dexterity, and intellect, up to a maximum of 18.
      </p>
      <div className={styles.body}>
        <div className={styles.choices}>
          {ALLOC_KEYS.map((key) => {
            const lower = key.toLowerCase();
            const plus = byId.get(`alloc-${lower}-plus`);
            const value = model.derivedStats ? model.derivedStats[key] : 0;
            return (
              <AdjustChip
                key={key}
                cap={plus ? keyCap(plus.key) : key}
                label={ALLOC_LABEL[key]}
                value={String(value)}
                onUp={() => trigger(`alloc-${lower}-plus`)}
                onDown={() => trigger(`alloc-${lower}-minus`)}
                upDisabled={byId.get(`alloc-${lower}-plus`)?.disabled}
                downDisabled={byId.get(`alloc-${lower}-minus`)?.disabled}
              />
            );
          })}
          {action('alloc-confirm')}
        </div>
        <p className={styles.hint}>
          Hint: Press the key shown beside an option to raise its value. Hold
          Shift↑ to lower it instead.
        </p>
      </div>
    </div>
  );
}

function WeaponStage({ model }: StageProps) {
  const { select } = commandHelpers(model);
  return (
    <div className={styles.menu}>
      <p className={styles.question}>Now then, thou must purchase a weapon.</p>
      <div className={styles.body}>
        <div className={styles.choices}>
          {[1, 2, 3].map((tier) =>
            select(`weapon-${tier}`, model.weaponTier === tier)
          )}
        </div>
        <p className={styles.hint}>
          Hint: Press the key shown beside an option to choose it.
        </p>
      </div>
    </div>
  );
}

function ArmorStage({ model }: StageProps) {
  const { select } = commandHelpers(model);
  return (
    <div className={styles.menu}>
      <p className={styles.question}>
        In the DUNGEON of DOOM, armour is a useful commodity...
      </p>
      <div className={styles.body}>
        <div className={styles.choices}>
          {[1, 2, 3].map((tier) =>
            select(`armor-${tier}`, model.armorTier === tier)
          )}
        </div>
        <p className={styles.hint}>
          Hint: Press the key shown beside an option to choose it.
        </p>
      </div>
    </div>
  );
}

function FlaresStage({ model }: StageProps) {
  const { byId, trigger, action } = commandHelpers(model);
  return (
    <div className={styles.menu}>
      <p className={styles.question}>
        Flares cost one gold piece each. How many dost thou wish to purchase?
      </p>
      <div className={styles.body}>
        <div className={styles.choices}>
          <AdjustChip
            cap={keyCap('F')}
            label="Flares"
            value={String(model.flares)}
            onUp={() => trigger('flares-plus')}
            onDown={() => trigger('flares-minus')}
            upDisabled={byId.get('flares-plus')?.disabled}
            downDisabled={byId.get('flares-minus')?.disabled}
          />
          {action('flares-confirm')}
        </div>
        <p className={styles.hint}>
          Hint: Press the key shown beside an option to raise its value. Hold
          Shift↑ to lower it instead.
        </p>
      </div>
    </div>
  );
}

function ReadyStage({ model }: StageProps) {
  const { action } = commandHelpers(model);
  const name = raceName(model.race!);
  return (
    <div className={styles.menu}>
      <p className={styles.question}>
        Brave {name}: art thou certain of thy worthiness, or would another
        character perhaps suit thee better?
      </p>
      <div className={styles.choices}>
        {action('ready-enter')}
        {action('ready-reset')}
      </div>
    </div>
  );
}

export function LobbyBuilder({ model }: { model: SetupGameModel }) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      // Don't hijack typing in the chat box.
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')
      ) {
        return;
      }
      model.handleKeyDown(event);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [model]);

  switch (model.stage) {
    case 'race':
      return <RaceStage model={model} />;
    case 'allocate':
      return <AllocateStage model={model} />;
    case 'weapon':
      return <WeaponStage model={model} />;
    case 'armor':
      return <ArmorStage model={model} />;
    case 'flares':
      return <FlaresStage model={model} />;
    case 'ready':
      return <ReadyStage model={model} />;
  }
}

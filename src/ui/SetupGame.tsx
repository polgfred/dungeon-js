import clsx from 'clsx';
import { type ReactNode } from 'react';

import helpHtmlContent from '../assets/help.html?raw';
import {
  ARMOR_NAMES,
  ARMOR_PRICES,
  WEAPON_NAMES,
  WEAPON_PRICES,
  Race,
} from '../dungeon/constants.js';
import { Player } from '../dungeon/model.js';
import { CommandButton, type Command } from './CommandButton.js';
import styles from './SetupGame.module.css';
import {
  type AllocationKey,
  type AllocationState,
  type SetupGameModel,
  type Stats,
  useSetupGameModel,
} from './SetupGameModel.js';
import { useMediaQuery } from './useMediaQuery.js';

const raceOptions = [
  { value: Race.HUMAN, label: 'Human', tagline: 'Balanced and adaptable.' },
  { value: Race.DWARF, label: 'Dwarf', tagline: 'Stout and resilient.' },
  { value: Race.ELF, label: 'Elf', tagline: 'Quick and arcane.' },
  { value: Race.HALFLING, label: 'Halfling', tagline: 'Steady and lucky.' },
];

function MobileHelpPanel({ onClose }: { onClose: () => void }) {
  return (
    <div className={clsx('ui-panel', styles.panel, styles.mobileHelpPanel)}>
      <div className={styles.mobileHelpHeader}>
        <p className={styles.mobileHelpHeading}>Help</p>
        <span
          role="button"
          tabIndex={0}
          aria-label="Close help"
          onClick={onClose}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') onClose();
          }}
          className={styles.mobileHelpClose}
        >
          Close
        </span>
      </div>
      <div
        className={clsx(styles.mobileHelpContent, styles.helpContent)}
        dangerouslySetInnerHTML={{ __html: helpHtmlContent }}
      />
    </div>
  );
}

function SetupCommandPanel({
  title,
  commands,
  onTrigger,
  titleVariant = 'default',
}: {
  title: string;
  commands: Command[];
  onTrigger: (command: Command) => void;
  titleVariant?: 'default' | 'compact';
}) {
  return (
    <div className={clsx('ui-panel', styles.panel, styles.commandPanel)}>
      <div className={styles.gap2}>
        <p
          className={clsx(
            titleVariant === 'compact'
              ? 'ui-panel-title-compact'
              : 'ui-panel-title',
            titleVariant === 'compact'
              ? styles.commandTitleCompact
              : styles.commandTitle
          )}
        >
          {title}
        </p>
        <div className={styles.commandButtons}>
          {commands.map((command) => (
            <CommandButton
              key={command.id}
              command={command}
              onTrigger={onTrigger}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function RaceStage({
  race,
  baseStats,
  onSelect,
}: {
  race: Race | null;
  baseStats: Stats | null;
  onSelect: (value: Race) => void;
}) {
  return (
    <div className={styles.gap3}>
      <h2 className={clsx('txt-h5', styles.stageTitle)}>Choose Thy Race</h2>
      <p className={styles.stageBody}>
        Base player stats are rolled on selection. Confirm to lock in your
        numbers.
      </p>
      <div className={styles.raceGrid}>
        {raceOptions.map((option) => {
          const active = race === option.value;
          return (
            <button
              type="button"
              key={option.label}
              onClick={() => onSelect(option.value)}
              className={clsx(styles.raceCard, active && styles.raceCardActive)}
            >
              <span className={styles.raceLabel}>{option.label}</span>
              <span className={styles.raceTagline}>{option.tagline}</span>
            </button>
          );
        })}
      </div>
      {baseStats && (
        <div className={styles.rolledStats}>
          <p className={styles.rolledStatsLabel}>Rolled Stats</p>
          <p className={styles.rolledStatsValue}>
            ST {baseStats.ST} · DX {baseStats.DX} · IQ {baseStats.IQ} · HP{' '}
            {baseStats.HP}
          </p>
        </div>
      )}
    </div>
  );
}

function AllocationStage({
  baseStats,
  allocations,
  remainingPoints,
  onAdjust,
}: {
  baseStats: Stats | null;
  allocations: AllocationState;
  remainingPoints: number;
  onAdjust: (key: AllocationKey, delta: number) => void;
}) {
  const isMobile = useMediaQuery('(max-width: 899px)');
  return (
    <div className={styles.gap3}>
      <h2 className={clsx('txt-h5', styles.stageTitle)}>Allocate Points</h2>
      <p className={styles.stageBody}>
        Distribute five additional points across strength, dexterity, and
        intelligence. Attributes are capped at 18.
      </p>
      <div className={styles.allocList}>
        {(['ST', 'DX', 'IQ'] as AllocationKey[]).map((key) => {
          const baseValue = baseStats ? baseStats[key] : 0;
          const totalValue = Math.min(18, baseValue + allocations[key]);
          return (
            <div key={key} className={styles.allocRow}>
              <p className={styles.allocKey}>{key}</p>
              <div>
                <p className={styles.allocMuted}>
                  {isMobile
                    ? totalValue
                    : `Base ${baseValue} + ${allocations[key]} → ${totalValue}`}
                </p>
              </div>
              <div className={styles.allocAdjust}>
                <button
                  type="button"
                  className={clsx('btn', 'btn-outlined')}
                  onClick={() => onAdjust(key, -1)}
                  disabled={allocations[key] === 0}
                >
                  -
                </button>
                <button
                  type="button"
                  className={clsx('btn', 'btn-outlined')}
                  onClick={() => onAdjust(key, 1)}
                  disabled={remainingPoints <= 0 || totalValue >= 18}
                >
                  +
                </button>
              </div>
            </div>
          );
        })}
      </div>
      <p className={styles.pointsRemaining}>
        Points remaining: {remainingPoints}
      </p>
    </div>
  );
}

function TierGroup({
  label,
  value,
  options,
  activeClass,
  onChange,
}: {
  label: string;
  value: number;
  options: { value: number; label: string }[];
  activeClass: string;
  onChange: (next: number) => void;
}) {
  return (
    <div>
      <p className={styles.shopGroupLabel}>{label}</p>
      <div className={styles.shopTier} role="radiogroup" aria-label={label}>
        {options.map((option) => (
          <button
            type="button"
            key={option.value}
            role="radio"
            aria-checked={value === option.value}
            onClick={() => onChange(option.value)}
            className={clsx(
              styles.shopTierBtn,
              value === option.value && activeClass
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function ShopStage({
  weaponTier,
  armorTier,
  flares,
  maxFlares,
  goldRemaining,
  setupError,
  onWeaponTier,
  onArmorTier,
  onFlaresChange,
}: {
  weaponTier: number;
  armorTier: number;
  flares: number;
  maxFlares: number;
  goldRemaining: number | null;
  setupError: string | null;
  onWeaponTier: (value: number) => void;
  onArmorTier: (value: number) => void;
  onFlaresChange: (value: number) => void;
}) {
  return (
    <div className={styles.gap3}>
      <h2 className={clsx('txt-h5', styles.stageTitle)}>Arm Thyself</h2>
      <p className={styles.stageBody}>
        Now, you must purchase a weapon, armor, and flares. Any remaining gold
        is kept for future exploits.
      </p>
      <div className={styles.shopGroup}>
        <TierGroup
          label="Weapon Tier"
          value={weaponTier}
          options={[1, 2, 3].map((tier) => ({
            value: tier,
            label: `${WEAPON_NAMES[tier]} - ${WEAPON_PRICES[tier]}`,
          }))}
          activeClass={styles.shopTierBtnActiveWeapon}
          onChange={onWeaponTier}
        />
        <TierGroup
          label="Armor Tier"
          value={armorTier}
          options={[1, 2, 3].map((tier) => ({
            value: tier,
            label: `${ARMOR_NAMES[tier]} - ${ARMOR_PRICES[tier]}`,
          }))}
          activeClass={styles.shopTierBtnActiveArmor}
          onChange={onArmorTier}
        />
        <div>
          <p className={styles.shopGroupLabel}>Flares</p>
          <div className={styles.flaresRow}>
            <button
              type="button"
              className={clsx('btn', 'btn-outlined')}
              onClick={() => onFlaresChange(Math.max(0, flares - 1))}
              disabled={flares === 0}
            >
              -
            </button>
            <p className={styles.flaresValue}>{flares}</p>
            <button
              type="button"
              className={clsx('btn', 'btn-outlined')}
              onClick={() => onFlaresChange(Math.min(maxFlares, flares + 1))}
              disabled={flares >= maxFlares}
            >
              +
            </button>
            <p className={styles.flaresMax}>Max {maxFlares}</p>
          </div>
        </div>
      </div>
      {setupError && <p className={styles.setupError}>{setupError}</p>}
      <p className={styles.goldRemaining}>
        Gold remaining: {goldRemaining !== null ? goldRemaining : '--'}
      </p>
    </div>
  );
}

function ReadyStage({ player }: { player: Player }) {
  return (
    <div className={styles.gap3}>
      <h2 className={clsx('txt-h5', styles.stageTitle)}>Setup Complete</h2>
      <p className={styles.stageBody}>
        Brave adventurer, thy gear outfits thee well! But alas, this quest is
        not for the faint of heart. Are you ready to enter the dungeon?
      </p>
      <div className={styles.readyList}>
        <p>Weapon: {player.weaponName}</p>
        <p>Armor: {player.armorName}</p>
        <p>Flares: {player.flares}</p>
        <p>Gold Remaining: {player.gold}</p>
      </div>
      <p className={styles.stageBody}>THE DUNGEON AWAITS YOU...</p>
    </div>
  );
}

function StatusReadout({
  race,
  derivedStats,
  gold,
  weaponTier,
  armorTier,
  flares,
  totalCost,
}: {
  race: Race | null;
  derivedStats: Stats | null;
  gold: number | null;
  weaponTier: number;
  armorTier: number;
  flares: number;
  totalCost: number;
}) {
  return (
    <div className={styles.gap2}>
      <div className={styles.statusGroup}>
        <p className={styles.statusGroupLabel}>Race</p>
        <p>
          {race
            ? raceOptions.find((option) => option.value === race)?.label
            : 'Unassigned'}
        </p>
      </div>
      <div className={styles.statusGroup}>
        <p className={styles.statusGroupLabel}>Stats</p>
        <p>ST {derivedStats ? derivedStats.ST : '--'}</p>
        <p>DX {derivedStats ? derivedStats.DX : '--'}</p>
        <p>IQ {derivedStats ? derivedStats.IQ : '--'}</p>
        <p>HP {derivedStats ? derivedStats.HP : '--'}</p>
      </div>
      <div className={styles.statusGroup}>
        <p className={styles.statusGroupLabel}>Inventory</p>
        <p>Gold: {gold !== null ? gold : '--'}</p>
        <p>Weapon: {WEAPON_NAMES[weaponTier]}</p>
        <p>Armor: {ARMOR_NAMES[armorTier]}</p>
        <p>Flares: {flares}</p>
      </div>
      {gold !== null && (
        <div className={styles.statusGroup}>
          <p className={styles.statusRemaining}>
            Remaining: {gold !== null ? gold - totalCost : '--'}
          </p>
        </div>
      )}
      <span className={clsx('txt-caption', 'ui-tip')}>
        Tip: press the letter keys shown on each command. Use the Shift
        {'\uE01C'} key to decrease values.
      </span>
    </div>
  );
}

function SetupGameMobile({
  mobileView,
  onSelectView,
  setupPanel,
  statsPanel,
}: {
  mobileView: 'setup' | 'stats' | 'help';
  onSelectView: (view: 'setup' | 'stats' | 'help') => void;
  setupPanel: ReactNode;
  statsPanel: ReactNode;
}) {
  return (
    <>
      <div className={styles.mobileShell}>
        {mobileView === 'setup' ? (
          setupPanel
        ) : mobileView === 'stats' ? (
          statsPanel
        ) : (
          <div className={styles.mobileHelpShell}>
            <MobileHelpPanel onClose={() => onSelectView('setup')} />
          </div>
        )}
      </div>
      <div className={styles.mobileNav}>
        <button
          type="button"
          className={clsx(
            'btn',
            mobileView === 'setup' ? 'btn-contained' : 'btn-outlined'
          )}
          onClick={() => onSelectView('setup')}
        >
          Setup
        </button>
        <button
          type="button"
          className={clsx(
            'btn',
            mobileView === 'stats' ? 'btn-contained' : 'btn-outlined'
          )}
          onClick={() => onSelectView('stats')}
        >
          Stats
        </button>
        <button
          type="button"
          className={clsx(
            'btn',
            mobileView === 'help' ? 'btn-contained' : 'btn-outlined'
          )}
          onClick={() => onSelectView('help')}
        >
          Help
        </button>
      </div>
    </>
  );
}

function SetupGameDesktop({
  setupPanel,
  statsPanel,
}: {
  setupPanel: ReactNode;
  statsPanel: ReactNode;
}) {
  return (
    <div className={styles.desktopGrid}>
      {setupPanel}
      {statsPanel}
    </div>
  );
}

function SetupPanel({
  isMobile,
  model,
}: {
  isMobile: boolean;
  model: SetupGameModel;
}) {
  const actionCommandIds: Record<SetupGameModel['stage'], string[]> = {
    race: ['race-confirm', 'race-back'],
    allocate: ['alloc-confirm', 'alloc-back'],
    shop: ['shop-confirm', 'shop-back'],
    ready: ['ready-enter', 'ready-reset'],
  };
  const actionCommands = model.commandList.filter((command) =>
    actionCommandIds[model.stage].includes(command.id)
  );

  return (
    <div className={styles.setupPanelStack}>
      <div className={clsx('ui-panel', styles.panel)}>
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
      {isMobile && actionCommands.length > 0 && (
        <SetupCommandPanel
          title="Setup Actions"
          commands={actionCommands}
          onTrigger={model.handleTrigger}
          titleVariant="compact"
        />
      )}
      {!isMobile && (
        <SetupCommandPanel
          title={`Setup Commands: ${model.stage}`}
          commands={model.commandList}
          onTrigger={model.handleTrigger}
          titleVariant="default"
        />
      )}
    </div>
  );
}

function StatsPanel({ model }: { model: SetupGameModel }) {
  return (
    <div className={clsx('ui-panel', styles.panel)}>
      <StatusReadout
        race={model.race}
        derivedStats={model.derivedStats}
        gold={model.gold}
        weaponTier={model.weaponTier}
        armorTier={model.armorTier}
        flares={model.flares}
        totalCost={model.totalCost}
      />
    </div>
  );
}

export default function SetupGame({
  onComplete,
  onBack,
}: {
  onComplete: (player: Player) => void;
  onBack: () => void;
}) {
  const isMobile = useMediaQuery('(max-width: 899px)');
  const model = useSetupGameModel({ onComplete, onBack });

  return (
    <div className={styles.root}>
      {isMobile ? (
        <SetupGameMobile
          mobileView={model.mobileView}
          onSelectView={model.setMobileView}
          setupPanel={<SetupPanel isMobile={isMobile} model={model} />}
          statsPanel={<StatsPanel model={model} />}
        />
      ) : (
        <SetupGameDesktop
          setupPanel={<SetupPanel isMobile={isMobile} model={model} />}
          statsPanel={<StatsPanel model={model} />}
        />
      )}
    </div>
  );
}

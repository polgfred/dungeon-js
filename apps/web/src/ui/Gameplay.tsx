import { useEffect } from 'react';

import clsx from 'clsx';

import { Feature, Mode, raceName, SPELL_MIN_IQ } from '@dod/core';
import type {
  ConnectionStatus,
  FeedItem,
  PartyMember,
  PlayerId,
  PlayerView,
} from '@dod/net/client';

import { ChatInput } from './ChatInput.js';
import { chatColorsById } from './chatColors.js';
import { Feed } from './Feed.js';
import styles from './Gameplay.module.css';
import layout from './Layout.module.css';
import {
  ENCOUNTER_COMMANDS,
  FEATURE_COMMANDS,
  NAV_COMMANDS,
  TRANSIT_COMMANDS,
} from './gameplayCommands.js';
import { GlyphDefs, MapGrid } from './mapView.js';
import { StatList, StatRow } from './StatList.js';
import { navigate } from './useRoute.js';

export type Command = {
  id: string;
  key: string;
  label: string;
  disabled: boolean;
  primary?: boolean;
};

function StatsReadout({ view }: { view: PlayerView }) {
  const s = view.self;
  return (
    <StatList>
      <StatRow label="Race" value={String(raceName(s.race))} />
      <StatRow
        label="Health"
        value={`${s.hp}/${s.mhp}`}
        tone={s.hp < 10 ? 'alert' : undefined}
      />
      <StatRow label="Strength" value={String(s.str)} />
      <StatRow label="Dexterity" value={String(s.dex)} />
      <StatRow label="Intelligence" value={String(s.iq)} />
      <StatRow label="Gold" value={String(s.gold)} />
      <StatRow
        label="Weapon"
        value={s.weaponName}
        tone={s.weaponBroken ? 'alert' : undefined}
        title={s.weaponBroken ? 'Broken' : undefined}
      />
      <StatRow
        label="Armour"
        value={s.armorName}
        tone={s.armorDamaged ? 'alert' : undefined}
        title={s.armorDamaged ? 'Damaged' : undefined}
      />
      <StatRow label="Flares" value={String(s.flares)} />
      <StatRow
        label="Spells"
        value={String(s.spells.reduce((total, count) => total + count, 0))}
      />
      <StatRow
        label="Treasures"
        value={`${view.treasuresFound}/10`}
        tone={view.treasuresFound >= 10 ? 'loot' : undefined}
      />
    </StatList>
  );
}

function LocationReadout({ view }: { view: PlayerView }) {
  const s = view.self;
  return (
    <StatList>
      <StatRow label="Level" value={String(s.z + 1)} />
      <StatRow label="Room" value={`${s.y + 1},${s.x + 1}`} />
    </StatList>
  );
}

function Party({
  party,
  playerId,
}: {
  party: readonly PartyMember[];
  playerId: PlayerId;
}) {
  const colorOf = chatColorsById(party);
  return (
    <section>
      <p className={clsx('ui-panel-title', layout.railTitle)}>Party</p>
      <ul className={styles.partyList}>
        {party.map((member) => (
          <li key={member.id} className={styles.partyRow}>
            <span className={styles.partyMark}>
              {member.id === playerId ? '*' : '√'}
            </span>
            <span
              className={clsx(
                styles.partyName,
                !member.connected && styles.partyOffline
              )}
            >
              <span style={{ color: colorOf(member.id) }}>{member.name}</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

// Display: a direction command's key → its arrow glyph.
const ARROWS: Record<string, string> = {
  N: '↑',
  S: '↓',
  W: '←',
  E: '→',
};

// Input: a physical arrow key → the direction command it sends.
const ARROW_KEYS: Record<string, string> = {
  ArrowUp: 'N',
  ArrowDown: 'S',
  ArrowLeft: 'W',
  ArrowRight: 'E',
};

function keyCap(command: Command): string {
  return command.id.startsWith('move-') && command.key in ARROWS
    ? ARROWS[command.key]
    : command.key;
}

/** Whether a command's action can be performed right now. */
function commandActive(command: Command, view: PlayerView): boolean {
  const here = view.map[view.self.y]?.[view.self.x];
  switch (command.id) {
    case 'move-n':
      return view.self.y > 0;
    case 'move-s':
      return view.self.y < view.map.length - 1;
    case 'move-w':
      return view.self.x > 0;
    case 'move-e':
      return view.self.x < view.map[view.self.y].length - 1;
    case 'move-u':
      return here === Feature.STAIRS_UP;
    case 'move-d':
      return here === Feature.STAIRS_DOWN;
    case 'exit':
      return here === Feature.EXIT;
    case 'act-flare':
      return view.self.flares > 0;
    case 'act-mirror':
      return here === Feature.MIRROR;
    case 'act-chest':
      return here === Feature.CHEST;
    case 'act-scroll':
      return here === Feature.SCROLL;
    case 'act-potion':
      return here === Feature.POTION;
    case 'act-vendor':
      return here === Feature.VENDOR;
    case 'run':
      return !view.self.fatigued;
    case 'spell':
      return (
        view.self.iq >= SPELL_MIN_IQ &&
        view.self.spells.some((count) => count > 0)
      );
    default:
      return true;
  }
}

/** A slim command chip: primary when the action applies here, dimmed otherwise.
 *  Dimmed ones aren't clickable, but the keyboard still fires them (the snarky
 *  "there is no chest here" easter egg). */
function LegendChip({
  command,
  active,
  onTrigger,
}: {
  command: Command;
  active: boolean;
  onTrigger: (command: Command) => void;
}) {
  return (
    <button
      type="button"
      className={styles.legendItem}
      disabled={!active}
      onClick={() => onTrigger(command)}
    >
      <span className={styles.legendKey}>{keyCap(command)}</span>
      <span className={styles.legendLabel}>{command.label}</span>
    </button>
  );
}

function LegendGroup({
  commands,
  view,
  onTrigger,
}: {
  commands: Command[];
  view: PlayerView;
  onTrigger: (command: Command) => void;
}) {
  return (
    <div className={styles.legendGroup}>
      {commands.map((command) => (
        <LegendChip
          key={command.id}
          command={command}
          active={commandActive(command, view)}
          onTrigger={onTrigger}
        />
      ))}
    </div>
  );
}

/** Directions as legend-style chips laid out in a cross. */
function CompassCross({
  commands,
  view,
  onTrigger,
}: {
  commands: Command[];
  view: PlayerView;
  onTrigger: (command: Command) => void;
}) {
  const byKey = Object.fromEntries(commands.map((c) => [c.key, c] as const));
  const chip = (key: string) => {
    const command = byKey[key];
    if (!command) return null;
    return (
      <LegendChip
        command={command}
        active={commandActive(command, view)}
        onTrigger={onTrigger}
      />
    );
  };
  return (
    <div className={styles.navCross}>
      <div className={styles.navRow}>{chip('N')}</div>
      <div className={styles.navRow}>
        {chip('W')}
        {chip('E')}
      </div>
      <div className={styles.navRow}>{chip('S')}</div>
    </div>
  );
}

function CommandCluster({
  view,
  onAction,
  onCancel,
}: {
  view: PlayerView;
  onAction: (command: string) => void;
  onCancel: () => void;
}) {
  const trigger = (command: Command) => onAction(command.key);

  // Dynamic menus you can't memorize (spell list, vendor): same slim chips as
  // everything else, but full-color (not dimmed) since they're the live choice.
  if (view.prompt) {
    const options = view.prompt.options ?? [];
    return (
      <div className={styles.prompt}>
        <p className={styles.promptText}>{view.prompt.text}</p>
        {options.map((option) => (
          <button
            key={option.key}
            type="button"
            className={styles.promptOption}
            disabled={option.disabled}
            onClick={() => onAction(option.key)}
          >
            <span className={styles.legendKey}>{option.key}</span>
            <span className={styles.promptLabel}>{option.label}</span>
            {option.note && (
              <span className={styles.promptNote}>{option.note}</span>
            )}
          </button>
        ))}
        {view.prompt.hasCancel && (
          <button
            type="button"
            className={styles.promptOption}
            onClick={onCancel}
          >
            <span className={styles.legendKey}>{'␛'}</span>
            <span>Cancel</span>
          </button>
        )}
      </div>
    );
  }

  // Combat is a live decision, so Fight/Run/Spell use the prominent prompt style
  // (the slim legend is reserved for nav/explore). Same active/keyboard rules.
  if (view.mode === Mode.ENCOUNTER) {
    return (
      <div className={styles.prompt}>
        {view.monster && (
          <p className={styles.promptText}>
            You are facing an angry {view.monster}!
          </p>
        )}
        {ENCOUNTER_COMMANDS.map((command) => (
          <button
            key={command.id}
            type="button"
            className={styles.promptOption}
            disabled={!commandActive(command, view)}
            onClick={() => trigger(command)}
          >
            <span className={styles.legendKey}>{command.key}</span>
            <span>{command.label}</span>
          </button>
        ))}
      </div>
    );
  }

  // Explore: the compass cross centered above two columns of slim chips —
  // room actions (F/L/O/R/P/B) beside the transit keys (U/D/X). Kept shorter
  // than the map so the map sets the board height — no reflow when the mode
  // (and this whole cluster) changes.
  return (
    <div className={styles.legend}>
      <CompassCross commands={NAV_COMMANDS} view={view} onTrigger={trigger} />
      <div className={styles.actionColumns}>
        <LegendGroup
          commands={FEATURE_COMMANDS}
          view={view}
          onTrigger={trigger}
        />
        <LegendGroup
          commands={TRANSIT_COMMANDS}
          view={view}
          onTrigger={trigger}
        />
      </div>
    </div>
  );
}

function EndOverlay({ ended }: { ended: Mode }) {
  const victory = ended === Mode.VICTORY;
  return (
    <div className={styles.end}>
      <h2 className={clsx('txt-h5', victory ? styles.endWin : styles.endLose)}>
        {victory ? 'ALL HAIL THE VICTOR!' : 'THE PARTY HAS FALLEN.'}
      </h2>
      <p className={styles.endText}>
        Art thou brave enough for another attempt?
      </p>
      <button
        type="button"
        className={clsx('btn', 'btn-outlined')}
        onClick={() => navigate('/')}
      >
        Back to title
      </button>
    </div>
  );
}

export function Gameplay({
  view,
  feed,
  status,
  playerId,
  onAction,
  onCancel,
  onChat,
}: {
  view: PlayerView;
  feed: FeedItem[];
  status: ConnectionStatus;
  playerId: PlayerId;
  onAction: (command: string) => void;
  onCancel: () => void;
  onChat: (text: string) => void;
}) {
  // Whether arrows are allowed to substitute for N/S/E/W
  const arrowsMove = !view.prompt && view.mode === Mode.EXPLORE;
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')
      )
        return;
      if (event.key === 'Escape') {
        onCancel();
        return;
      }
      const arrow = ARROW_KEYS[event.key];
      if (arrow) {
        event.preventDefault(); // don't inadvertently scroll
        if (arrowsMove) onAction(arrow);
        return;
      }
      if (event.key.length === 1 && /[a-z0-9]/i.test(event.key)) {
        onAction(event.key.toUpperCase());
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onAction, onCancel, arrowsMove]);

  const colorOf = chatColorsById(view.party);

  return (
    <div className={layout.root}>
      <GlyphDefs />

      <section className={clsx(layout.board, styles.board)}>
        <MapGrid
          map={view.map}
          occupants={view.occupants}
          playerId={playerId}
          colorOf={colorOf}
        />
        {view.ended ? (
          <EndOverlay ended={view.ended} />
        ) : (
          <CommandCluster view={view} onAction={onAction} onCancel={onCancel} />
        )}
      </section>

      <aside className={layout.sidebar}>
        {status !== 'open' && (
          <p className={layout.reconnecting}>
            {status === 'closed' ? 'Reconnecting...' : 'Connecting…'}
          </p>
        )}
        <section>
          <p className={clsx('ui-panel-title', layout.railTitle)}>Status</p>
          <StatsReadout view={view} />
        </section>
        <section>
          <p className={clsx('ui-panel-title', layout.railTitle)}>Location</p>
          <LocationReadout view={view} />
        </section>
        <Party party={view.party} playerId={playerId} />
      </aside>

      <section className={layout.feedDock}>
        <Feed feed={feed} members={view.party} playerId={playerId} />
        <ChatInput onSend={onChat} />
      </section>
    </div>
  );
}

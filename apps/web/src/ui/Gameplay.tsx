import { useEffect, useRef } from 'react';

import clsx from 'clsx';

import { Mode } from '@dod/core';
import type {
  ConnectionStatus,
  FeedItem,
  PartyMember,
  PlayerId,
  PlayerView,
} from '@dod/net/client';

import type { Command } from './CommandButton.js';
import styles from './Gameplay.module.css';
import {
  ENCOUNTER_COMMANDS,
  FEATURE_COMMANDS,
  NAV_COMMANDS,
  TRANSIT_COMMANDS,
} from './gameplayCommands.js';
import { GlyphDefs, MapGrid } from './mapView.js';
import { navigate } from './useRoute.js';

function StatRow({ label, value, alert }: { label: string; value: string; alert?: boolean }) {
  return (
    <div className={styles.statRow}>
      <dt className={styles.statLabel}>{label}</dt>
      <dd className={clsx(styles.statValue, alert && styles.hpLow)}>{value}</dd>
    </div>
  );
}

function StatsReadout({ view }: { view: PlayerView }) {
  const s = view.self;
  return (
    <div className={styles.stats}>
      <p className={clsx('ui-panel-title', styles.railTitle)}>Status</p>
      <dl className={styles.statList}>
        <StatRow label="HP" value={`${s.hp}/${s.mhp}`} alert={s.hp < 10} />
        <StatRow label="ST" value={String(s.str)} />
        <StatRow label="DX" value={String(s.dex)} />
        <StatRow label="IQ" value={String(s.iq)} />
        <StatRow label="Gold" value={String(s.gold)} />
        <StatRow label="Flares" value={String(s.flares)} />
        <StatRow label="Treasures" value={`${view.treasuresFound}/10`} />
        <StatRow
          label="Weapon"
          value={`${s.weaponName}${s.weaponBroken ? ' (broken)' : ''}`}
        />
        <StatRow
          label="Armour"
          value={`${s.armorName}${s.armorDamaged ? ' (damaged)' : ''}`}
        />
      </dl>
    </div>
  );
}

function Party({ party, playerId }: { party: PartyMember[]; playerId: PlayerId }) {
  return (
    <>
      <p className={clsx('ui-panel-title', styles.railTitle)}>Party</p>
      <ul className={styles.partyList}>
        {party.map((member) => (
          <li
            key={member.id}
            className={clsx(styles.partyRow, !member.alive && styles.partyDead)}
          >
            {member.name}
            {member.id === playerId ? ' (you)' : ''}
            {!member.alive && ' †'}
          </li>
        ))}
      </ul>
    </>
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

/** A slim, dim, still-clickable command chip — training wheels that stay out of
 *  the way once you've learned the keys. */
function LegendChip({
  command,
  onTrigger,
}: {
  command: Command;
  onTrigger: (command: Command) => void;
}) {
  return (
    <button
      type="button"
      className={styles.legendItem}
      onClick={() => onTrigger(command)}
    >
      <span className={styles.legendKey}>{keyCap(command)}</span>
      <span className={styles.legendLabel}>{command.label}</span>
    </button>
  );
}

function LegendGroup({
  commands,
  onTrigger,
}: {
  commands: Command[];
  onTrigger: (command: Command) => void;
}) {
  return (
    <div className={styles.legendGroup}>
      {commands.map((command) => (
        <LegendChip key={command.id} command={command} onTrigger={onTrigger} />
      ))}
    </div>
  );
}

/** Directions as a D-pad cross — arrow keys drive it too, so position carries
 *  the meaning and the labels drop away. */
function CompassCross({
  commands,
  onTrigger,
}: {
  commands: Command[];
  onTrigger: (command: Command) => void;
}) {
  const byKey = Object.fromEntries(commands.map((c) => [c.key, c] as const));
  const cell = (key: string) => {
    const command = byKey[key];
    if (!command) return <span />;
    return (
      <button
        type="button"
        className={styles.compassKey}
        title={command.label}
        onClick={() => onTrigger(command)}
      >
        {keyCap(command)}
      </button>
    );
  };
  return (
    <div className={styles.compass}>
      <span />
      {cell('N')}
      <span />
      {cell('W')}
      <span />
      {cell('E')}
      <span />
      {cell('S')}
      <span />
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
            <span>{option.label}</span>
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

  if (view.mode === Mode.ENCOUNTER) {
    return (
      <div className={styles.legend}>
        <LegendGroup commands={ENCOUNTER_COMMANDS} onTrigger={trigger} />
      </div>
    );
  }

  // Explore: a nav block (cross + U/D/X) over the room actions. Kept shorter
  // than the map so the map sets the board height — no reflow when the mode
  // (and this whole cluster) changes.
  return (
    <div className={styles.legend}>
      <div className={styles.navBlock}>
        <CompassCross commands={NAV_COMMANDS} onTrigger={trigger} />
        <LegendGroup commands={TRANSIT_COMMANDS} onTrigger={trigger} />
      </div>
      <LegendGroup commands={FEATURE_COMMANDS} onTrigger={trigger} />
    </div>
  );
}

const FEED_KIND_CLASS: Partial<Record<string, string>> = {
  LOOT: styles.feedLoot,
  COMBAT: styles.feedCombat,
  ERROR: styles.feedError,
};

function Feed({
  feed,
  party,
  playerId,
}: {
  feed: FeedItem[];
  party: PartyMember[];
  playerId: PlayerId;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [feed.length]);

  const named = (id: PlayerId) =>
    party.find((member) => member.id === id)?.name ?? id;
  const lines = feed.filter(
    (item) => item.event.kind !== 'PROMPT' && item.event.kind !== 'DEBUG'
  );

  return (
    <div ref={scroller} className={styles.feed}>
      {lines.map((item, i) => {
        const mine = item.from === playerId;
        const tag = item.event.broadcast && !mine ? `«${named(item.from)}» ` : '';
        return (
          <div
            key={i}
            className={clsx(
              styles.feedLine,
              FEED_KIND_CLASS[item.event.kind],
              item.event.broadcast && !mine && styles.feedBroadcast
            )}
          >
            {tag}
            {item.event.text}
          </div>
        );
      })}
    </div>
  );
}

function EndOverlay({ ended }: { ended: Mode }) {
  const victory = ended === Mode.VICTORY;
  return (
    <div className={styles.end}>
      <h2 className={clsx('txt-h5', victory ? styles.endWin : styles.endLose)}>
        {victory ? 'ALL HAIL THE VICTOR!' : 'THE PARTY HAS FALLEN'}
      </h2>
      <button type="button" className={clsx('btn', 'btn-outlined')} onClick={() => navigate('/')}>
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
}: {
  view: PlayerView;
  feed: FeedItem[];
  status: ConnectionStatus;
  playerId: PlayerId;
  onAction: (command: string) => void;
  onCancel: () => void;
}) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;
      if (event.key === 'Escape') {
        onCancel();
        return;
      }
      const arrow = ARROW_KEYS[event.key];
      if (arrow) {
        event.preventDefault();
        onAction(arrow);
        return;
      }
      if (event.key.length === 1 && /[a-z0-9]/i.test(event.key)) {
        onAction(event.key.toUpperCase());
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onAction, onCancel]);

  return (
    <div className={styles.game}>
      <GlyphDefs />

      <section className={styles.board}>
        {view.ended ? (
          <EndOverlay ended={view.ended} />
        ) : (
          <>
            <MapGrid map={view.map} selfX={view.self.x} selfY={view.self.y} />
            <CommandCluster view={view} onAction={onAction} onCancel={onCancel} />
          </>
        )}
      </section>

      <aside className={styles.statsPane}>
        {status !== 'open' && (
          <p className={styles.reconnecting}>
            {status === 'closed' ? 'Disconnected — reconnecting…' : 'Connecting…'}
          </p>
        )}
        <StatsReadout view={view} />
      </aside>

      <section className={styles.feedDock}>
        <Feed feed={feed} party={view.party} playerId={playerId} />
      </section>

      <aside className={styles.members}>
        <Party party={view.party} playerId={playerId} />
      </aside>
    </div>
  );
}

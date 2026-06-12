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

import { CommandButton, type Command } from './CommandButton.js';
import styles from './Gameplay.module.css';
import {
  ENCOUNTER_COMMANDS,
  EXPLORE_COMMAND_GROUPS,
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
    <div className={styles.party}>
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
    </div>
  );
}

const ARROWS: Record<string, string> = {
  N: '↑',
  S: '↓',
  W: '←',
  E: '→',
};

function keyCap(command: Command): string {
  return command.id.startsWith('move-') && command.key in ARROWS
    ? ARROWS[command.key]
    : command.key;
}

/** A slim, dim, still-clickable reference for the static commands — training
 *  wheels that stay out of the way once you've learned the keys. Grouped into
 *  lines (directions / transitions / actions). */
function CommandLegend({
  groups,
  onTrigger,
}: {
  groups: Command[][];
  onTrigger: (command: Command) => void;
}) {
  return (
    <div className={styles.legend}>
      {groups.map((group, i) => (
        <div key={i} className={styles.legendGroup}>
          {group.map((command) => (
            <button
              key={command.id}
              type="button"
              className={styles.legendItem}
              onClick={() => onTrigger(command)}
            >
              <span className={styles.legendKey}>{keyCap(command)}</span>
              <span className={styles.legendLabel}>{command.label}</span>
            </button>
          ))}
        </div>
      ))}
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

  // Dynamic menus you can't memorize (spell list, vendor) stay prominent.
  if (view.prompt) {
    const options = view.prompt.options ?? [];
    return (
      <div className={styles.prompt}>
        <div className={styles.promptButtons}>
          {options.map((option) => (
            <CommandButton
              key={option.key}
              command={{
                id: `prompt-${option.key}`,
                key: option.key,
                label: option.label,
                disabled: option.disabled,
              }}
              onTrigger={trigger}
            />
          ))}
          {view.prompt.hasCancel && (
            <button type="button" className={clsx('btn', 'btn-outlined')} onClick={onCancel}>
              Cancel
            </button>
          )}
        </div>
      </div>
    );
  }

  // Static commands become a slim how-to legend (keyboard does the real work).
  return (
    <CommandLegend
      groups={view.mode === Mode.ENCOUNTER ? [ENCOUNTER_COMMANDS] : EXPLORE_COMMAND_GROUPS}
      onTrigger={trigger}
    />
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

      <aside className={styles.sidebar}>
        {status !== 'open' && (
          <p className={styles.reconnecting}>
            {status === 'closed' ? 'Disconnected — reconnecting…' : 'Connecting…'}
          </p>
        )}
        <StatsReadout view={view} />
        <Party party={view.party} playerId={playerId} />
      </aside>

      <section className={styles.feedDock}>
        <Feed feed={feed} party={view.party} playerId={playerId} />
      </section>
    </div>
  );
}

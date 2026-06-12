import { useEffect, useRef } from 'react';

import clsx from 'clsx';

import { Feature, Mode, SPELL_MIN_IQ } from '@dod/core';
import type {
  ConnectionStatus,
  FeedItem,
  PartyMember,
  PlayerId,
  PlayerView,
} from '@dod/net/client';

import { ChatInput } from './ChatInput.js';
import { chatColorsById } from './chatColors.js';
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

const STAT_TONE = {
  alert: styles.statAlert,
  loot: styles.statLoot,
} as const;

function StatRow({
  label,
  value,
  tone,
  title,
}: {
  label: string;
  value: string;
  tone?: keyof typeof STAT_TONE;
  title?: string;
}) {
  return (
    <div className={styles.statRow}>
      <dt className={styles.statLabel}>{label}</dt>
      <dd className={clsx(styles.statValue, tone && STAT_TONE[tone])} title={title}>
        {value}
      </dd>
    </div>
  );
}

function StatsReadout({ view }: { view: PlayerView }) {
  const s = view.self;
  return (
    <div className={styles.stats}>
      <p className={clsx('ui-panel-title', styles.railTitle)}>Status</p>
      <dl className={styles.statList}>
        <StatRow label="HP" value={`${s.hp}/${s.mhp}`} tone={s.hp < 10 ? 'alert' : undefined} />
        <StatRow label="ST" value={String(s.str)} />
        <StatRow label="DX" value={String(s.dex)} />
        <StatRow label="IQ" value={String(s.iq)} />
        <StatRow label="Gold" value={String(s.gold)} />
        <StatRow label="Flares" value={String(s.flares)} />
        <StatRow
          label="Treasures"
          value={`${view.treasuresFound}/10`}
          tone={view.treasuresFound >= 10 ? 'loot' : undefined}
        />
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
      </dl>
    </div>
  );
}

function Party({ party, playerId }: { party: PartyMember[]; playerId: PlayerId }) {
  const colorOf = chatColorsById(party);
  return (
    <>
      <p className={clsx('ui-panel-title', styles.railTitle)}>Party</p>
      <ul className={styles.partyList}>
        {party.map((member) => (
          <li key={member.id} className={styles.partyRow}>
            <span style={{ color: colorOf(member.id) }}>{member.name}</span>
            {member.id === playerId ? ' (you)' : ''}
            {/* Only ever set on the terminal game-over frame — marks who fell. */}
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

/**
 * Whether a command's action can be performed right now — drives the primary vs
 * dimmed look. The current room is the tile under the player (always fresh,
 * since you re-observe it every action), so feature actions key off it.
 */
function commandActive(command: Command, view: PlayerView): boolean {
  const here = view.map[view.self.y]?.[view.self.x];
  switch (command.id) {
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
        Object.values(view.self.spells).some((count) => count > 0)
      );
    default:
      return true; // movement and Fight are always attemptable
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

  // Combat is a live decision, so Fight/Run/Spell use the prominent prompt style
  // (the slim legend is reserved for nav/explore). Same active/keyboard rules.
  if (view.mode === Mode.ENCOUNTER) {
    return (
      <div className={styles.prompt}>
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

  // Explore: a nav block (cross + U/D/X) over the room actions. Kept shorter
  // than the map so the map sets the board height — no reflow when the mode
  // (and this whole cluster) changes.
  return (
    <div className={styles.legend}>
      <div className={styles.navBlock}>
        <CompassCross commands={NAV_COMMANDS} onTrigger={trigger} />
        <LegendGroup commands={TRANSIT_COMMANDS} view={view} onTrigger={trigger} />
      </div>
      <LegendGroup commands={FEATURE_COMMANDS} view={view} onTrigger={trigger} />
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
  const colorOf = chatColorsById(party);
  const lines = feed.filter(
    (item) =>
      item.kind === 'chat' ||
      (item.event.kind !== 'PROMPT' && item.event.kind !== 'DEBUG')
  );

  return (
    <div ref={scroller} className={styles.feed}>
      {lines.map((item, i) => {
        if (item.kind === 'chat') {
          return (
            <div key={i} className={styles.feedChat}>
              <span className={styles.chatName} style={{ color: colorOf(item.from) }}>
                &lt;{item.name}&gt;
              </span>{' '}
              <span className={styles.chatText}>{item.text}</span>
            </div>
          );
        }
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
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;
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
            {status === 'closed' ? 'Reconnecting...' : 'Connecting…'}
          </p>
        )}
        <StatsReadout view={view} />
      </aside>

      <section className={styles.feedDock}>
        <Feed feed={feed} party={view.party} playerId={playerId} />
        <ChatInput onSend={onChat} />
      </section>

      <aside className={styles.members}>
        <Party party={view.party} playerId={playerId} />
      </aside>
    </div>
  );
}

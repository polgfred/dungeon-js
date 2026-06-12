import { useEffect } from 'react';

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
  ACTION_COMMANDS,
  ENCOUNTER_COMMANDS,
  MOVE_COMMANDS,
  VERTICAL_COMMANDS,
} from './gameplayCommands.js';
import { GlyphDefs, MapGrid } from './mapView.js';
import { navigate } from './useRoute.js';

function StatsLine({ view }: { view: PlayerView }) {
  const { self } = view;
  return (
    <p className={styles.stats}>
      <span className={clsx(self.hp < 10 && styles.hpLow)}>
        HP {self.hp}/{self.mhp}
      </span>
      {' · '}gold {self.gold}
      {' · '}flares {self.flares}
      {' · '}treasures {view.treasuresFound}/10
      {' · '}
      {self.weaponName} / {self.armorName}
    </p>
  );
}

function ExploreControls({
  onTrigger,
}: {
  onTrigger: (command: Command) => void;
}) {
  return (
    <div className={styles.controls}>
      <div className={styles.dpad}>
        <span />
        <CommandButton command={MOVE_COMMANDS[0]} onTrigger={onTrigger} layout="stacked" />
        <span />
        <CommandButton command={MOVE_COMMANDS[1]} onTrigger={onTrigger} layout="stacked" />
        <span />
        <CommandButton command={MOVE_COMMANDS[2]} onTrigger={onTrigger} layout="stacked" />
        <span />
        <CommandButton command={MOVE_COMMANDS[3]} onTrigger={onTrigger} layout="stacked" />
        <span />
      </div>
      <div className={styles.actions}>
        {VERTICAL_COMMANDS.map((command) => (
          <CommandButton key={command.id} command={command} onTrigger={onTrigger} />
        ))}
        {ACTION_COMMANDS.map((command) => (
          <CommandButton key={command.id} command={command} onTrigger={onTrigger} />
        ))}
      </div>
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

  if (view.prompt) {
    const options = view.prompt.options ?? [];
    return (
      <div className={styles.actions}>
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
          <button
            type="button"
            className={clsx('btn', 'btn-outlined')}
            onClick={onCancel}
          >
            Cancel
          </button>
        )}
      </div>
    );
  }

  if (view.mode === Mode.ENCOUNTER) {
    return (
      <div className={styles.actions}>
        {ENCOUNTER_COMMANDS.map((command) => (
          <CommandButton key={command.id} command={command} onTrigger={trigger} />
        ))}
      </div>
    );
  }

  return <ExploreControls onTrigger={trigger} />;
}

function Party({
  party,
  playerId,
}: {
  party: PartyMember[];
  playerId: PlayerId;
}) {
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
  const named = (id: PlayerId) =>
    party.find((member) => member.id === id)?.name ?? id;
  const lines = feed.filter(
    (item) => item.event.kind !== 'PROMPT' && item.event.kind !== 'DEBUG'
  );
  return (
    <div className={styles.feed}>
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
}: {
  view: PlayerView;
  feed: FeedItem[];
  status: ConnectionStatus;
  playerId: PlayerId;
  onAction: (command: string) => void;
  onCancel: () => void;
}) {
  // Keyboard: any letter/digit is a command; Esc cancels. The server interprets
  // the key by mode (F = Flare exploring, Fight in an encounter, etc.).
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA'))
        return;
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
        {status !== 'open' && (
          <p className={styles.reconnecting}>
            {status === 'closed' ? 'Disconnected — reconnecting…' : 'Connecting…'}
          </p>
        )}
        {view.ended ? (
          <EndOverlay ended={view.ended} />
        ) : (
          <>
            <MapGrid map={view.map} selfX={view.self.x} selfY={view.self.y} />
            <StatsLine view={view} />
            <CommandCluster view={view} onAction={onAction} onCancel={onCancel} />
          </>
        )}
      </section>

      <aside className={styles.rail}>
        <Party party={view.party} playerId={playerId} />
        <Feed feed={feed} party={view.party} playerId={playerId} />
      </aside>
    </div>
  );
}

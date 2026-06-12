import { useState } from 'react';

import clsx from 'clsx';

import { tileSymbol } from '@dod/core';
import type { ConnectionStatus, FeedItem, PlayerView } from '@dod/net/client';

import styles from './Play.module.css';

// A deliberately minimal, functional gameplay surface — the browser equivalent
// of the terminal client: text map, the shared feed, a command line. The full
// gameplay UI (SVG glyphs, command grid, encounter dialogs, mobile) is the next
// increment; this proves the whole loop end to end.
export function GameplayStub({
  view,
  feed,
  status,
  onAction,
  onCancel,
}: {
  view: PlayerView;
  feed: FeedItem[];
  status: ConnectionStatus;
  onAction: (command: string) => void;
  onCancel: () => void;
}) {
  const [command, setCommand] = useState('');
  const { self } = view;

  const submit = () => {
    const trimmed = command.trim();
    if (!trimmed) return;
    onAction(trimmed);
    setCommand('');
  };

  const mapText = view.map
    .map((row, y) =>
      row
        .map((tile, x) =>
          x === self.x && y === self.y ? '@' : tileSymbol(tile)
        )
        .join(' ')
    )
    .join('\n');

  const party = view.party
    .map((p) => `${p.name}${p.alive ? '' : '†'}`)
    .join(', ');

  return (
    <div className={styles.game}>
      <pre className={clsx('ui-panel', styles.map)}>{mapText}</pre>

      <div className={styles.stats}>
        HP {self.hp}/{self.mhp} · gold {self.gold} · flares {self.flares} ·
        treasures {view.treasuresFound}/10 · party: {party}
      </div>

      <div className={clsx('ui-panel', styles.feed)}>
        {feed.map((item, i) => (
          <div
            key={i}
            className={clsx(
              styles.feedLine,
              item.event.kind === 'LOOT' && styles.feedLoot,
              item.event.kind === 'COMBAT' && styles.feedCombat,
              item.event.broadcast && styles.feedBroadcast
            )}
          >
            {item.event.kind === 'PROMPT' ? `> ${item.event.text}` : item.event.text}
          </div>
        ))}
      </div>

      <div className={styles.cmd}>
        <input
          className={styles.cmdInput}
          value={command}
          placeholder="n/s/e/w, f, l, o, r, p, b, u/d/x…"
          disabled={status !== 'open'}
          onChange={(event) => setCommand(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') submit();
            if (event.key === 'Escape') onCancel();
          }}
        />
        <button
          type="button"
          className={clsx('btn', 'btn-contained')}
          onClick={submit}
        >
          Go
        </button>
        <button
          type="button"
          className={clsx('btn', 'btn-outlined')}
          onClick={onCancel}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

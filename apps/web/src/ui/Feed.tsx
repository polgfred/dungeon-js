import { useEffect, useRef } from 'react';

import clsx from 'clsx';

import type { FeedItem, PlayerId } from '@dod/net/client';

import { chatColorsById } from './chatColors.js';
import styles from './Feed.module.css';

const FEED_KIND_CLASS: Partial<Record<string, string>> = {
  LOOT: styles.feedLoot,
  COMBAT: styles.feedCombat,
  ERROR: styles.feedError,
};

/** Anything with a name and id — a lobby member or a party member alike. */
type FeedMember = { id: PlayerId; name: string };

/** A single feed line. */
function NamedLine({
  item,
  playerId,
  named,
  colorOf,
}: {
  item: FeedItem;
  playerId: PlayerId;
  named: (id: PlayerId) => string;
  colorOf: (id: PlayerId) => string;
}) {
  const mine = item.from === playerId;
  const bullet = item.kind === 'chat' ? '-' : '*';
  const text = item.kind === 'chat' ? item.text : item.event.text;
  const textClass =
    item.kind === 'chat' ? styles.chatText : FEED_KIND_CLASS[item.event.kind];
  return (
    <div className={styles.feedLine}>
      <span className={styles.feedBullet}>{bullet} </span>
      {!mine && (
        <span style={{ color: colorOf(item.from) }}>
          &lt;{named(item.from)}&gt;{' '}
        </span>
      )}
      <span className={textClass}>{text}</span>
    </div>
  );
}

/** The scrolling chat/event log, shared by the lobby and gameplay */
export function Feed({
  feed,
  members,
  playerId,
}: {
  feed: FeedItem[];
  members: FeedMember[];
  playerId: PlayerId;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [feed.length]);

  const named = (id: PlayerId) =>
    members.find((member) => member.id === id)?.name ?? id;
  const colorOf = chatColorsById(members);
  const lines = feed.filter(
    (item) =>
      item.kind === 'chat' ||
      (item.event.kind !== 'PROMPT' && item.event.kind !== 'DEBUG')
  );

  return (
    <div ref={scroller} className={styles.feed}>
      {lines.map((item, i) => (
        <NamedLine
          key={i}
          item={item}
          playerId={playerId}
          named={named}
          colorOf={colorOf}
        />
      ))}
    </div>
  );
}

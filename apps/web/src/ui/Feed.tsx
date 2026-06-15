import { Fragment, useEffect, useRef } from 'react';

import { ACTOR_TOKEN } from '@dod/core';
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

  // Chat stays a tagged quote: "- <name> message".
  if (item.kind === 'chat') {
    return (
      <div className={styles.feedLine}>
        <span className={styles.feedBullet}>- </span>
        {!mine && (
          <span style={{ color: colorOf(item.from) }}>
            &lt;{named(item.from)}&gt;{' '}
          </span>
        )}
        <span className={styles.chatText}>{item.text}</span>
      </div>
    );
  }

  // Game events: replace ACTOR_TOKEN with player name.
  const textClass = FEED_KIND_CLASS[item.event.kind];
  const parts = item.event.text.split(ACTOR_TOKEN);
  return (
    <div className={styles.feedLine}>
      <span className={styles.feedBullet}>* </span>
      {parts.map((part, i) => (
        <Fragment key={i}>
          {i > 0 && (
            <span style={{ color: colorOf(item.from) }}>{named(item.from)}</span>
          )}
          {part && <span className={textClass}>{part}</span>}
        </Fragment>
      ))}
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

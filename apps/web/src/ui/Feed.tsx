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
  // A local notice (connection dropped/restored): no actor, dim framing.
  if (item.kind === 'notice') {
    return (
      <div className={styles.feedLine}>
        <span className={styles.feedBullet}>= </span>
        <span className={styles.noticeText}>{item.text}</span>
      </div>
    );
  }

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
            <span style={{ color: colorOf(item.from) }}>
              {named(item.from)}
            </span>
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
  // Only autoscroll when the reader is already parked at the bottom.
  const pinned = useRef(true);
  const onScroll = () => {
    const el = scroller.current;
    if (el)
      pinned.current = el.scrollHeight - el.scrollTop - el.clientHeight < 32;
  };
  useEffect(() => {
    const el = scroller.current;
    if (el && pinned.current) el.scrollTop = el.scrollHeight;
  }, [feed]);

  const named = (id: PlayerId) =>
    members.find((member) => member.id === id)?.name ?? id;
  const colorOf = chatColorsById(members);
  const lines = feed.filter(
    (item) => item.kind !== 'event' || item.event.kind !== 'PROMPT'
  );

  return (
    <div ref={scroller} className={styles.feed} onScroll={onScroll}>
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

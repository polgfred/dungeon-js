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

/** A single feed line: <name> message, the name in the player's color. */
function NamedLine({
  textClass,
  color,
  name,
  text,
}: {
  textClass?: string;
  color: string;
  name: string;
  text: string;
}) {
  return (
    <div className={styles.feedLine}>
      <span style={{ color }}>&lt;{name}&gt;</span>{' '}
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
      {lines.map((item, i) => {
        if (item.kind === 'chat') {
          return (
            <NamedLine
              key={i}
              textClass={styles.chatText}
              color={colorOf(item.from)}
              name={item.name}
              text={item.text}
            />
          );
        }
        const mine = item.from === playerId;
        // Another player's broadcast: their name in their color, the message in
        // its normal type color (combat/loot/error).
        if (item.event.broadcast && !mine) {
          return (
            <NamedLine
              key={i}
              textClass={FEED_KIND_CLASS[item.event.kind]}
              color={colorOf(item.from)}
              name={named(item.from)}
              text={item.event.text}
            />
          );
        }
        // Nameless game/system events: just the message, in its standard color.
        return (
          <div
            key={i}
            className={clsx(styles.feedLine, FEED_KIND_CLASS[item.event.kind])}
          >
            * {item.event.text}
          </div>
        );
      })}
    </div>
  );
}

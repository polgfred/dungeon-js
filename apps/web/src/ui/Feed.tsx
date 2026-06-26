import { Fragment, useEffect, useRef } from 'react';

import { ACTOR_TOKEN } from '@dod/core';
import type { FeedGroup, PlayerId } from '@dod/net/client';

import styles from './Feed.module.css';
import { chatColorsById } from './chatColors.js';

const FEED_GROUP_MARK: Partial<Record<FeedGroup['kind'], string>> = {
  notice: '=',
  chat: '-',
  event: '>',
};

const FEED_KIND_CLASS: Partial<Record<string, string>> = {
  LOOT: styles.feedLoot,
  COMBAT: styles.feedCombat,
  ERROR: styles.feedError,
};

type FeedMember = { id: PlayerId; name: string };

function FeedTurn({
  group,
  playerId,
  named,
  colorOf,
}: {
  group: FeedGroup;
  playerId: PlayerId;
  named: (id: PlayerId) => string;
  colorOf: (id: PlayerId) => string;
}) {
  switch (group.kind) {
    case 'notice':
      return (
        <div className={styles.feedLine}>
          <span className={styles.noticeText}>{group.text}</span>
        </div>
      );
    case 'chat': {
      const mine = group.from === playerId;
      return (
        <div className={styles.feedLine}>
          {!mine && (
            <span style={{ color: colorOf(group.from) }}>
              &lt;{named(group.from)}&gt;{' '}
            </span>
          )}
          <span className={styles.chatText}>{group.text}</span>
        </div>
      );
    }
    case 'event':
      return (
        <>
          {group.events.map((event, i) => {
            const textClass = FEED_KIND_CLASS[event.kind];
            const parts = event.text.split(ACTOR_TOKEN);
            return (
              <div className={styles.feedLine} key={i}>
                {parts.map((part, i) => (
                  <Fragment key={i}>
                    {i > 0 && (
                      <span style={{ color: colorOf(group.from) }}>
                        {named(group.from)}
                      </span>
                    )}
                    {part && <span className={textClass}>{part}</span>}
                  </Fragment>
                ))}
              </div>
            );
          })}
        </>
      );
  }
}

export function Feed({
  feed,
  members,
  playerId,
}: {
  feed: readonly FeedGroup[];
  members: readonly FeedMember[];
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

  const colorOf = chatColorsById(members);
  const named = (id: PlayerId) =>
    members.find((member) => member.id === id)?.name ?? id;

  return (
    <div ref={scroller} className={styles.feed} onScroll={onScroll}>
      <div className={styles.feedInner}>
        {feed.map((group, i) => (
          <div className={styles.feedTurn} key={i}>
            <div className={styles.feedGroupMark}>
              {FEED_GROUP_MARK[group.kind]}
            </div>
            <FeedTurn
              group={group}
              playerId={playerId}
              named={named}
              colorOf={colorOf}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

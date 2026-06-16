import { useEffect, useRef, useState } from 'react';

import clsx from 'clsx';

import { serializePlayer, type PlayerSave } from '@dod/core';
import type {
  ConnectionStatus,
  FeedItem,
  LobbyState,
  PlayerId,
} from '@dod/net/client';

import { ChatInput } from './ChatInput.js';
import { chatColorsById } from './chatColors.js';
import { CharacterReadout } from './CharacterReadout.js';
import { Feed } from './Feed.js';
import { LobbyBuilder } from './LobbyBuilder.js';
import layout from './Layout.module.css';
import styles from './Lobby.module.css';
import { useSetupGameModel } from './SetupGameModel.js';

function ReadyCard({
  everyoneReady,
  onStart,
}: {
  everyoneReady: boolean;
  onStart: () => void;
}) {
  useEffect(() => {
    if (!everyoneReady) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Enter') return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const tag = (event.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'BUTTON') return;
      event.preventDefault();
      onStart();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [everyoneReady, onStart]);

  if (everyoneReady) {
    return (
      <div className={styles.ready}>
        <p className={styles.readyTextCallout}>THE DUNGEON AWAITS YOU...</p>
        <button
          type="button"
          className={clsx('btn', 'btn-contained', styles.startBtn)}
          onClick={onStart}
        >
          Enter the dungeon
        </button>
      </div>
    );
  } else {
    return (
      <div className={styles.ready}>
        <p className={styles.readyText}>
          The virtue of patience shall stand thee in good stead at this point: I
          must needs prepare the dungeon. When the entire party is ready, the
          quest may begin.
        </p>
        <p className={styles.awaiting}>
          Awaiting the party
          <span className={styles.dots} aria-hidden="true" />
        </p>
      </div>
    );
  }
}

export function Lobby({
  code,
  lobby,
  playerId,
  status,
  feed,
  onSetCharacter,
  onStart,
  onChat,
}: {
  code: string;
  lobby: LobbyState | null;
  playerId: PlayerId;
  status: ConnectionStatus;
  feed: FeedItem[];
  onSetCharacter: (character: PlayerSave) => void;
  onStart: () => void;
  onChat: (text: string) => void;
}) {
  const [submitted, setSubmitted] = useState(false);
  // The build model lives here so the stats quadrant can read the character as
  // it's assembled, mirroring the gameplay Status pane.
  const model = useSetupGameModel({
    onComplete: (player) => {
      onSetCharacter(serializePlayer(player));
      setSubmitted(true);
    },
  });

  const members = lobby?.members ?? [];
  const everyoneReady = members.length > 0 && members.every((m) => m.ready);
  const colorOf = chatColorsById(members);

  // If we've readied a character, we should be back in the ready state
  const iAmReady = members.some((m) => m.id === playerId && m.ready);
  const showReady = submitted || iAmReady;

  const [copied, setCopied] = useState(false);
  const copyTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const copyLink = () => {
    navigator.clipboard?.writeText(window.location.href).then(() => {
      setCopied(true);
      clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setCopied(false), 1500);
    });
  };
  useEffect(() => () => clearTimeout(copyTimer.current), []);

  return (
    <div className={layout.root}>
      <section className={clsx(layout.board, styles.board)}>
        {showReady ? (
          <ReadyCard everyoneReady={everyoneReady} onStart={onStart} />
        ) : (
          <LobbyBuilder model={model} />
        )}
      </section>

      <aside className={layout.sidebar}>
        {status !== 'open' && (
          <p className={layout.reconnecting}>
            {status === 'closed' ? 'Reconnecting...' : 'Connecting…'}
          </p>
        )}
        <section>
          <p className={clsx('ui-panel-title', layout.railTitle)}>Character</p>
          <CharacterReadout
            stage={model.stage}
            race={model.race}
            derivedStats={model.derivedStats}
            gold={model.gold}
            weaponTier={model.weaponTier}
            armorTier={model.armorTier}
            flares={model.flares}
            totalCost={model.totalCost}
          />
        </section>

        <div className={styles.adventurers}>
          <p className={clsx('ui-panel-title', layout.railTitle)}>Party</p>
          <ul className={styles.partyList}>
            {members.map((member) => (
              <li key={member.id} className={styles.partyRow}>
                <span
                  className={clsx(
                    styles.partyMark,
                    !member.ready && styles.partyMarkPending
                  )}
                >
                  {member.ready ? (member.id === playerId ? '*' : '√') : '·'}
                </span>
                <span
                  className={clsx(
                    styles.partyName,
                    !member.connected && styles.partyOffline
                  )}
                >
                  <span style={{ color: colorOf(member.id) }}>
                    {member.name}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className={styles.tableInfo}>
          <p className={clsx('ui-panel-title', layout.railTitle)}>Table</p>
          <p className={styles.code}>{code}</p>
          <button
            type="button"
            className={clsx('btn', 'btn-outlined', 'btn-small')}
            onClick={copyLink}
          >
            {copied ? 'copied!' : 'copy link'}
          </button>
        </div>
      </aside>

      <section className={layout.feedDock}>
        <Feed feed={feed} members={members} playerId={playerId} />
        <ChatInput onSend={onChat} />
      </section>
    </div>
  );
}

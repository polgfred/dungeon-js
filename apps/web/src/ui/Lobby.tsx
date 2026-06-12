import { useState } from 'react';

import clsx from 'clsx';

import { serializePlayer, type PlayerSave } from '@dod/core';
import type { FeedItem, LobbyState, PlayerId } from '@dod/net/client';

import { ChatInput } from './ChatInput.js';
import { chatColorsById } from './chatColors.js';
import { LobbyBuilder } from './LobbyBuilder.js';
import styles from './Lobby.module.css';
import { navigate } from './useRoute.js';

function ReadyCard({ onEdit }: { onEdit: () => void }) {
  return (
    <div className={clsx('ui-panel', styles.builderPanel)}>
      <h2 className={clsx('txt-h5', styles.readyTitle)}>Ready</h2>
      <p>Thy adventurer awaits. The quest begins once all are ready.</p>
      <button
        type="button"
        className={clsx('btn', 'btn-outlined')}
        onClick={onEdit}
      >
        Edit character
      </button>
    </div>
  );
}

export function Lobby({
  code,
  lobby,
  playerId,
  feed,
  onSetCharacter,
  onStart,
  onChat,
}: {
  code: string;
  lobby: LobbyState | null;
  playerId: PlayerId;
  feed: FeedItem[];
  onSetCharacter: (character: PlayerSave) => void;
  onStart: () => void;
  onChat: (text: string) => void;
}) {
  const [submitted, setSubmitted] = useState(false);
  const members = lobby?.members ?? [];
  const everyoneReady = members.length > 0 && members.every((m) => m.ready);
  const colorOf = chatColorsById(members);

  const copyLink = () => {
    void navigator.clipboard?.writeText(window.location.href);
  };

  return (
    <div className={styles.lobby}>
      <section className={styles.main}>
        {submitted ? (
          <ReadyCard onEdit={() => setSubmitted(false)} />
        ) : (
          <LobbyBuilder
            onComplete={(player) => {
              onSetCharacter(serializePlayer(player));
              setSubmitted(true);
            }}
            onLeave={() => navigate('/')}
          />
        )}
      </section>

      <aside className={styles.rail}>
        <div className={clsx('ui-panel', styles.railPanel)}>
          <p className={clsx('ui-panel-title', styles.railTitle)}>The Table</p>
          <p className={styles.code}>{code}</p>
          <button
            type="button"
            className={clsx('btn', 'btn-outlined', 'btn-small')}
            onClick={copyLink}
          >
            copy link
          </button>
        </div>

        <div className={clsx('ui-panel', styles.railPanel)}>
          <p className={clsx('ui-panel-title', styles.railTitle)}>Adventurers</p>
          <ul className={styles.party}>
            {members.map((member) => (
              <li key={member.id} className={styles.partyRow}>
                <span className={styles.partyMark}>
                  {member.ready ? '✓' : '·'}
                </span>
                <span className={styles.partyName}>
                  <span style={{ color: colorOf(member.id) }}>{member.name}</span>
                  {member.id === playerId ? ' (you)' : ''}
                </span>
                {!member.ready && (
                  <span className={styles.partyStatus}>building</span>
                )}
              </li>
            ))}
            {members.length === 0 && (
              <li className={styles.partyStatus}>connecting...</li>
            )}
          </ul>
        </div>

        <div className={clsx('ui-panel', styles.railPanel, styles.chatSlot)}>
          <p className={clsx('ui-panel-title', styles.railTitle)}>Chat</p>
          <div className={styles.chatLog}>
            {feed
              .filter((item) => item.kind === 'chat')
              .map((item, i) =>
                item.kind === 'chat' ? (
                  <div key={i} className={styles.chatLine}>
                    <span
                      className={styles.chatName}
                      style={{ color: colorOf(item.from) }}
                    >
                      &lt;{item.name}&gt;
                    </span>{' '}
                    <span className={styles.chatText}>{item.text}</span>
                  </div>
                ) : null
              )}
          </div>
          <ChatInput onSend={onChat} />
        </div>

        <button
          type="button"
          className={clsx('btn', 'btn-contained', styles.startBtn)}
          disabled={!everyoneReady}
          onClick={onStart}
        >
          {everyoneReady ? 'Start' : 'Waiting...'}
        </button>
      </aside>
    </div>
  );
}

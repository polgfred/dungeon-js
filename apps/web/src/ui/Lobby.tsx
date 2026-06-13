import { useEffect, useRef, useState } from 'react';

import clsx from 'clsx';

import { serializePlayer, type PlayerSave } from '@dod/core';
import type { FeedItem, LobbyState, PlayerId } from '@dod/net/client';

import { ChatInput } from './ChatInput.js';
import { chatColorsById } from './chatColors.js';
import { CharacterReadout } from './CharacterReadout.js';
import { LobbyBuilder } from './LobbyBuilder.js';
import styles from './Lobby.module.css';
import { useSetupGameModel } from './SetupGameModel.js';

function ReadyCard({
  everyoneReady,
  onStart,
}: {
  everyoneReady: boolean;
  onStart: () => void;
}) {
  return (
    <div className={styles.ready}>
      <p className={styles.readyText}>
        Thy adventurer stands ready. THE DUNGEON awaits the whole party...
      </p>
      <button
        type="button"
        className={clsx('btn', 'btn-contained', styles.startBtn)}
        disabled={!everyoneReady}
        onClick={onStart}
      >
        {everyoneReady ? 'Begin the descent' : 'Awaiting the party...'}
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

  const [copied, setCopied] = useState(false);
  const copyTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const copyLink = () => {
    void navigator.clipboard?.writeText(window.location.href).then(() => {
      setCopied(true);
      clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setCopied(false), 1500);
    });
  };
  useEffect(() => () => clearTimeout(copyTimer.current), []);

  return (
    <div className={styles.lobby}>
      <section className={styles.board}>
        {submitted ? (
          <ReadyCard everyoneReady={everyoneReady} onStart={onStart} />
        ) : (
          <LobbyBuilder model={model} />
        )}
      </section>

      <aside className={styles.statsPane}>
        <p className={clsx('ui-panel-title', styles.railTitle)}>Character</p>
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
      </aside>

      <section className={styles.feedDock}>
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
      </section>

      <aside className={styles.members}>
        <div className={styles.adventurers}>
          <p className={clsx('ui-panel-title', styles.railTitle)}>Party</p>
          <ul className={styles.party}>
            {members.map((member) => (
              <li key={member.id} className={styles.partyRow}>
                <span
                  className={clsx(
                    styles.partyMark,
                    !member.ready && styles.partyMarkPending
                  )}
                >
                  {member.ready ? '√' : '·'}
                </span>
                <span className={styles.partyName}>
                  <span style={{ color: colorOf(member.id) }}>{member.name}</span>
                  {member.id === playerId ? ' (you)' : ''}
                </span>
              </li>
            ))}
            {members.length === 0 && (
              <li className={styles.partyStatus}>connecting...</li>
            )}
          </ul>
        </div>

        <div className={styles.tableInfo}>
          <p className={clsx('ui-panel-title', styles.railTitle)}>Table</p>
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
    </div>
  );
}

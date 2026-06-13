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
    <div className={layout.root}>
      <section className={clsx(layout.board, styles.board)}>
        {submitted ? (
          <ReadyCard everyoneReady={everyoneReady} onStart={onStart} />
        ) : (
          <LobbyBuilder model={model} />
        )}
      </section>

      <aside className={layout.stats}>
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
      </aside>

      <section className={layout.feedDock}>
        <Feed feed={feed} members={members} playerId={playerId} />
        <ChatInput onSend={onChat} />
      </section>

      <aside className={clsx(layout.members, styles.members)}>
        {status !== 'open' && (
          <p className={layout.reconnecting}>
            {status === 'closed' ? 'Reconnecting...' : 'Connecting…'}
          </p>
        )}
        <div className={styles.adventurers}>
          <p className={clsx('ui-panel-title', layout.railTitle)}>Party</p>
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
    </div>
  );
}

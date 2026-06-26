import clsx from 'clsx';
import { useEffect, useState } from 'react';

import { serializePlayer, type PlayerSave } from '@dod/core';
import type {
  ConnectionStatus,
  FeedGroup,
  LobbyState,
  PlayerId,
} from '@dod/net/client';

import { ChatInput } from './ChatInput.js';
import { Feed } from './Feed.js';
import layout from './Layout.module.css';
import styles from './Lobby.module.css';
import { LobbyBuilder } from './LobbyBuilder.js';
import { LobbySidebar, type LobbyBuild } from './LobbySidebar.js';
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

  if (!everyoneReady) {
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
  feed: readonly FeedGroup[];
  onSetCharacter: (character: PlayerSave) => void;
  onStart: () => void;
  onChat: (text: string) => void;
}) {
  const [submitted, setSubmitted] = useState(false);
  const model = useSetupGameModel({
    onComplete: (player) => {
      onSetCharacter(serializePlayer(player));
      setSubmitted(true);
    },
  });

  const members = lobby?.members ?? [];
  const everyoneReady = members.length > 0 && members.every((m) => m.ready);

  const myCharacter = lobby?.character ?? null;
  const iAmReady = myCharacter !== null;
  const showReady = submitted || iAmReady;

  // Render the Character pane from the server's character when we have one.
  const build: LobbyBuild = myCharacter
    ? {
        stage: 'ready',
        race: myCharacter.race,
        derivedStats: {
          ST: myCharacter.str,
          DX: myCharacter.dex,
          IQ: myCharacter.iq,
          HP: myCharacter.mhp,
        },
        gold: myCharacter.gold,
        totalCost: 0,
        weaponTier: myCharacter.weaponTier,
        armorTier: myCharacter.armorTier,
        flares: myCharacter.flares,
      }
    : {
        stage: model.stage,
        race: model.race,
        derivedStats: model.derivedStats,
        gold: model.gold,
        totalCost: model.totalCost,
        weaponTier: model.weaponTier,
        armorTier: model.armorTier,
        flares: model.flares,
      };

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
        <LobbySidebar
          status={status}
          build={build}
          members={members}
          playerId={playerId}
          code={code}
        />
      </aside>

      <section className={layout.feedDock}>
        <Feed feed={feed} members={members} playerId={playerId} />
        <ChatInput onSend={onChat} />
      </section>
    </div>
  );
}

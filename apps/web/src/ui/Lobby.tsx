import { useEffect, useRef, useState } from 'react';

import clsx from 'clsx';

import {
  ARMOR_NAMES,
  WEAPON_NAMES,
  raceName,
  serializePlayer,
  type PlayerSave,
  type Race,
} from '@dod/core';
import type {
  ConnectionStatus,
  FeedItem,
  LobbyState,
  PlayerId,
} from '@dod/net/client';

import { ChatInput } from './ChatInput.js';
import { chatColorsById } from './chatColors.js';
import { Feed } from './Feed.js';
import { LobbyBuilder } from './LobbyBuilder.js';
import layout from './Layout.module.css';
import styles from './Lobby.module.css';
import {
  stageReached,
  useSetupGameModel,
  type SetupStage,
  type Stats,
} from './SetupGameModel.js';
import { StatList, StatRow } from './StatList.js';

/** The in-progress character. */
export function CharacterReadout({
  stage,
  race,
  derivedStats,
  gold,
  weaponTier,
  armorTier,
  flares,
  totalCost,
}: {
  stage: SetupStage;
  race: Race | null;
  derivedStats: Stats | null;
  gold: number | null;
  weaponTier: number;
  armorTier: number;
  flares: number;
  totalCost: number;
}) {
  const dash = '-';
  const stat = (value: number | undefined) =>
    derivedStats && value !== undefined ? String(value) : dash;
  const at = (target: SetupStage, value: string) =>
    stageReached(stage, target) ? value : dash;
  const remaining = gold !== null ? gold - totalCost : null;

  return (
    <StatList>
      <StatRow label="Race" value={race !== null ? raceName(race) : dash} />
      <StatRow label="Health" value={stat(derivedStats?.HP)} />
      <StatRow label="Strength" value={stat(derivedStats?.ST)} />
      <StatRow label="Dexterity" value={stat(derivedStats?.DX)} />
      <StatRow label="Intelligence" value={stat(derivedStats?.IQ)} />
      <StatRow
        label="Gold"
        value={remaining !== null ? String(remaining) : dash}
        tone={remaining !== null && remaining < 0 ? 'alert' : undefined}
      />
      <StatRow label="Weapon" value={at('armor', WEAPON_NAMES[weaponTier])} />
      <StatRow label="Armour" value={at('flares', ARMOR_NAMES[armorTier])} />
      <StatRow label="Flares" value={at('flares', String(flares))} />
    </StatList>
  );
}

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
  feed: readonly FeedItem[];
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
  const colorOf = chatColorsById(members);

  const myCharacter = lobby?.character ?? null;
  const iAmReady = myCharacter !== null;
  const showReady = submitted || iAmReady;

  // Render the Character pane from the server's character when we have one.
  const readout = myCharacter
    ? {
        stage: 'ready' as const,
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
            stage={readout.stage}
            race={readout.race}
            derivedStats={readout.derivedStats}
            gold={readout.gold}
            weaponTier={readout.weaponTier}
            armorTier={readout.armorTier}
            flares={readout.flares}
            totalCost={readout.totalCost}
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

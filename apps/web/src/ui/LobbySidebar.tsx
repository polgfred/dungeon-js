import clsx from 'clsx';
import { useEffect, useRef, useState } from 'react';

import { raceName, type Race } from '@dod/core';
import type { ConnectionStatus, LobbyMember, PlayerId } from '@dod/net/client';

import { chatColorsById } from './chatColors.js';
import layout from './Layout.module.css';
import styles from './LobbySidebar.module.css';
import sidebar from './Sidebar.module.css';
import { ArmorRow, StatRow, WeaponRow } from './Sidebar.js';
import { stageReached, type SetupStage } from './SetupGameModel.js';

export type LobbyBuild = {
  stage: SetupStage;
  race: Race | null;
  derivedStats: { ST: number; DX: number; IQ: number; HP: number } | null;
  gold: number | null;
  totalCost: number;
  weaponTier: number;
  armorTier: number;
  flares: number;
};

function CharacterReadout({ build }: { build: LobbyBuild }) {
  const dash = '-';
  const { race, derivedStats } = build;
  const stat = (value: number | undefined) =>
    derivedStats && value !== undefined ? String(value) : dash;
  const hp = stat(derivedStats?.HP);

  return (
    <section>
      <div className={sidebar.group}>
        <StatRow label="Race" value={race !== null ? raceName(race) : dash} />
        <StatRow label="Health" value={`${hp}/${hp}`} />
        <StatRow label="Strength" value={stat(derivedStats?.ST)} />
        <StatRow label="Dexterity" value={stat(derivedStats?.DX)} />
        <StatRow label="Intellect" value={stat(derivedStats?.IQ)} />
      </div>
    </section>
  );
}

function StatusReadout({ build }: { build: LobbyBuild }) {
  const dash = '-';
  const { stage, gold, totalCost } = build;
  const at = (target: SetupStage, value: string) =>
    stageReached(stage, target) ? value : dash;
  const remaining = gold !== null ? gold - totalCost : null;

  return (
    <section>
      <div className={sidebar.group}>
        <StatRow
          label="Gold"
          value={remaining !== null ? String(remaining) : dash}
          alert={remaining !== null && remaining < 0}
        />
        <StatRow label="Flares" value={at('flares', String(build.flares))} />
        <StatRow label="Spells" value={dash} />
      </div>
    </section>
  );
}

function GearReadout({ build }: { build: LobbyBuild }) {
  return (
    <section>
      <div className={sidebar.group}>
        <WeaponRow tier={build.weaponTier} broken={false} />
        <ArmorRow tier={build.armorTier} damage={0} />
      </div>
    </section>
  );
}

function Player({
  member,
  color,
  isSelf,
}: {
  member: LobbyMember;
  color: string;
  isSelf: boolean;
}) {
  return (
    <div className={sidebar.row}>
      <span
        className={clsx(
          sidebar.label,
          sidebar.partyName,
          isSelf && sidebar.partySelf,
          !member.connected && sidebar.partyOffline
        )}
        style={{ color }}
      >
        {member.name}
      </span>
      <span
        className={clsx(
          sidebar.value,
          styles.partyMark,
          !member.ready && styles.partyMarkPending
        )}
      >
        {member.ready ? '√' : '…'}
      </span>
    </div>
  );
}

function PartyReadout({
  members,
  playerId,
}: {
  members: readonly LobbyMember[];
  playerId: PlayerId;
}) {
  const colorOf = chatColorsById(members);
  return (
    <section>
      <p className={clsx('ui-panel-title', layout.railTitle)}>Party</p>
      <div className={sidebar.group}>
        {members.map((member) => (
          <Player
            key={member.id}
            member={member}
            color={colorOf(member.id)}
            isSelf={playerId === member.id}
          />
        ))}
      </div>
    </section>
  );
}

function TableInfo({ code }: { code: string }) {
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
  );
}

export function LobbySidebar({
  status,
  build,
  members,
  playerId,
  code,
}: {
  status: ConnectionStatus;
  build: LobbyBuild;
  members: readonly LobbyMember[];
  playerId: PlayerId;
  code: string;
}) {
  return (
    <>
      {status !== 'open' && (
        <p className={layout.reconnecting}>
          {status === 'closed' ? 'Reconnecting…' : 'Connecting…'}
        </p>
      )}
      <CharacterReadout build={build} />
      <StatusReadout build={build} />
      <GearReadout build={build} />
      <PartyReadout members={members} playerId={playerId} />
      <TableInfo code={code} />
    </>
  );
}

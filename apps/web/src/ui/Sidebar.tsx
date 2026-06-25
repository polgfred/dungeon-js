import { clsx } from 'clsx';
import type { ReactNode } from 'react';

import {
  armorName,
  raceName,
  spellName,
  treasureName,
  weaponName,
  type PlayerId,
} from '@dod/core';
import { ConnectionStatus, PartyMember, PlayerView } from '@dod/net/client';

import layout from './Layout.module.css';
import styles from './Sidebar.module.css';
import { chatColorsById } from './chatColors.js';
import { GlyphIcon } from './Glyphs.js';

// --- Status rows -----------------------------------------------------------

export function StatRow({
  label,
  value,
  alert,
}: {
  label: string;
  value: ReactNode;
  alert?: boolean;
}) {
  return (
    <div className={styles.row}>
      <span className={styles.label}>{label}</span>
      <span className={clsx(styles.value, alert && styles.alert)}>{value}</span>
    </div>
  );
}

function SpellsRow({ spells }: { spells: readonly number[] }) {
  const total = spells.reduce((sum, count) => sum + count, 0);
  return (
    <div className={clsx(styles.row, styles.interactive)}>
      <span className={styles.label}>
        Spells<sup>?</sup>
      </span>
      <span className={styles.value}>{total}</span>
      <span className={styles.tip} role="tooltip">
        <ul>
          {spells.map((count, i) => (
            <li key={i}>
              {spellName(i + 1)}: {count}
            </li>
          ))}
        </ul>
      </span>
    </div>
  );
}

// --- Gear rows -------------------------------------------------------------

export function WeaponRow({ tier, broken }: { tier: number; broken: boolean }) {
  return (
    <div className={clsx(styles.row, styles.interactive)}>
      <span className={styles.label}>
        Weapon<sup>?</sup>
      </span>
      <span className={clsx(styles.value, broken && styles.alert)}>
        <span className={styles.glyphGroup}>
          {Array.from({ length: tier }).map((_, i) => (
            <GlyphIcon key={i} id="SWORD" className={styles.glyph} />
          ))}
        </span>
      </span>
      <span className={styles.tip} role="tooltip">
        {weaponName(tier)}
        {broken ? ' (broken)' : ''}
      </span>
    </div>
  );
}

export function ArmorRow({ tier, damage }: { tier: number; damage: number }) {
  const intact = tier - damage;
  return (
    <div className={clsx(styles.row, styles.interactive)}>
      <span className={styles.label}>
        Armour<sup>?</sup>
      </span>
      <span className={styles.value}>
        <span className={styles.glyphGroup}>
          {Array.from({ length: tier }).map((_, i) => (
            <span key={i} className={i >= intact ? styles.dimmed : undefined}>
              <GlyphIcon id="SHIELD" className={styles.glyph} />
            </span>
          ))}
        </span>
      </span>
      <span className={styles.tip} role="tooltip">
        {armorName(tier)}
        {damage > 0 ? ' (damaged)' : ''}
      </span>
    </div>
  );
}

// --- Treasures -------------------------------------------------------------

function TreasureBar({ found }: { found: readonly number[] }) {
  const numFound = found.length;
  return (
    <div className={clsx(styles.treasures, numFound > 0 && styles.interactive)}>
      <div className={styles.glyphGroup}>
        {Array.from({ length: found.length }).map((_, i) => (
          <span key={`found-${i}`} className={styles.loot}>
            <GlyphIcon id="GEM" className={styles.glyph} />
          </span>
        ))}
        {Array.from({ length: 10 - found.length }).map((_, i) => (
          <span key={`empty-${i}`} className={styles.dimmed}>
            <GlyphIcon id="GEM" className={styles.glyph} />
          </span>
        ))}
      </div>
      {numFound > 0 && (
        <span className={styles.tip} role="tooltip">
          <ul>
            {found.map((treasureId) => (
              <li key={treasureId}>{treasureName(treasureId)}</li>
            ))}
          </ul>
        </span>
      )}
    </div>
  );
}

// --- Readouts --------------------------------------------------------------

function CharacterReadout({ view }: { view: PlayerView }) {
  const s = view.self;
  return (
    <section>
      <div className={styles.group}>
        <StatRow label="Race" value={raceName(s.race)} />
        <StatRow label="Health" value={`${s.hp}/${s.mhp}`} />
        <StatRow label="Strength" value={s.str} />
        <StatRow label="Dexterity" value={s.dex} />
        <StatRow label="Intellect" value={s.iq} />
      </div>
    </section>
  );
}

function StatusReadout({ view }: { view: PlayerView }) {
  const s = view.self;
  return (
    <section>
      <div className={styles.group}>
        <StatRow label="Location" value={`${s.z + 1},${s.y + 1},${s.x + 1}`} />
        <StatRow label="Gold" value={s.gold} />
        <StatRow label="Flares" value={s.flares} />
        <SpellsRow spells={s.spells} />
      </div>
    </section>
  );
}

function GearReadout({ view }: { view: PlayerView }) {
  const s = view.self;
  return (
    <section>
      <div className={styles.group}>
        <WeaponRow tier={s.weaponTier} broken={s.weaponBroken} />
        <ArmorRow tier={s.armorTier} damage={s.armorDamage} />
      </div>
    </section>
  );
}

function Player({
  member,
  color,
  isSelf,
}: {
  member: PartyMember;
  color: string;
  isSelf: boolean;
}) {
  const hearts = member.hp >= 20 ? 3 : member.hp >= 10 ? 2 : 1;
  return (
    <div className={clsx(styles.row, styles.interactive)}>
      <span
        className={clsx(
          styles.label,
          styles.partyName,
          isSelf && styles.partySelf,
          !member.connected && styles
        )}
        style={{ color }}
      >
        {member.name}
      </span>
      <span className={clsx(styles.value, member.hp < 10 && styles.alert)}>
        <span className={styles.glyphGroup}>
          {Array.from({ length: hearts }).map((_, i) => (
            <GlyphIcon key={i} id="HEART" className={styles.glyph} />
          ))}
        </span>
      </span>
      <span className={styles.tip} role="tooltip">
        {member.name}: {member.hp}
      </span>
    </div>
  );
}

function PartyReadout({
  party,
  playerId,
}: {
  party: readonly PartyMember[];
  playerId: PlayerId;
}) {
  const colorOf = chatColorsById(party);
  return (
    <section>
      <p className={clsx('ui-panel-title', layout.railTitle)}>Party</p>
      <div className={styles.group}>
        {party.map((member) => (
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

export function Sidebar({
  playerId,
  status,
  view,
}: {
  playerId: string;
  status: ConnectionStatus;
  view: PlayerView;
}) {
  return (
    <>
      {status !== 'open' && (
        <p className={layout.reconnecting}>
          {status === 'closed' ? 'Reconnecting…' : 'Connecting…'}
        </p>
      )}
      <TreasureBar found={view.treasuresFound} />
      <CharacterReadout view={view} />
      <StatusReadout view={view} />
      <GearReadout view={view} />
      <PartyReadout party={view.party} playerId={playerId} />
    </>
  );
}

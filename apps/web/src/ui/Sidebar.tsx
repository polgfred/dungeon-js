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

import { GlyphIcon } from './Glyphs.js';
import layout from './Layout.module.css';
import styles from './Sidebar.module.css';
import { chatColorsById } from './chatColors.js';

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
        <p className={styles.tipHeading}>Spells acquired:</p>
        <ul className={styles.tipList}>
          {spells.map(
            (count, i) =>
              count > 0 && (
                <li key={`spell-${i}`}>
                  {spellName(i + 1)}: {count}
                </li>
              )
          )}
        </ul>
      </span>
    </div>
  );
}

// --- Gear rows -------------------------------------------------------------

function WeaponRow({ tier, broken }: { tier: number; broken: boolean }) {
  return (
    <div className={clsx(styles.row, styles.interactive)}>
      <span className={styles.label}>
        Weapon<sup>?</sup>
      </span>
      <span className={styles.glyphValue}>
        {broken ? (
          <GlyphIcon id="SWORD" className={clsx(styles.glyph, styles.alert)} />
        ) : (
          Array.from({ length: tier }).map((_, i) => (
            <GlyphIcon key={`w-${i}`} id="SWORD" className={styles.glyph} />
          ))
        )}
      </span>
      <span className={styles.tip} role="tooltip">
        {broken ? (
          <p className={styles.tipHeading}>Weapon is broken</p>
        ) : (
          <p className={styles.tipHeading}>{weaponName(tier)}</p>
        )}
      </span>
    </div>
  );
}

function ArmorRow({ tier, damage }: { tier: number; damage: number }) {
  const intact = tier - damage;
  return (
    <div className={clsx(styles.row, styles.interactive)}>
      <span className={styles.label}>
        Armour<sup>?</sup>
      </span>
      <span className={styles.glyphValue}>
        {tier === 0 ? (
          <GlyphIcon id="SHIELD" className={clsx(styles.glyph, styles.alert)} />
        ) : (
          Array.from({ length: tier }).map((_, i) => (
            <GlyphIcon
              key={`a-${i}`}
              id="SHIELD"
              className={clsx(styles.glyph, i >= intact && styles.dimmed)}
            />
          ))
        )}
      </span>
      <span className={styles.tip} role="tooltip">
        {tier === 0 ? (
          <p className={styles.tipHeading}>Armour is destroyed</p>
        ) : damage > 0 ? (
          <p className={styles.tipHeading}>{armorName(tier)} (damaged)</p>
        ) : (
          <p className={styles.tipHeading}>{armorName(tier)}</p>
        )}
      </span>
    </div>
  );
}

// --- Treasures -------------------------------------------------------------

function TreasureBar({ found }: { found: readonly number[] }) {
  const numFound = found.length;
  return (
    <div className={clsx(numFound > 0 && styles.interactive)}>
      <div className={styles.treasures}>
        {Array.from({ length: 10 }).map((_, i) => (
          <GlyphIcon
            key={`g-${i}`}
            id="GEM"
            className={clsx(
              styles.glyph,
              i <= numFound - 1 ? styles.loot : styles.dimmed
            )}
          />
        ))}
      </div>
      {numFound > 0 && (
        <span className={styles.tip} role="tooltip">
          <p className={styles.tipHeading}>Treasures found:</p>
          <ul className={styles.tipList}>
            {found.map((treasureId) => (
              <li key={`t-${treasureId}`}>{treasureName(treasureId)}</li>
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
        <StatRow label="Health" value={`${s.hp}/${s.mhp}`} alert={s.hp < 10} />
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
      <span className={styles.glyphValue}>
        {Array.from({ length: hearts }).map((_, i) => (
          <GlyphIcon
            key={`h-${i}`}
            id="HEART"
            className={clsx(styles.glyph, member.hp < 10 && styles.alert)}
          />
        ))}
      </span>
      <span className={styles.tip} role="tooltip">
        <p className={styles.tipHeading}>Player: {member.name}</p>
        <p className={styles.tipHeading}>Health: {member.hp}</p>
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
            key={`p-${member.id}`}
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

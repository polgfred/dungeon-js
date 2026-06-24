import { clsx } from 'clsx';

import { raceName, spellName, treasureName, type PlayerId } from '@dod/core';
import { ConnectionStatus, PartyMember, PlayerView } from '@dod/net/client';

import type { GlyphId } from './glyphPaths.js';
import layout from './Layout.module.css';
import styles from './Sidebar.module.css';
import { chatColorsById } from './chatColors.js';
import { Tooltip } from './Tooltip.js';

function GlyphIcon({ id }: { id: GlyphId }) {
  return (
    <svg className={styles.glyph} viewBox="0 0 8 8" aria-hidden="true">
      <use href={`#glyph-${id}`} />
    </svg>
  );
}

// --- Status rows -----------------------------------------------------------

function RaceRow({ race }: { race: number }) {
  return (
    <div className={styles.row}>
      <span className={styles.label}>Race</span>
      <span className={styles.value}>{raceName(race)}</span>
    </div>
  );
}

function HealthRow({ hp, mhp }: { hp: number; mhp: number }) {
  return (
    <div className={styles.row}>
      <span className={styles.label}>Heal</span>
      <span className={clsx(styles.value, hp < 10 && styles.alert)}>
        {hp}/{mhp}
      </span>
    </div>
  );
}

function StrRow({ str }: { str: number }) {
  return (
    <div className={styles.row}>
      <span className={styles.label}>Str</span>
      <span className={styles.value}>{str}</span>
    </div>
  );
}

function DexRow({ dex }: { dex: number }) {
  return (
    <div className={styles.row}>
      <span className={styles.label}>Dex</span>
      <span className={styles.value}>{dex}</span>
    </div>
  );
}

function IntRow({ iq }: { iq: number }) {
  return (
    <div className={styles.row}>
      <span className={styles.label}>Int</span>
      <span className={styles.value}>{iq}</span>
    </div>
  );
}

function GoldRow({ gold }: { gold: number }) {
  return (
    <div className={styles.row}>
      <span className={styles.label}>Gold</span>
      <span className={styles.value}>{gold}</span>
    </div>
  );
}

function FlaresRow({ flares }: { flares: number }) {
  return (
    <div className={styles.row}>
      <span className={styles.label}>Flare</span>
      <span className={styles.value}>{flares}</span>
    </div>
  );
}

function SpellsRow({ spells }: { spells: readonly number[] }) {
  const total = spells.reduce((sum, count) => sum + count, 0);
  return (
    <div className={clsx(styles.row, styles.interactive)}>
      <span className={styles.label}>Spell</span>
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

function WeaponRow({
  tier,
  name,
  broken,
}: {
  tier: number;
  name: string;
  broken: boolean;
}) {
  return (
    <div className={clsx(styles.row, styles.interactive)}>
      <span className={styles.label}>Weapon</span>
      <span className={clsx(styles.value, broken && styles.alert)}>
        <span className={styles.glyphGroup}>
          {Array.from({ length: tier }).map((_, i) => (
            <GlyphIcon key={i} id="SWORD" />
          ))}
        </span>
      </span>
      <span className={styles.tip} role="tooltip">
        {name}
        {broken ? ' (broken)' : ''}
      </span>
    </div>
  );
}

function ArmourRow({
  tier,
  name,
  damaged,
}: {
  tier: number;
  name: string;
  damaged: boolean;
}) {
  return (
    <div className={clsx(styles.row, styles.interactive)}>
      <span className={styles.label}>Armour</span>
      <span className={clsx(styles.value, damaged && styles.alert)}>
        <span className={styles.glyphGroup}>
          {Array.from({ length: tier }).map((_, i) => (
            <GlyphIcon key={i} id="SHIELD" />
          ))}
        </span>
      </span>
      <span className={styles.tip} role="tooltip">
        {name}
        {damaged ? ' (damaged)' : ''}
      </span>
    </div>
  );
}

// --- Treasures -------------------------------------------------------------

function TreasRow({ found }: { found: readonly number[] }) {
  const numFound = found.length;
  return (
    <div className={clsx(numFound > 0 && styles.interactive)}>
      <div className={styles.glyphGroup}>
        {Array.from({ length: found.length }).map((_, i) => (
          <span key={`found-${i}`} className={styles.loot}>
            <GlyphIcon id="GEM" />
          </span>
        ))}
        {Array.from({ length: 10 - found.length }).map((_, i) => (
          <span key={`empty-${i}`} className={styles.dimmed}>
            <GlyphIcon id="GEM" />
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

// --- Location rows ---------------------------------------------------------

function LevelRow({ z }: { z: number }) {
  return (
    <div className={styles.row}>
      <span className={styles.label}>Level</span>
      <span className={styles.value}>{z + 1}</span>
    </div>
  );
}

function RoomRow({ x, y }: { x: number; y: number }) {
  return (
    <div className={styles.row}>
      <span className={styles.label}>Room</span>
      <span className={styles.value}>
        {y + 1},{x + 1}
      </span>
    </div>
  );
}

// --- Readouts --------------------------------------------------------------

function StatusReadout({ view }: { view: PlayerView }) {
  const s = view.self;
  return (
    <div className={styles.group}>
      <RaceRow race={s.race} />
      <HealthRow hp={s.hp} mhp={s.mhp} />
      <StrRow str={s.str} />
      <DexRow dex={s.dex} />
      <IntRow iq={s.iq} />
      <GoldRow gold={s.gold} />
      <FlaresRow flares={s.flares} />
      <SpellsRow spells={s.spells} />
    </div>
  );
}

function GearReadout({ view }: { view: PlayerView }) {
  const s = view.self;
  return (
    <div className={styles.group}>
      <WeaponRow
        tier={s.weaponTier}
        name={s.weaponName}
        broken={s.weaponBroken}
      />
      <ArmourRow
        tier={s.armorTier}
        name={s.armorName}
        damaged={s.armorDamaged}
      />
    </div>
  );
}

function LocationReadout({ view }: { view: PlayerView }) {
  const s = view.self;
  return (
    <div className={styles.group}>
      <LevelRow z={s.z} />
      <RoomRow x={s.x} y={s.y} />
    </div>
  );
}

const HEALTH_CAP = 20;

function HealthBar({ hp }: { hp: number }) {
  const filled = Math.max(0, Math.min(hp, HEALTH_CAP));
  return (
    <span className={styles.healthLane} aria-hidden>
      <span
        className={clsx(styles.healthFill, hp < 10 && styles.healthLow)}
        style={{ width: `calc(${filled} * var(--health-px))` }}
      />
    </span>
  );
}
/*
<li key={member.id} className={styles.partyRow}>
  <span className={styles.partyMark}>
    {member.id === playerId ? '*' : '√'}
  </span>
  <Tooltip
    content={`${member.name}: ${member.hp}`}
    className={styles.partyName}
  >
    <span
      className={styles.partyNameText}
      style={{ color: colorOf(member.id) }}
    >
      {member.name}
    </span>
  </Tooltip>
  <HealthBar hp={member.hp} />
</li>
*/

function Player({
  member,
  color,
  isSelf,
}: {
  member: PartyMember;
  color: string;
  isSelf: boolean;
}) {
  return (
    <div className={clsx(styles.row, styles.interactive)}>
      <span
        className={clsx(styles.partyName, isSelf && styles.partySelf)}
        style={{ color }}
      >
        {member.name}
      </span>
      <span className={clsx(styles.value, member.hp < 10 && styles.alert)}>
        <span className={styles.glyphGroup}>
          {Array.from({ length: Math.ceil(member.hp / 10) }).map((_, i) => (
            <GlyphIcon key={i} id="HEART" />
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
    <div className={styles.group}>
      {party.map((member) => (
        <Player
          member={member}
          color={colorOf(member.id)}
          isSelf={playerId === member.id}
        />
      ))}
    </div>
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
      <section>
        <p className={clsx('ui-panel-title', layout.railTitle)}>Status</p>
        <StatusReadout view={view} />
      </section>
      <section>
        <p className={clsx('ui-panel-title', layout.railTitle)}>Gear</p>
        <GearReadout view={view} />
      </section>
      <section>
        <p className={clsx('ui-panel-title', layout.railTitle)}>Treasures</p>
        <TreasRow found={view.treasuresFound} />
      </section>
      <section>
        <p className={clsx('ui-panel-title', layout.railTitle)}>Location</p>
        <LocationReadout view={view} />
      </section>
      <section>
        <p className={clsx('ui-panel-title', layout.railTitle)}>Party</p>
        <PartyReadout party={view.party} playerId={playerId} />
      </section>
    </>
  );
}

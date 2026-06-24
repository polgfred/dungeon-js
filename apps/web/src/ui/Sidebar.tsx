import { clsx } from 'clsx';

import { raceName, spellName, treasureName, type PlayerId } from '@dod/core';
import { ConnectionStatus, PartyMember, PlayerView } from '@dod/net/client';

import type { GlyphId } from './glyphPaths.js';
import layout from './Layout.module.css';
import styles from './Sidebar.module.css';
import { StatList, StatRow } from './StatList.js';
import { chatColorsById } from './chatColors.js';
import { Tooltip } from './Tooltip.js';

function GlyphIcon({ id }: { id: GlyphId }) {
  return (
    <svg className={styles.glyph} viewBox="0 0 8 8" aria-hidden="true">
      <use href={`#glyph-${id}`} />
    </svg>
  );
}

function StatsReadout({ view }: { view: PlayerView }) {
  const s = view.self;
  return (
    <StatList>
      <StatRow label="Race" value={String(raceName(s.race))} />
      <StatRow
        label="Health"
        value={`${s.hp}/${s.mhp}`}
        tone={s.hp < 10 ? 'alert' : undefined}
      />
      <StatRow label="Str" value={String(s.str)} />
      <StatRow label="Dex" value={String(s.dex)} />
      <StatRow label="Int" value={String(s.iq)} />
      <StatRow label="Gold" value={String(s.gold)} />
      <StatRow label="Flares" value={String(s.flares)} />
      <StatRow
        label="Spells"
        value={String(s.spells.reduce((total, count) => total + count, 0))}
        tip={
          <ul>
            {s.spells.map((count, i) => (
              <li key={i}>
                {spellName(i + 1)}: {count}
              </li>
            ))}
          </ul>
        }
      />
      <StatRow
        label="Treas"
        value={`${view.treasuresFound.length}/10`}
        tone={view.treasuresFound.length >= 10 ? 'loot' : undefined}
        tip={
          view.treasuresFound.length ? (
            <ul>
              {view.treasuresFound.map((treasureId) => (
                <li key={treasureId}>{treasureName(treasureId)}</li>
              ))}
            </ul>
          ) : null
        }
      />
    </StatList>
  );
}

function GearReadout({ view }: { view: PlayerView }) {
  const s = view.self;
  return (
    <StatList>
      <StatRow
        label="Weapon"
        value={
          <span className={styles.glyphGroup}>
          {Array.from({ length: s.weaponTier }).map(() => <GlyphIcon id="SWORD" />)}
          </span>
        }
        tone={s.weaponBroken ? 'alert' : undefined}
        tip={`${s.weaponName}${s.weaponBroken ? ' (broken)' : ''}`}
      />
      <StatRow
        label="Armour"
        value={
          <span className={styles.glyphGroup}>
          {Array.from({ length: s.armorTier }).map(() => <GlyphIcon id="SHIELD" />)}
          </span>
        }
        tone={s.armorDamaged ? 'alert' : undefined}
        tip={`${s.armorName}${s.armorDamaged ? ' (damaged)' : ''}`}
      />
    </StatList>
  )
}

function LocationReadout({ view }: { view: PlayerView }) {
  const s = view.self;
  return (
    <StatList>
      <StatRow label="Level" value={String(s.z + 1)} />
      <StatRow label="Room" value={`${s.y + 1},${s.x + 1}`} />
    </StatList>
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

function Party({
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
      <ul className={styles.partyList}>
        {party.map((member) => (
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
        ))}
      </ul>
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
      <section>
        <p className={clsx('ui-panel-title', layout.railTitle)}>Status</p>
        <StatsReadout view={view} />
      </section>
      <section>
        <p className={clsx('ui-panel-title', layout.railTitle)}>Gear</p>
        <GearReadout view={view} />
      </section>
      <section>
        <p className={clsx('ui-panel-title', layout.railTitle)}>Location</p>
        <LocationReadout view={view} />
      </section>
      <Party party={view.party} playerId={playerId} />
    </>
  );
}

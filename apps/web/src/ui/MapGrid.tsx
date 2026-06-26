import clsx from 'clsx';
import type { CSSProperties } from 'react';

import { MapTile, type Tile } from '@dod/core';
import type { PartyMember, PlayerId } from '@dod/net/client';

import { GlyphIcon, tileGlyph } from './Glyphs.js';
import styles from './MapGrid.module.css';

type CellOccupancy = { colors: string[]; isSelf: boolean };

/** The occupant ring fed to CSS: a solid color for one player, a conic split
 *  for several. CSS masks it to just the border, so the glyph stays readable. */
function ringStyle(colors: string[]): CSSProperties {
  const n = colors.length;
  const ring =
    n === 1
      ? colors[0]
      : `conic-gradient(${colors
          .map((c, i) => `${c} ${(i / n) * 100}% ${((i + 1) / n) * 100}%`)
          .join(', ')})`;
  return { '--ring': ring } as CSSProperties;
}

export function MapGrid({
  map,
  floor,
  party,
  playerId,
  colorOf,
}: {
  map: readonly Tile[][];
  floor: number;
  party: readonly PartyMember[];
  playerId: PlayerId;
  colorOf: (id: PlayerId) => string;
}) {
  // Group occupants by cell so a shared room mixes everyone's colors.
  const byCell = new Map<string, CellOccupancy>();
  for (const member of party) {
    if (member.z !== floor) continue;
    const key = `${member.x},${member.y}`;
    const entry = byCell.get(key) ?? { colors: [], isSelf: false };
    entry.colors.push(colorOf(member.id));
    if (member.id === playerId) entry.isSelf = true;
    byCell.set(key, entry);
  }

  return (
    <div className={styles.grid}>
      {map.map((row, y) => (
        <div key={y} className={styles.gridRow}>
          {row.map((tile, x) => {
            const glyph = tileGlyph(tile);
            const here = byCell.get(`${x},${y}`);
            return (
              <div
                key={x}
                data-tip={glyph.tooltip}
                style={here ? ringStyle(here.colors) : undefined}
                className={clsx(
                  styles.cell,
                  here && styles.cellOccupied,
                  here?.isSelf && styles.cellSelf,
                  tile === MapTile.UNSEEN && styles.cellDim,
                  glyph.danger && styles.cellDanger,
                  glyph.treasure && styles.cellTreasure
                )}
              >
                {glyph.id && (
                  <GlyphIcon id={glyph.id} className={styles.glyph} />
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

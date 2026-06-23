import type { CSSProperties } from 'react';

import clsx from 'clsx';

import { Feature, MapTile, type Tile } from '@dod/core';
import type { PartyMember, PlayerId } from '@dod/net/client';

import { GLYPH_PATHS, type GlyphId } from './glyphPaths.js';
import styles from './MapGrid.module.css';

type TileGlyph = {
  id?: GlyphId;
  tooltip?: string;
  danger?: boolean;
  treasure?: boolean;
};

const FEATURE_GLYPH: Partial<Record<Feature, TileGlyph>> = {
  [Feature.EMPTY]: {},
  [Feature.MIRROR]: { id: 'MIRROR', tooltip: 'Mirror' },
  [Feature.SCROLL]: { id: 'SCROLL', tooltip: 'Scroll' },
  [Feature.CHEST]: { id: 'CHEST', tooltip: 'Chest' },
  [Feature.FLARES]: { id: 'FLAME', tooltip: 'Flares' },
  [Feature.POTION]: { id: 'FLASK', tooltip: 'Potion' },
  [Feature.VENDOR]: { id: 'VENDOR', tooltip: 'Vendor' },
  [Feature.THIEF]: { id: 'THIEF', tooltip: 'Thief', danger: true },
  [Feature.WARP]: { id: 'WARP', tooltip: 'Warp', danger: true },
  [Feature.STAIRS_UP]: { id: 'STAIRS_UP', tooltip: 'Stairs up' },
  [Feature.STAIRS_DOWN]: { id: 'STAIRS_DOWN', tooltip: 'Stairs down' },
  [Feature.EXIT]: { id: 'EXIT', tooltip: 'Exit', treasure: true },
};

/** A last-observed tile → its map glyph. Mirrors the server's resolve order. */
export function tileGlyph(tile: Tile): TileGlyph {
  if (tile === MapTile.UNSEEN) return { id: 'DOT' };
  if (tile === MapTile.MONSTER)
    return { id: 'MONSTER', tooltip: 'Monster', danger: true };
  if (tile === MapTile.TREASURE)
    return { id: 'GEM', tooltip: 'Treasure', treasure: true };
  return FEATURE_GLYPH[tile as Feature] ?? { tooltip: 'Empty' };
}

/** Inline <symbol> defs for every glyph; render once per screen. */
export function GlyphDefs() {
  return (
    <svg
      width={0}
      height={0}
      aria-hidden="true"
      style={{ position: 'absolute' }}
    >
      <defs>
        {Object.entries(GLYPH_PATHS).map(([id, d]) => (
          <symbol key={id} id={`glyph-${id}`} viewBox="0 0 8 8">
            <path d={d} fill="currentColor" shapeRendering="crispEdges" />
          </symbol>
        ))}
      </defs>
    </svg>
  );
}

function GlyphIcon({ id }: { id: GlyphId }) {
  return (
    <svg className={styles.glyph} viewBox="0 0 8 8" aria-hidden="true">
      <use href={`#glyph-${id}`} />
    </svg>
  );
}

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
                {glyph.id && <GlyphIcon id={glyph.id} />}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

import clsx from 'clsx';

import { Feature, MapTile, type Tile } from '@dod/core';

import { GLYPH_PATHS, type GlyphId } from './glyphPaths.js';
import styles from './Gameplay.module.css';

type TileGlyph = {
  id?: GlyphId;
  tooltip: string;
  danger?: boolean;
  treasure?: boolean;
};

const FEATURE_GLYPH: Partial<Record<Feature, TileGlyph>> = {
  [Feature.EMPTY]: { tooltip: 'Empty' },
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
  if (tile === MapTile.UNSEEN) return { id: 'DOT', tooltip: 'Unknown' };
  if (tile === MapTile.MONSTER)
    return { id: 'MONSTER', tooltip: 'Monster', danger: true };
  if (tile === MapTile.TREASURE)
    return { id: 'GEM', tooltip: 'Treasure', treasure: true };
  return FEATURE_GLYPH[tile as Feature] ?? { tooltip: 'Empty' };
}

/** Inline <symbol> defs for every glyph; render once per screen. */
export function GlyphDefs() {
  return (
    <svg width={0} height={0} aria-hidden="true" style={{ position: 'absolute' }}>
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

export function MapGrid({
  map,
  selfX,
  selfY,
}: {
  map: Tile[][];
  selfX: number;
  selfY: number;
}) {
  return (
    <div className={styles.grid}>
      {map.map((row, y) => (
        <div key={y} className={styles.gridRow}>
          {row.map((tile, x) => {
            const glyph = tileGlyph(tile);
            const isSelf = x === selfX && y === selfY;
            return (
              <div
                key={x}
                title={isSelf ? 'You' : glyph.tooltip}
                className={clsx(
                  styles.cell,
                  isSelf && styles.cellSelf,
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

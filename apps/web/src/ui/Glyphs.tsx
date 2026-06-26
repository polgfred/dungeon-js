import type { HTMLAttributes } from 'react';

import { Feature, MapTile, type Tile } from '@dod/core';

type GlyphId =
  | 'CHEST'
  | 'DOT'
  | 'DOWN'
  | 'EXIT'
  | 'FLAME'
  | 'FLASK'
  | 'GEM'
  | 'HEART'
  | 'MIRROR'
  | 'MONSTER'
  | 'SCROLL'
  | 'SHIELD'
  | 'SWORD'
  | 'THIEF'
  | 'UP'
  | 'VENDOR'
  | 'WARP';

// prettier-ignore
const GLYPH_PATHS: Record<GlyphId, string> = {
  CHEST: 'M0 3H1V2H2V1H6V2H7V3H8V8H0ZM2 4V3H3V2H5V3H6V4ZM2 7V5H6V7H5V6H3V7Z',
  DOT: 'M3 3H5V5H3Z',
  DOWN: 'M0 0H2V2H4V4H6V6H8V8H0Z',
  EXIT: 'M0 0H8V8H0ZM2 1H6V2H5V3H6V5H5V6H6V7H2V6H3V5H2V3H3V2H2ZM3 3H5V5H3Z',
  FLAME: 'M4 0H5V3H6V4H7V7H6V8H2V7H1V4H2V2H3V1H4ZM3 3H5V4H6V6H5V5H3V6H2V4H3Z',
  FLASK: 'M3 0H5V2H6V3H7V4H8V6H7V7H6V8H2V7H1V6H0V4H1V3H2V2H3ZM3 2H5V3H6V5H2V3H3V2Z',
  GEM: 'M2 1H6V2H7V3H8V4H7V5H6V6H5V7H3V6H2V5H1V4H0V3H1V2H2ZM2 2H3V3H4V4H3V3H2Z',
  HEART: 'M1 1H3V2H5V1H7V2H8V5H7V6H6V7H5V8H3V7H2V6H1V5H0V2H1Z',
  MIRROR: 'M2 0H6V1H7V2H8V6H7V7H6V8H2V7H1V6H0V2H1V1H2ZM3 1H5V2H6V6H5V7H3V6H2V3H4V4H5V3H4V2H3Z',
  MONSTER: 'M0 0H2V1H6V0H8V7H7V8H1V7H0ZM1 2H2V3H3V4H2V3H1ZM6 2H7V3H6V4H5V3H6ZM1 5H7V7H6V6H5V7H3V6H2V7H1Z',
  SCROLL: 'M1 0H7V1H8V2H7V6H8V7H7V8H1V7H0V6H1V2H0V1H1ZM2 2H6V3H2ZM2 4H6V5H2Z',
  SHIELD: 'M2 0H6V1H8V4H7V6H6V7H5V8H3V7H2V6H1V4H0V1H2Z',
  SWORD: 'M3 0H5V5H7V6H5V7H6V8H2V7H3V6H1V5H3Z',
  THIEF: 'M3 0H5V1H6V2H7V7H8V8H0V7H1V2H2V1H3ZM2 3H3V5H2ZM5 3H6V5H5Z',
  UP: 'M6 0H8V8H0V6H2V4H4V2H6Z',
  VENDOR: 'M2 0H6V1H8V2H7V3H8V5H7V7H6V8H2V7H1V5H0V3H1V2H0V1H2ZM2 2H3V4H2ZM5 2H6V4H5ZM2 5H6V6H5V7H3V6H2Z',
  WARP: 'M0 8V0H8V8H2V2H6V6H4V5H5V3H3V7H7V1H1V8Z',
};

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
  [Feature.STAIRS_UP]: { id: 'UP', tooltip: 'Stairs up' },
  [Feature.STAIRS_DOWN]: { id: 'DOWN', tooltip: 'Stairs down' },
  [Feature.EXIT]: { id: 'EXIT', tooltip: 'Exit', treasure: true },
};

export function tileGlyph(tile: Tile): TileGlyph {
  if (tile === MapTile.UNSEEN) return { id: 'DOT' };
  if (tile === MapTile.MONSTER)
    return { id: 'MONSTER', tooltip: 'Monster', danger: true };
  if (tile === MapTile.TREASURE)
    return { id: 'GEM', tooltip: 'Treasure', treasure: true };
  return FEATURE_GLYPH[tile as Feature] ?? { tooltip: 'Empty' };
}

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
          <symbol
            key={id}
            id={`glyph-${id}`}
            viewBox="0 0 8 8"
            fillRule="evenodd"
          >
            <path d={d} fill="currentColor" shapeRendering="crispEdges" />
          </symbol>
        ))}
      </defs>
    </svg>
  );
}

export function GlyphIcon({
  id,
  className,
}: {
  id: GlyphId;
  className?: HTMLAttributes<SVGElement>['className'];
}) {
  return (
    <svg className={className} viewBox="0 0 8 8" aria-hidden="true">
      <use href={`#glyph-${id}`} />
    </svg>
  );
}

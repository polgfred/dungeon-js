// 8x8 1-bit map glyphs, in the spirit of an Atari character set.
//
// Edit these as ASCII art: '#' = lit pixel, any other char = empty.
// Each glyph is exactly 8 rows of 8 columns. They render as crisp-edged
// SVGs scaled to an integer multiple of 8px, and inherit the cell color
// via `currentColor` (so the red/gold map classes still apply).

export type Glyph = readonly [
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
];

// Unseen — a lone dot
export const DOT: Glyph = [
  '........',
  '........',
  '........',
  '...##...',
  '...##...',
  '........',
  '........',
  '........',
];

// Monster — a horned face: angry slanted eyes over a fanged maw
export const MONSTER: Glyph = [
  '##....##',
  '########',
  '#.####.#',
  '##.##.##',
  '########',
  '#......#',
  '#.#..#.#',
  '.######.',
];

// Treasure — cut gem
export const GEM: Glyph = [
  '........',
  '..####..',
  '.#.####.',
  '###.####',
  '.######.',
  '..####..',
  '...##...',
  '........',
];

// Mirror — framed wall mirror with a diagonal glint
export const MIRROR: Glyph = [
  '..####..',
  '.##..##.',
  '####..##',
  '##..#.##',
  '##....##',
  '##....##',
  '.##..##.',
  '..####..',
];

// Scroll — rolled parchment with lines of writing
export const SCROLL: Glyph = [
  '.######.',
  '########',
  '.#....#.',
  '.######.',
  '.#....#.',
  '.######.',
  '########',
  '.######.',
];

// Chest — lidded box with latch
export const CHEST: Glyph = [
  '........',
  '..####..',
  '.##..##.',
  '##....##',
  '########',
  '##....##',
  '##.##.##',
  '########',
];

// Flares — a flame with a hollow inner tongue
export const FLAME: Glyph = [
  '....#...',
  '...##...',
  '..###...',
  '..#..#..',
  '.#....#.',
  '.#.##.#.',
  '.######.',
  '..####..',
];

// Potion — hollow flask with liquid in the bottom
export const FLASK: Glyph = [
  '...##...',
  '...##...',
  '..#..#..',
  '.#....#.',
  '##....##',
  '########',
  '.######.',
  '..####..',
];

// Vendor — a doorway arch
export const VENDOR: Glyph = [
  '..####..',
  '.######.',
  '###..###',
  '##....##',
  '##....##',
  '##....##',
  '##....##',
  '##....##',
];

// Thief — hooded rogue with a peaked hood and shadowed face
export const THIEF: Glyph = [
  '...##...',
  '..####..',
  '.######.',
  '.#.##.#.',
  '.#.##.#.',
  '.######.',
  '.######.',
  '########',
];

// Warp — a spiral winding into the center
export const WARP: Glyph = [
  '########',
  '#......#',
  '#.####.#',
  '#.#..#.#',
  '#.#..#.#',
  '#.#.##.#',
  '#.#....#',
  '#.######',
];

// Stairs up — steps rising to the right
export const STAIRS_UP: Glyph = [
  '......##',
  '......##',
  '....####',
  '....####',
  '..######',
  '..######',
  '########',
  '########',
];

// Stairs down — steps descending to the right (mirror of stairs up)
export const STAIRS_DOWN: Glyph = [
  '##......',
  '##......',
  '####....',
  '####....',
  '######..',
  '######..',
  '########',
  '########',
];

// Exit — door with knob
export const EXIT: Glyph = [
  '########',
  '##....##',
  '###..###',
  '##.##.##',
  '##.##.##',
  '###..###',
  '##....##',
  '########',
];

// Generates the brick-wall title SVGs from titlemap.txt.
// Run with: npm run gen:title
//
//   apps/web/src/assets/DofDTitle.svg      stacked   (DUNGEON / of / DOOM)
//   apps/web/src/assets/DofDTitleFlat.svg  single row (DUNGEON of DOOM)
//
// titlemap.txt is an ASCII bitmap of the title lettering: every non-space cell
// is one 8x8 "brick". Because the original art was drawn on an 8x8 grid, every
// edge lands on a multiple of CELL, so the silhouette is exact by construction.
//
// The SVG is self-contained: a <pattern> supplies the brick texture and a
// single <path> (the union of all "on" cells) is filled with it. Pattern and
// path share one coordinate system, so scaling the SVG scales texture and
// silhouette in lockstep — the bricks stay welded to the letter edges at any
// size. Used as a CSS mask, the brick alpha shows through and the color comes
// from the element's background-color (theme-able, like the old PNG).

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const CELL = 8; // px per grid cell
const WORD_GAP = 3; // cells of space between words in the flat layout

// The brick texture is a two-course running-bond wall within each 8x8 tile.
// The top course is one centered brick; the bottom course is offset by half a
// cell, so it reads as two half-bricks that butt across the tile seam into a
// full brick centered on the mortar joint above. The <pattern> clips content
// to the tile, so the offset bricks' outer edges square off for free.
const BRICK = { w: 6, h: 2.5, rx: 0.5 };
const TOP_Y = 0.75;
const BOT_Y = 4.75;
const TOP_X = (CELL - BRICK.w) / 2; // centered in the tile
const brickRect = (x: number, y: number) =>
  `<rect x="${x}" y="${y}" width="${BRICK.w}" height="${BRICK.h}" rx="${BRICK.rx}" fill="#fff"/>`;
const bricks = [
  brickRect(TOP_X, TOP_Y), // top course: centered
  brickRect(TOP_X - CELL / 2, BOT_Y), // bottom course: half-left (clipped square at left edge)
  brickRect(TOP_X + CELL / 2, BOT_Y), // bottom course: half-right (clipped square at right edge)
].join('\n      ');

type Cell = { x: number; y: number };

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const assets = resolve(root, 'apps/web/src/assets');

const raw = readFileSync(resolve(here, 'titlemap.txt'), 'utf8');
const lines = raw.replace(/\n$/, '').split('\n');

// Every non-space char is an "on" cell.
const lineCells = (y: number): Cell[] => {
  const line = lines[y];
  const out: Cell[] = [];
  for (let x = 0; x < line.length; x++) if (line[x] !== ' ') out.push({ x, y });
  return out;
};

// Split the bitmap into words: maximal runs of non-blank lines (the stacked
// words are separated by blank lines in the source).
const words: Cell[][] = [];
let current: Cell[] = [];
let inWord = false;
lines.forEach((line, y) => {
  if (line.trim() === '') {
    if (inWord) {
      words.push(current);
      current = [];
      inWord = false;
    }
  } else {
    current.push(...lineCells(y));
    inWord = true;
  }
});
if (inWord) words.push(current);

if (!words.length) throw new Error('titlemap.txt has no lettering');

const bbox = (cs: Cell[]) => {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const { x, y } of cs) {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  return {
    minX,
    minY,
    maxX,
    maxY,
    cols: maxX - minX + 1,
    rows: maxY - minY + 1,
  };
};

// Build an SVG from a cell list, normalized so its bounding box starts at 0,0.
const buildSvg = (cs: Cell[]) => {
  const b = bbox(cs);
  const d = cs
    .map(({ x, y }) => {
      const px = (x - b.minX) * CELL;
      const py = (y - b.minY) * CELL;
      return `M${px} ${py}h${CELL}v${CELL}h-${CELL}z`;
    })
    .join('');
  const width = b.cols * CELL;
  const height = b.rows * CELL;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}">
  <defs>
    <pattern id="brick" width="${CELL}" height="${CELL}" patternUnits="userSpaceOnUse">
      ${bricks}
    </pattern>
  </defs>
  <path d="${d}" fill="url(#brick)"/>
</svg>
`;
  return { svg, ...b };
};

const write = (name: string, cs: Cell[]) => {
  const { svg, cols, rows } = buildSvg(cs);
  const out = resolve(assets, name);
  writeFileSync(out, svg);
  console.log(
    `Wrote ${name}: ${cols}x${rows} cells, ${cs.length} bricks, ${svg.length} bytes`
  );
};

// Stacked: all words in their original layout.
write('DofDTitle.svg', words.flat());

// Favicon: a small square of the same brick wall (a 4x4-cell tile). Colored
// directly (not a mask) so it stands alone as an icon; gray on transparent to
// match the old brick.png it replaces. (currentColor doesn't reliably inherit
// into <pattern> content across renderers, so the gray is baked in.)
const FAVICON_CELLS = 2;
const FAVICON_FILL = '#cccccc';
const favSize = FAVICON_CELLS * CELL;
const favicon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${favSize} ${favSize}">
  <defs>
    <pattern id="brick" width="${CELL}" height="${CELL}" patternUnits="userSpaceOnUse">
      ${bricks.replace(/fill="#fff"/g, `fill="${FAVICON_FILL}"`)}
    </pattern>
  </defs>
  <rect width="${favSize}" height="${favSize}" fill="url(#brick)"/>
</svg>
`;
writeFileSync(resolve(assets, 'brick.svg'), favicon);
console.log(
  `Wrote brick.svg (favicon): ${favSize}x${favSize}, ${favicon.length} bytes`
);

// Flat: lay the words end to end on a common baseline, WORD_GAP cells apart.
const maxRows = Math.max(...words.map((w) => bbox(w).rows));
const flat: Cell[] = [];
let xCursor = 0;
for (const word of words) {
  const b = bbox(word);
  const yShift = maxRows - b.rows; // bottom-align (baseline)
  for (const { x, y } of word) {
    flat.push({ x: xCursor + (x - b.minX), y: yShift + (y - b.minY) });
  }
  xCursor += b.cols + WORD_GAP;
}
write('DofDTitleFlat.svg', flat);

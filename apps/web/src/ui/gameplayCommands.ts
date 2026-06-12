import type { Command } from './CommandButton.js';

// Static command sets, keyed exactly as the engine expects (single chars sent to
// step()). Movement uses `move-*` ids so CommandButton renders arrow glyphs.

export const MOVE_COMMANDS: Command[] = [
  { id: 'move-n', key: 'N', label: 'North', disabled: false },
  { id: 'move-w', key: 'W', label: 'West', disabled: false },
  { id: 'move-e', key: 'E', label: 'East', disabled: false },
  { id: 'move-s', key: 'S', label: 'South', disabled: false },
];

export const VERTICAL_COMMANDS: Command[] = [
  { id: 'move-u', key: 'U', label: 'Up', disabled: false },
  { id: 'move-d', key: 'D', label: 'Down', disabled: false },
];

export const ACTION_COMMANDS: Command[] = [
  { id: 'act-flare', key: 'F', label: 'Flare', disabled: false },
  { id: 'act-mirror', key: 'L', label: 'Mirror', disabled: false },
  { id: 'act-chest', key: 'O', label: 'Open', disabled: false },
  { id: 'act-scroll', key: 'R', label: 'Read', disabled: false },
  { id: 'act-potion', key: 'P', label: 'Potion', disabled: false },
  { id: 'act-vendor', key: 'B', label: 'Buy', disabled: false },
  { id: 'exit', key: 'X', label: 'Exit', disabled: false },
];

export const ENCOUNTER_COMMANDS: Command[] = [
  { id: 'fight', key: 'F', label: 'Fight', disabled: false, primary: true },
  { id: 'run', key: 'R', label: 'Run', disabled: false },
  { id: 'spell', key: 'S', label: 'Spell', disabled: false },
];

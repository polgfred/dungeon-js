import type { Command } from './Gameplay.js';

// Static command sets, keyed to what the engine expects. */

export const NAV_COMMANDS: Command[] = [
  { id: 'move-n', key: 'N', label: 'North', disabled: false },
  { id: 'move-s', key: 'S', label: 'South', disabled: false },
  { id: 'move-e', key: 'E', label: 'East', disabled: false },
  { id: 'move-w', key: 'W', label: 'West', disabled: false },
];

export const TRANSIT_COMMANDS: Command[] = [
  { id: 'move-u', key: 'U', label: 'Up', disabled: false },
  { id: 'move-d', key: 'D', label: 'Down', disabled: false },
  { id: 'exit', key: 'X', label: 'Exit', disabled: false },
];

// Client-only: opens the help dialog rather than sending to the engine. Always
// available, so it sits below the transit keys and its key (?) always fires.
export const HELP_COMMAND: Command = {
  id: 'help',
  key: '?',
  label: 'Help',
  disabled: false,
};

export const FEATURE_COMMANDS: Command[] = [
  { id: 'act-flare', key: 'F', label: 'Flare', disabled: false },
  { id: 'act-mirror', key: 'L', label: 'Look', disabled: false },
  { id: 'act-chest', key: 'O', label: 'Open', disabled: false },
  { id: 'act-scroll', key: 'R', label: 'Read', disabled: false },
  { id: 'act-potion', key: 'P', label: 'Drink', disabled: false },
  { id: 'act-vendor', key: 'B', label: 'Buy', disabled: false },
];

/** Explore legend, as displayed lines. */
export const EXPLORE_COMMAND_GROUPS: Command[][] = [
  NAV_COMMANDS,
  TRANSIT_COMMANDS,
  FEATURE_COMMANDS,
];

export const ENCOUNTER_COMMANDS: Command[] = [
  { id: 'fight', key: 'F', label: 'Fight', disabled: false, primary: true },
  { id: 'run', key: 'R', label: 'Run', disabled: false },
  { id: 'spell', key: 'S', label: 'Spell', disabled: false },
];

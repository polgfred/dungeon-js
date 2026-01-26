import { Mode } from './constants.js';

export type EventKind =
  | 'INFO'
  | 'ERROR'
  | 'COMBAT'
  | 'LOOT'
  | 'PROMPT'
  | 'STATUS'
  | 'MAP'
  | 'DEBUG';

export type InfoEvent = { kind: 'INFO'; text: string };
export type ErrorEvent = { kind: 'ERROR'; text: string };
export type CombatEvent = { kind: 'COMBAT'; text: string };
export type LootEvent = { kind: 'LOOT'; text: string };
export type DebugEvent = { kind: 'DEBUG'; text: string };

export type PromptData = {
  type?: string;
  options?: Record<string, number>;
};

export type PromptEvent = {
  kind: 'PROMPT';
  text: string;
  data?: PromptData;
};

export type StatusEvent = {
  kind: 'STATUS';
  text: '';
  data: Record<string, number | string>;
};

export type MapEvent = {
  kind: 'MAP';
  text: '';
  data: {
    grid: string[];
  };
};

export type Event =
  | InfoEvent
  | ErrorEvent
  | CombatEvent
  | LootEvent
  | DebugEvent
  | PromptEvent
  | StatusEvent
  | MapEvent;

export const Event = {
  info(text: string): InfoEvent {
    return { kind: 'INFO', text };
  },
  error(text: string): ErrorEvent {
    return { kind: 'ERROR', text };
  },
  combat(text: string): CombatEvent {
    return { kind: 'COMBAT', text };
  },
  loot(text: string): LootEvent {
    return { kind: 'LOOT', text };
  },
  prompt(text: string, data?: PromptData): PromptEvent {
    return data ? { kind: 'PROMPT', text, data } : { kind: 'PROMPT', text };
  },
  status(data: Record<string, number | string>): StatusEvent {
    return { kind: 'STATUS', text: '', data };
  },
  map(grid: string[]): MapEvent {
    return { kind: 'MAP', text: '', data: { grid } };
  },
  debug(text: string): DebugEvent {
    return { kind: 'DEBUG', text };
  },
};

export interface StepResult {
  events: Event[];
  mode: Mode;
  needsInput: boolean;
}

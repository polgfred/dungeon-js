import { Mode } from './constants.js';

export type EventKind =
  | 'INFO'
  | 'ERROR'
  | 'COMBAT'
  | 'LOOT'
  | 'PROMPT'
  | 'DEBUG';

export type InfoEvent = { kind: 'INFO'; text: string };
export type ErrorEvent = { kind: 'ERROR'; text: string };
export type CombatEvent = { kind: 'COMBAT'; text: string };
export type LootEvent = { kind: 'LOOT'; text: string };
export type DebugValue = string | number | boolean | null;
export type DebugData = Record<string, DebugValue>;
export type DebugEvent = { kind: 'DEBUG'; text: ''; data: DebugData };

export type PromptOption = {
  key: string;
  label: string;
  disabled: boolean;
};

export type PromptData = {
  type?: string;
  options?: PromptOption[];
  hasCancel: boolean;
};

export type PromptEvent = {
  kind: 'PROMPT';
  text: string;
  data?: PromptData;
};

export type Event =
  | InfoEvent
  | ErrorEvent
  | CombatEvent
  | LootEvent
  | DebugEvent
  | PromptEvent;

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
  debug(data: DebugData): DebugEvent {
    return { kind: 'DEBUG', text: '', data };
  },
};

export interface StepResult {
  events: Event[];
  mode: Mode;
}

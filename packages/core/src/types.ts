import type { Mode } from './constants.js';

export type PlayerId = string;

export type EventKind =
  | 'INFO'
  | 'ERROR'
  | 'COMBAT'
  | 'LOOT'
  | 'PROMPT'
  | 'DEBUG';

export type Broadcastable = { broadcast?: boolean };

export type InfoEvent = { kind: 'INFO'; text: string } & Broadcastable;
export type ErrorEvent = { kind: 'ERROR'; text: string } & Broadcastable;
export type CombatEvent = { kind: 'COMBAT'; text: string } & Broadcastable;
export type LootEvent = { kind: 'LOOT'; text: string } & Broadcastable;
export type DebugValue = string | number | boolean | null;
export type DebugData = Record<string, DebugValue>;
export type DebugEvent = {
  kind: 'DEBUG';
  text: '';
  data: DebugData;
} & Broadcastable;

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
} & Broadcastable;

export type Event =
  | InfoEvent
  | ErrorEvent
  | CombatEvent
  | LootEvent
  | DebugEvent
  | PromptEvent;

export const Event = {
  info(text: string, broadcast = false): InfoEvent {
    return broadcast
      ? { kind: 'INFO', text, broadcast }
      : { kind: 'INFO', text };
  },
  error(text: string, broadcast = false): ErrorEvent {
    return broadcast
      ? { kind: 'ERROR', text, broadcast }
      : { kind: 'ERROR', text };
  },
  combat(text: string, broadcast = false): CombatEvent {
    return broadcast
      ? { kind: 'COMBAT', text, broadcast }
      : { kind: 'COMBAT', text };
  },
  loot(text: string, broadcast = false): LootEvent {
    return broadcast
      ? { kind: 'LOOT', text, broadcast }
      : { kind: 'LOOT', text };
  },
  prompt(text: string, data?: PromptData): PromptEvent {
    return data ? { kind: 'PROMPT', text, data } : { kind: 'PROMPT', text };
  },
  debug(data: DebugData): DebugEvent {
    return { kind: 'DEBUG', text: '', data };
  },
};

export interface StepResult {
  playerId: PlayerId;
  events: Event[];
  mode: Mode;
}

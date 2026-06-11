import type { Mode } from './constants.js';

export type EventKind =
  | 'INFO'
  | 'ERROR'
  | 'COMBAT'
  | 'LOOT'
  | 'PROMPT'
  | 'DEBUG';

/**
 * When true, this event is meant for the whole party, not just the player whose
 * turn produced it — e.g. "a treasure was found" or "a monster was slain". The
 * engine only tags events; routing broadcasts to other players is the
 * transport's job.
 */
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
  broadcast<E extends Event>(event: E): E {
    return { ...event, broadcast: true };
  },
};

export interface StepResult {
  events: Event[];
  mode: Mode;
}

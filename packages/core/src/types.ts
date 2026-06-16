import type { Mode } from './constants.js';

export type PlayerId = string;

export type EventKind = 'INFO' | 'ERROR' | 'COMBAT' | 'LOOT' | 'PROMPT';

/** When set, `broadcast` is the line the rest of the party sees instead. */
export type Broadcastable = { broadcast?: string };

export type InfoEvent = { kind: 'INFO'; text: string } & Broadcastable;
export type ErrorEvent = { kind: 'ERROR'; text: string } & Broadcastable;
export type CombatEvent = { kind: 'COMBAT'; text: string } & Broadcastable;
export type LootEvent = { kind: 'LOOT'; text: string } & Broadcastable;

export type PromptOption = {
  key: string;
  label: string;
  note?: string;
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
  | PromptEvent;

export const Event = {
  info(text: string, broadcast?: string): InfoEvent {
    return broadcast === undefined
      ? { kind: 'INFO', text }
      : { kind: 'INFO', text, broadcast };
  },
  error(text: string, broadcast?: string): ErrorEvent {
    return broadcast === undefined
      ? { kind: 'ERROR', text }
      : { kind: 'ERROR', text, broadcast };
  },
  combat(text: string, broadcast?: string): CombatEvent {
    return broadcast === undefined
      ? { kind: 'COMBAT', text }
      : { kind: 'COMBAT', text, broadcast };
  },
  loot(text: string, broadcast?: string): LootEvent {
    return broadcast === undefined
      ? { kind: 'LOOT', text }
      : { kind: 'LOOT', text, broadcast };
  },
  prompt(text: string, data?: PromptData): PromptEvent {
    return data ? { kind: 'PROMPT', text, data } : { kind: 'PROMPT', text };
  },
};

export interface StepResult {
  playerId: PlayerId;
  events: Event[];
  mode: Mode;
}

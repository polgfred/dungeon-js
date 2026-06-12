import type { PlayerId } from '@dod/net/client';

// Number of distinct chat colors defined as --chat-N tokens in theme.css.
const CHAT_COLOR_COUNT = 8;

/** The CSS color var for a player's chat name */
export function chatColor(index: number): string {
  return `var(--chat-${((index % CHAT_COLOR_COUNT) + CHAT_COLOR_COUNT) % CHAT_COLOR_COUNT})`;
}

export function chatColorsById(
  members: readonly { id: PlayerId }[]
): (id: PlayerId) => string {
  const byId = new Map(members.map((m, i) => [m.id, chatColor(i)] as const));
  return (id) => byId.get(id) ?? chatColor(0);
}

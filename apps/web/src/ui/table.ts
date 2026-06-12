// Table identity & connection helpers: a shareable code, the worker's WS URL,
// and a remembered display name — the small glue between the home screen and a
// /play/<code> session.

const ADJECTIVES = [
  'amber', 'azure', 'brass', 'coral', 'dusk', 'ember', 'frost', 'garnet',
  'ivory', 'jade', 'onyx', 'plum', 'rust', 'sable', 'teal', 'umber',
];
const NOUNS = [
  'adze', 'bolt', 'cairn', 'dirk', 'flask', 'gate', 'helm', 'keep',
  'lyre', 'moat', 'rune', 'sigil', 'torch', 'vault', 'warden', 'wyrm',
];

function pick(list: readonly string[]): string {
  return list[Math.floor(Math.random() * list.length)];
}

/** A memorable, shareable table code like `plum-warden`. */
export function generateTableCode(): string {
  return `${pick(ADJECTIVES)}-${pick(NOUNS)}`;
}

/** Sanitize a typed/pasted code down to the characters a code can contain. */
export function normalizeTableCode(input: string): string {
  return input.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
}

/** The worker WebSocket URL for a table. Dev defaults to the local wrangler port. */
export function tableWsUrl(code: string): string {
  const base = import.meta.env.VITE_WS_BASE ?? 'ws://localhost:8787';
  return `${base}/${encodeURIComponent(code)}`;
}

const NAME_KEY = 'dod.playerName';

export function loadPlayerName(): string {
  return localStorage.getItem(NAME_KEY) ?? '';
}

export function savePlayerName(name: string): void {
  localStorage.setItem(NAME_KEY, name.trim());
}

// Inspect a Durable Object's persisted snapshot from wrangler's local storage.
// The value is V8-serialized (structuredClone semantics), not JSON, so we decode
// it the same way the runtime would — handy for confirming exactly what a DO has
// persisted (e.g. a TableObject's lobby/play snapshot).
//
//   node scripts/inspect.js <path-to-do.sqlite>
//
// e.g. node scripts/inspect.js \
//   .wrangler/state/v3/do/dungeon-of-doom-mp-TableObject/<id>.sqlite

import { existsSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { inspect } from 'node:util';
import { deserialize } from 'node:v8';

const path = process.argv[2];
if (!path) {
  console.error('Usage: node scripts/inspect.js <path-to-do.sqlite>');
  process.exit(1);
}

// DatabaseSync would otherwise create an empty db at a typo'd path.
if (!existsSync(path)) {
  console.error(`No such file: ${path}`);
  process.exit(1);
}

let rows;
try {
  const db = new DatabaseSync(path);
  rows = db.prepare('SELECT value FROM _cf_KV').all();
} catch (error) {
  // Usually the file doesn't exist, or the object was reclaimed and its _cf_KV
  // table is gone.
  console.error(`Could not read a snapshot from ${path}: ${error.message}`);
  process.exit(1);
}

if (rows.length === 0) {
  console.error(
    `No snapshot in ${path} — the object is empty (never persisted or reclaimed).`
  );
  process.exit(1);
}

const snapshot = deserialize(rows[0].value);
console.log(inspect(snapshot, { colors: true, compact: true, depth: Infinity }));

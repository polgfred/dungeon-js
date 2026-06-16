import { DurableObject } from 'cloudflare:workers';

/** Storage key under which the object's snapshot is persisted. */
const SNAPSHOT_KEY = 'snapshot';

/** How long an object may sit idle before its persisted state is reclaimed. */
const CLEANUP_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * A Durable Object that owns its persistence lifecycle and nothing else.
 *
 * Persisted state expires after `CLEANUP_TTL_MS` of inactivity: a sliding alarm
 * is pushed forward on every write (and via `touch()` for activity that doesn't
 * write), and when it fires the storage is dropped so the object is reclaimed.
 * It reincarnates fresh on next use.
 *
 * NOTE: you need to call `restore()` in the *subclass* constructor or else the
 * base constructor would set state that those initializers then clobber.
 */
export abstract class HydratableObject<
  Snapshot,
  Env = unknown,
> extends DurableObject<Env> {
  /** Call from the subclass constructor, after `super()`. */
  protected restore() {
    this.touch();
    this.hydrate(this.ctx.storage.kv.get<Snapshot>(SNAPSHOT_KEY));
  }

  /** Rebuild live state from its persisted snapshot. */
  protected abstract hydrate(snapshot: Snapshot | undefined): void;

  /** Serialize the current live state for storage. */
  protected abstract snapshot(): Snapshot;

  /** Write the current state to storage. */
  protected persist() {
    this.touch();
    this.ctx.storage.kv.put(SNAPSHOT_KEY, this.snapshot());
  }

  /** Slide the inactivity-cleanup alarm forward. */
  protected touch() {
    this.ctx.storage.setAlarm(Date.now() + CLEANUP_TTL_MS);
  }

  /** Fired after a full TTL of inactivity: drop the persisted state. */
  async alarm() {
    await this.ctx.storage.deleteAll();
  }
}

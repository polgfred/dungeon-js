import { DurableObject } from 'cloudflare:workers';

/** Storage key under which the object's snapshot is persisted. */
const SNAPSHOT_KEY = 'snapshot';

/**
 * A Durable Object that owns its persistence lifecycle and nothing else.
 *
 * NOTE: you need to call `restore()` in the *subclass* constructor or else the
 * base constructor would set state that those initializers then clobber.
 */
export abstract class HydratableObject<
  Snapshot,
  Env = unknown,
> extends DurableObject<Env> {
  /** Call from the subclass constructor, after `super()`. */
  protected restore(): void {
    this.hydrate(this.ctx.storage.kv.get<Snapshot>(SNAPSHOT_KEY));
  }

  /** Rebuild live state from its persisted snapshot. */
  protected abstract hydrate(snapshot: Snapshot | undefined): void;

  /** Serialize the current live state for storage. */
  protected abstract snapshot(): Snapshot;

  /** Write the current state to storage. */
  protected persist(): void {
    this.ctx.storage.kv.put(SNAPSHOT_KEY, this.snapshot());
  }
}

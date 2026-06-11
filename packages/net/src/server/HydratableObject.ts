import { DurableObject } from 'cloudflare:workers';

/** Storage key under which the object's snapshot is persisted. */
const SNAPSHOT_KEY = 'snapshot';

/**
 * A Durable Object that owns its persistence lifecycle and nothing else.
 *
 * SQLite-backed Durable Object storage is synchronous, so on every wake — first
 * construction, and again whenever the runtime re-creates the object after a
 * hibernation eviction — this reads its snapshot and rebuilds its live state
 * right in the constructor. By the time any request or WebSocket message is
 * dispatched, the object is already hydrated; there's no async gating to manage.
 *
 * Subclasses hold their own live state, implement the two transforms, and call
 * {@link persist} after a mutation. The base carries no domain logic, leaving a
 * concrete DO free to be a thin traffic cop over requests and messages.
 *
 * @typeParam Snapshot - the persisted form of the state. Stored under a single
 *   KV key, so it must be a serializable value (plain objects/arrays).
 * @typeParam Env - the Worker environment bindings.
 */
export abstract class HydratableObject<
  Snapshot,
  Env = unknown,
> extends DurableObject<Env> {
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    this.hydrate(ctx.storage.kv.get<Snapshot>(SNAPSHOT_KEY));
  }

  /**
   * Rebuild the live state from its persisted snapshot. `snapshot` is `undefined`
   * the first time the object is created, before anything has been stored.
   */
  protected abstract hydrate(snapshot: Snapshot | undefined): void;

  /** Produce the current snapshot of the live state for persistence. */
  protected abstract snapshot(): Snapshot;

  /** Write the current snapshot to storage. */
  protected persist(): void {
    this.ctx.storage.kv.put(SNAPSHOT_KEY, this.snapshot());
  }
}

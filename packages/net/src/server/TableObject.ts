import {
  Game,
  defaultRandomSource,
  deserializePlayer,
  serializePlayer,
  type GameSave,
  type PlayerSave,
  type StepResult,
} from '@dod/core';

import type {
  ClientMessage,
  PlayerId,
  PlayerView,
  ServerMessage,
} from '../shared/index.js';
import { HydratableObject } from './HydratableObject.js';

interface Member {
  id: PlayerId;
  name: string;
  character: PlayerSave | null;
}

/** Lobby and play are mutually exclusive phases. */
type TableState =
  | { kind: 'lobby'; members: Map<PlayerId, Member> }
  | { kind: 'play'; names: Map<PlayerId, string>; game: Game };

type TableSnapshot =
  | { kind: 'lobby'; members: Map<PlayerId, Member> }
  | { kind: 'play'; names: Map<PlayerId, string>; game: GameSave };

interface SocketAttachment {
  playerId: PlayerId;
}

export class TableObject extends HydratableObject<TableSnapshot> {
  private state: TableState = { kind: 'lobby', members: new Map() };
  // Keep track of disconnecting sockets until they're gone
  private departed = new WeakSet<WebSocket>();

  constructor(ctx: DurableObjectState, env: unknown) {
    super(ctx, env);
    this.restore();
  }

  /** The engine, or null while we're still in the lobby. */
  private get game(): Game | null {
    return this.state.kind === 'lobby' ? null : this.state.game;
  }

  /** A player's display name, wherever it lives for the current phase. */
  private nameOf(playerId: PlayerId): string {
    return this.state.kind === 'lobby'
      ? (this.state.members.get(playerId)?.name ?? playerId)
      : (this.state.names.get(playerId) ?? playerId);
  }

  protected hydrate(snapshot: TableSnapshot | undefined) {
    if (!snapshot) return;
    if (snapshot.kind === 'lobby') {
      this.state = { kind: 'lobby', members: snapshot.members };
      return;
    }

    try {
      this.state = {
        kind: 'play',
        names: snapshot.names,
        game: Game.fromSave(snapshot.game),
      };
    } catch (error) {
      // An unreadable save (e.g. a SAVE_VERSION bump) — abandon the game and
      // come up as a fresh lobby rather than crashing the object on construction.
      console.error('Discarding unreadable game snapshot:', error);
      this.state = { kind: 'lobby', members: new Map() };
    }
  }

  protected snapshot(): TableSnapshot {
    return this.state.kind === 'lobby'
      ? { kind: 'lobby', members: this.state.members }
      : {
          kind: 'play',
          names: this.state.names,
          game: this.state.game.toSave(),
        };
  }

  // --- connection lifecycle -------------------------------------------------

  override fetch(request: Request) {
    if (request.headers.get('Upgrade') !== 'websocket') {
      return new Response('Expected a WebSocket upgrade.', { status: 426 });
    }
    const { 0: client, 1: server } = new WebSocketPair();
    this.ctx.acceptWebSocket(server);
    return new Response(null, { status: 101, webSocket: client });
  }

  override webSocketClose(ws: WebSocket) {
    this.announceDeparture(ws);
  }

  override webSocketError(ws: WebSocket) {
    this.announceDeparture(ws);
  }

  private announceDeparture(ws: WebSocket) {
    this.departed.add(ws);
    if (this.state.kind === 'play') this.pushViews();
    else this.broadcastLobby();
  }

  override webSocketMessage(ws: WebSocket, raw: string | ArrayBuffer) {
    let message: ClientMessage;
    try {
      const text =
        typeof raw === 'string' ? raw : new TextDecoder().decode(raw);
      message = JSON.parse(text) as ClientMessage;
    } catch {
      this.send(ws, { type: 'error', message: 'Malformed message.' });
      return;
    }

    if (message.type === 'join') {
      this.handleJoin(ws, message.playerId, message.name);
      return;
    }

    const playerId = this.playerIdOf(ws);
    if (!playerId) {
      this.send(ws, { type: 'error', message: 'Send a join message first.' });
      return;
    }

    switch (message.type) {
      case 'setCharacter':
        this.handleSetCharacter(playerId, message.character);
        break;
      case 'start':
        this.handleStart();
        break;
      case 'action':
        this.handleAction(playerId, message.command);
        break;
      case 'cancel':
        this.handleCancel(playerId);
        break;
      case 'chat':
        this.handleChat(playerId, message.text);
        break;
    }
  }

  /** Fan out chat messages to everyone at the table. */
  private handleChat(playerId: PlayerId, text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;
    this.touch(); // chatting keeps the table alive
    const name = this.nameOf(playerId);
    const message = {
      type: 'chat',
      from: playerId,
      name,
      text: trimmed.slice(0, 280),
    } as const;
    for (const ws of this.ctx.getWebSockets()) {
      this.send(ws, message);
    }
  }

  // --- lobby ----------------------------------------------------------------

  private handleJoin(ws: WebSocket, playerId: PlayerId, name: string) {
    ws.serializeAttachment({ playerId } satisfies SocketAttachment);

    if (this.state.kind === 'lobby') {
      const { members } = this.state;
      const existing = members.get(playerId);
      if (existing) {
        existing.name = name; // reconnect / rename
      } else {
        members.set(playerId, { id: playerId, name, character: null });
      }
      this.persist();
      this.broadcastLobby();
      return;
    }

    const { game, names } = this.state;
    if (!game.hasPlayer(playerId)) {
      this.send(ws, {
        type: 'error',
        message: 'This game has already begun.',
      });
      return;
    }

    names.set(playerId, name); // reconnect / rename
    this.persist();
    this.pushViews();
    this.send(ws, {
      type: 'events',
      from: playerId,
      events: game.resumeEvents(playerId),
    });
  }

  private handleSetCharacter(playerId: PlayerId, character: PlayerSave) {
    if (this.state.kind !== 'lobby') {
      this.sendError(playerId, 'The game has already begun.');
      return;
    }

    const member = this.state.members.get(playerId);
    if (!member) return;
    member.character = character;
    this.persist();
    this.broadcastLobby();
  }

  private handleStart() {
    if (this.state.kind !== 'lobby') return; // already underway

    const members = [...this.state.members.values()];
    // Don't start until every member has readied a character.
    if (members.length === 0 || members.some((m) => !m.character)) return;

    const game = new Game({
      rng: defaultRandomSource,
      players: members.map((m) => ({
        id: m.id,
        player: deserializePlayer(m.character!),
      })),
    });
    // Spread a multi-player party out.
    if (members.length > 1) {
      game.scatterParty();
    }
    const names = new Map<PlayerId, string>();
    for (const member of members) {
      names.set(member.id, member.name);
    }

    this.state = { kind: 'play', game, names };
    for (const id of game.playerIds) {
      const events = game.startEvents(id);
      for (const ws of this.socketsOf(id)) {
        this.send(ws, { type: 'events', from: id, events });
      }
    }
    this.persist();
    this.pushViews();
  }

  // --- play -----------------------------------------------------------------

  private handleAction(playerId: PlayerId, command: string) {
    const game = this.requireSeated(playerId);
    if (!game) return;
    this.fanOut(game.step(playerId, command));
    this.persist();
  }

  private handleCancel(playerId: PlayerId) {
    const game = this.requireSeated(playerId);
    if (!game) return;
    this.fanOut(game.attemptCancel(playerId));
    this.persist();
  }

  private requireSeated(playerId: PlayerId): Game | null {
    if (this.state.kind === 'lobby') {
      this.sendError(playerId, 'The game has not started yet.');
      return null;
    }

    if (!this.state.game.hasPlayer(playerId)) {
      this.sendError(playerId, 'You are not playing in this game.');
      return null;
    }
    return this.state.game;
  }

  /**
   * Deliver the results of one player's turn: the actor sees each event's own
   * text; everyone else sees only the events that carry a `broadcast` line, with
   * that string swapped in as the text (attributed to the actor).
   */
  private fanOut(result: StepResult) {
    const forMe = result.events.map(({ broadcast, ...event }) => event);
    const forOthers = result.events
      .filter((event) => event.broadcast !== undefined)
      .map(({ broadcast, ...event }) => ({ ...event, text: broadcast! }));
    for (const ws of this.ctx.getWebSockets()) {
      const playerId = this.playerIdOf(ws);
      if (!playerId || !this.game?.hasPlayer(playerId)) continue;
      if (playerId === result.playerId) {
        this.send(ws, {
          type: 'events',
          from: result.playerId,
          events: forMe,
        });
      } else if (forOthers.length) {
        this.send(ws, {
          type: 'events',
          from: result.playerId,
          events: forOthers,
        });
      }
      this.send(ws, { type: 'view', view: this.viewFor(playerId) });
    }
  }

  // --- views & sending ------------------------------------------------------

  private viewFor(playerId: PlayerId): PlayerView {
    const game = this.game!;
    const self = game.getPlayer(playerId);
    const connected = this.connectedIds();
    return {
      self: serializePlayer(self),
      mode: game.mode(playerId),
      map: game.mapView(playerId),
      treasuresFound: game.treasuresFound.size,
      ended: game.endMode,
      party: game.playerIds.map((id) => ({
        id,
        name: this.nameOf(id),
        alive: game.getPlayer(id).hp > 0,
        connected: connected.has(id),
      })),
      occupants: game.playerIds
        .map((id) => ({ id, player: game.getPlayer(id) }))
        .filter(({ player }) => player.z === self.z)
        .map(({ id, player }) => ({ id, x: player.x, y: player.y })),
      monster: game.currentMonster(playerId),
      prompt: this.promptView(playerId),
    };
  }

  private promptView(playerId: PlayerId): PlayerView['prompt'] {
    const prompt = this.game!.currentPrompt(playerId);
    if (!prompt) return null;
    return {
      text: prompt.text,
      options: prompt.data?.options ?? [],
      hasCancel: prompt.data?.hasCancel ?? false,
    };
  }

  private pushViews() {
    for (const ws of this.ctx.getWebSockets()) {
      if (this.departed.has(ws)) continue;
      const playerId = this.playerIdOf(ws);
      if (playerId && this.game?.hasPlayer(playerId)) {
        this.send(ws, { type: 'view', view: this.viewFor(playerId) });
      }
    }
  }

  private connectedIds(): Set<PlayerId> {
    const ids = new Set<PlayerId>();
    for (const ws of this.ctx.getWebSockets()) {
      if (this.departed.has(ws)) continue;
      const id = this.playerIdOf(ws);
      if (id) ids.add(id);
    }
    return ids;
  }

  private broadcastLobby() {
    if (this.state.kind !== 'lobby') return;

    const { members } = this.state;
    const connected = this.connectedIds();
    const roster = Array.from(members.values(), (member) => ({
      id: member.id,
      name: member.name,
      ready: member.character !== null,
      connected: connected.has(member.id),
    }));

    for (const ws of this.ctx.getWebSockets()) {
      if (this.departed.has(ws)) continue;
      const viewerId = this.playerIdOf(ws);
      const character = viewerId
        ? (members.get(viewerId)?.character ?? null)
        : null;
      this.send(ws, { type: 'lobby', state: { members: roster, character } });
    }
  }

  private playerIdOf(ws: WebSocket): PlayerId | null {
    const attachment = ws.deserializeAttachment() as SocketAttachment | null;
    return attachment?.playerId ?? null;
  }

  private socketsOf(playerId: PlayerId) {
    return this.ctx
      .getWebSockets()
      .filter((ws) => this.playerIdOf(ws) === playerId);
  }

  private send(ws: WebSocket, message: ServerMessage) {
    ws.send(JSON.stringify(message));
  }

  private sendError(playerId: PlayerId, message: string) {
    for (const ws of this.socketsOf(playerId)) {
      this.send(ws, { type: 'error', message });
    }
  }
}

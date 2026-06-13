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
  LobbyState,
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

interface TableSnapshot {
  members: Member[];
  game: GameSave | null;
}

interface SocketAttachment {
  playerId: PlayerId;
}

export class TableObject extends HydratableObject<TableSnapshot> {
  private members = new Map<PlayerId, Member>();
  private game: Game | null = null;

  constructor(ctx: DurableObjectState, env: unknown) {
    super(ctx, env);
    this.restore();
  }

  protected hydrate(snapshot: TableSnapshot | undefined) {
    if (!snapshot) return;
    for (const member of snapshot.members) {
      this.members.set(member.id, { ...member });
    }
    this.game = snapshot.game ? Game.fromSave(snapshot.game) : null;
  }

  protected snapshot(): TableSnapshot {
    return {
      members: [...this.members.values()],
      game: this.game ? this.game.toSave() : null,
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

  override webSocketMessage(ws: WebSocket, raw: string | ArrayBuffer) {
    let message: ClientMessage;
    try {
      const text = typeof raw === 'string' ? raw : new TextDecoder().decode(raw);
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

  /** Chat is a pure pass-through — not game state, so it doesn't touch the
   *  engine or persistence. Fan out to everyone at the table (lobby or play). */
  private handleChat(playerId: PlayerId, text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;
    const name = this.members.get(playerId)?.name ?? playerId;
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
    const existing = this.members.get(playerId);
    if (existing) {
      existing.name = name; // reconnect / rename
    } else {
      this.members.set(playerId, { id: playerId, name, character: null });
    }
    this.persist();

    if (this.game) {
      if (this.game.hasPlayer(playerId)) {
        this.send(ws, { type: 'view', view: this.viewFor(playerId) });
        // Re-describe the current room
        this.send(ws, {
          type: 'events',
          from: playerId,
          events: this.game.resumeEvents(playerId),
        });
      } else {
        this.send(ws, { type: 'error', message: 'This game has already begun.' });
      }
    } else {
      this.broadcastLobby();
    }
  }

  private handleSetCharacter(playerId: PlayerId, character: PlayerSave) {
    if (this.game) {
      this.sendError(playerId, 'The game has already begun.');
      return;
    }
    const member = this.members.get(playerId);
    if (!member) return;
    member.character = character;
    this.persist();
    this.broadcastLobby();
  }

  private handleStart() {
    if (this.game) return; // already underway

    const members = [...this.members.values()];
    // Wait for everyone: don't start until every member has readied a character.
    if (members.length === 0 || members.some((m) => !m.character)) return;

    const game = new Game({ rng: defaultRandomSource });
    for (const member of members) {
      game.addPlayer(member.id, deserializePlayer(member.character!));
    }

    this.game = game;
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

  private requireSeated(playerId: PlayerId) {
    if (!this.game) {
      this.sendError(playerId, 'The game has not started yet.');
      return null;
    }
    if (!this.game.hasPlayer(playerId)) {
      this.sendError(playerId, 'You are not playing in this game.');
      return null;
    }
    return this.game;
  }

  /**
   * Deliver the results of one player's turn: the actor sees everything that
   * happened; everyone else sees only the broadcast-flagged events (attributed to
   * the actor). Every connected player gets a refreshed view afterward.
   */
  private fanOut(result: StepResult) {
    const broadcast = result.events.filter((event) => event.broadcast);
    for (const ws of this.ctx.getWebSockets()) {
      const playerId = this.playerIdOf(ws);
      if (!playerId || !this.game?.hasPlayer(playerId)) continue;
      if (playerId === result.playerId) {
        this.send(ws, {
          type: 'events',
          from: result.playerId,
          events: result.events,
        });
      } else if (broadcast.length) {
        this.send(ws, {
          type: 'events',
          from: result.playerId,
          events: broadcast,
        });
      }
      this.send(ws, { type: 'view', view: this.viewFor(playerId) });
    }
  }

  // --- views & sending ------------------------------------------------------

  private viewFor(playerId: PlayerId): PlayerView {
    const game = this.game!;
    return {
      self: serializePlayer(game.getPlayer(playerId)),
      mode: game.mode(playerId),
      map: game.mapView(playerId),
      treasuresFound: game.treasuresFound.size,
      ended: game.endMode,
      party: game.playerIds.map((id) => ({
        id,
        name: this.members.get(id)?.name ?? id,
        alive: game.getPlayer(id).hp > 0,
      })),
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
      const playerId = this.playerIdOf(ws);
      if (playerId && this.game?.hasPlayer(playerId)) {
        this.send(ws, { type: 'view', view: this.viewFor(playerId) });
      }
    }
  }

  private broadcastLobby() {
    const state: LobbyState = {
      members: [...this.members.values()].map((member) => ({
        id: member.id,
        name: member.name,
        ready: member.character !== null,
      })),
    };
    for (const ws of this.ctx.getWebSockets()) {
      this.send(ws, { type: 'lobby', state });
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

import { RoomObject } from './RoomObject.js';

export interface Env {
  ROOM: DurableObjectNamespace;
}

export default {
  fetch(request: Request, env: Env) {
    const code = new URL(request.url).pathname.replace(/^\/+|\/+$/g, '');
    if (!code) {
      return new Response('Room code required.', { status: 400 });
    }
    const id = env.ROOM.idFromName(code);
    return env.ROOM.get(id).fetch(request);
  },
} satisfies ExportedHandler<Env>;

export { RoomObject };

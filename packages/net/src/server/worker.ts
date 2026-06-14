import { TableObject } from './TableObject.js';

export interface Env {
  TABLE: DurableObjectNamespace;
  ASSETS: Fetcher;
}

export default {
  fetch(request: Request, env: Env) {
    const url = new URL(request.url);
    // A table's WebSocket lives at /ws/<code> → its Durable Object.
    if (url.pathname.startsWith('/ws/')) {
      const code = url.pathname.slice('/ws/'.length).replace(/\/+$/, '');
      if (!code) {
        return new Response('Table code required.', { status: 400 });
      }
      const id = env.TABLE.idFromName(code);
      return env.TABLE.get(id).fetch(request);
    }
    // Everything else is the static SPA (single-page-application fallback
    // serves index.html for client routes like /play/<code>).
    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;

export { TableObject };

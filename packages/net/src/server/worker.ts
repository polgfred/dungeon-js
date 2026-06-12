import { TableObject } from './TableObject.js';

export interface Env {
  TABLE: DurableObjectNamespace;
}

export default {
  fetch(request: Request, env: Env) {
    const code = new URL(request.url).pathname.replace(/^\/+|\/+$/g, '');
    if (!code) {
      return new Response('Table code required.', { status: 400 });
    }
    const id = env.TABLE.idFromName(code);
    return env.TABLE.get(id).fetch(request);
  },
} satisfies ExportedHandler<Env>;

export { TableObject };

/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly COMMIT_SHA: string;
  readonly COMMIT_UTC: string;
  /** WebSocket origin of the table worker, e.g. wss://dod.example.com. Dev defaults to localhost:8787. */
  readonly VITE_WS_BASE?: string;
}

declare module '*.png' {
  const src: string;
  export default src;
}

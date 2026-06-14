/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly COMMIT_SHA: string;
  readonly COMMIT_UTC: string;
}

declare module '*.png' {
  const src: string;
  export default src;
}

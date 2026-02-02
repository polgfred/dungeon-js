/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_BUILD_COMMIT_HASH: string;
  readonly VITE_BUILD_TIMESTAMP: string;
}

declare module '*.png' {
  const src: string;
  export default src;
}

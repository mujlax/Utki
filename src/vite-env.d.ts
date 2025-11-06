/// <reference types="vite/client" />

declare module 'canvas-confetti' {
  interface Options {
    particleCount?: number
    spread?: number
    origin?: { x?: number; y?: number }
    scalar?: number
  }
  function confetti(options?: Options): Promise<null>
  export default confetti
}

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string
  readonly NEXT_PUBLIC_APP_NAME?: string
  readonly DEV?: boolean
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

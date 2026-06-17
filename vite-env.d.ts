/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

// Allow `?url` imports (e.g. the pdf.js worker) to be typed as a string URL.
declare module '*?url' {
  const src: string;
  export default src;
}

// Environment variables
interface ImportMetaEnv {
  readonly VITE_ADMIN_PASSWORD: string;
  readonly VITE_CHAT_FORM_TOKEN: string;
  readonly VITE_ALLOWED_ORIGINS: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

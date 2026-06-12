/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

// Allow `?url` imports (e.g. the pdf.js worker) to be typed as a string URL.
declare module '*?url' {
  const src: string;
  export default src;
}

/// <reference types="vite/client" />

/** Meta Pixel (fbevents.js) */
declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}
export {};

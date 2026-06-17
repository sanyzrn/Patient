import React from 'react';
import ReactDOM from 'react-dom/client';
import '@fontsource/vazirmatn/300.css';
import '@fontsource/vazirmatn/400.css';
import '@fontsource/vazirmatn/500.css';
import '@fontsource/vazirmatn/700.css';
import '@fontsource/vazirmatn/900.css';
import './index.css';
import App from './App';

import { registerSW } from 'virtual:pwa-register';

let triggerUpdate: ((reloadPage?: boolean) => void) | undefined;

const updateSW = registerSW({
  onNeedRefresh() {
    // Notify App.tsx via custom event; the Toaster provider is already mounted by then.
    window.dispatchEvent(
      new CustomEvent('nafas-sw-update', {
        detail: { update: () => triggerUpdate?.(true) },
      })
    );
  },
  onOfflineReady() {},
});

triggerUpdate = updateSW;

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Could not find root element to mount to');

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@leela/design-system/themes/index.css';
import './globals.css';
import { ThemeProvider } from '@leela/design-system';
import { App } from './App';
import { initFirebase } from './lib/firebase';
import { initSentry } from './lib/sentry';

// Sentry: no-op silencioso quando VITE_SENTRY_DSN não está definido
initSentry();

// Firebase: Emulator em dev (VITE_USE_EMULATOR), fail-closed em produção
// sem VITE_FIREBASE_* — achado A3, review E00
initFirebase();

const rootElement = document.getElementById('root');
if (rootElement === null) {
  throw new Error('Root element #root not found in document');
}

createRoot(rootElement).render(
  <StrictMode>
    <ThemeProvider theme="brasa">
      <App />
    </ThemeProvider>
  </StrictMode>,
);

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@leela/design-system/themes/index.css';
import './globals.css';
import { ThemeProvider } from '@leela/design-system';
import { App } from './App';
import { AppErrorBoundary } from './routes/_system/AppErrorBoundary';
import { initFirebase } from './lib/firebase';
import { initSentry } from './lib/sentry';
import { initPreviewAutologin } from './lib/preview-autologin';

// Sentry: no-op silencioso quando VITE_SENTRY_DSN não está definido
initSentry();

// Firebase: Emulator em dev (VITE_USE_EMULATOR), fail-closed em produção
// sem VITE_FIREBASE_* — achado A3, review E00
initFirebase();

// Auto-login do preview local: no-op absoluto a menos que
// VITE_PREVIEW_AUTOLOGIN === 'true' (ligado só pelo preview.sh). Ver
// lib/preview-autologin.ts e PREVIEW.md.
initPreviewAutologin();

const rootElement = document.getElementById('root');
if (rootElement === null) {
  throw new Error('Root element #root not found in document');
}

createRoot(rootElement).render(
  <StrictMode>
    <ThemeProvider theme="brasa">
      {/* Boundary RAIZ (fullscreen): erro fora de qualquer rota / no RootShell.
          Dentro do ThemeProvider p/ os tokens pintarem a tela de erro. E07·T4. */}
      <AppErrorBoundary layout="fullscreen">
        <App />
      </AppErrorBoundary>
    </ThemeProvider>
  </StrictMode>,
);

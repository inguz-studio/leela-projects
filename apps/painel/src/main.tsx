import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@leela/design-system/themes/index.css';
import './globals.css';
import { ThemeProvider } from '@leela/design-system';
import { App } from './App';

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

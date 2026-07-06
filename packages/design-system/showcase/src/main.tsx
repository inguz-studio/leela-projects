import React from 'react';
import { createRoot } from 'react-dom/client';
import { ThemeProvider, ToastProvider, TooltipProvider } from '@leela/design-system';
import { App } from './App';
import './showcase.css';

const container = document.getElementById('root');
if (!container) {
  throw new Error('Elemento #root não encontrado no index.html.');
}

createRoot(container).render(
  <React.StrictMode>
    <ThemeProvider>
      <TooltipProvider>
        <ToastProvider>
          <App />
        </ToastProvider>
      </TooltipProvider>
    </ThemeProvider>
  </React.StrictMode>,
);

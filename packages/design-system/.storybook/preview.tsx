import * as React from 'react';
import type { Decorator, Preview } from '@storybook/react';
import './storybook.css';

/**
 * Decorator de tema: aplica `data-theme` no <html> (necessário para portais
 * Radix, que renderizam fora do wrapper) e num wrapper local com a surface
 * base do tema. Não usa ThemeProvider aqui para o toggle da toolbar não
 * disputar com a preferência persistida em localStorage.
 */
const withTheme: Decorator = (Story, context) => {
  const theme = (context.globals['theme'] as string | undefined) ?? 'brasa';

  React.useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  return (
    <div
      data-theme={theme}
      className="bg-[var(--surface-base)] text-[var(--text-primary)] font-[family-name:var(--font-family-ui)] p-[var(--spacing-6)] min-h-[var(--header-height)]"
    >
      <Story />
    </div>
  );
};

const preview: Preview = {
  globalTypes: {
    theme: {
      description: 'Tema do design system',
      toolbar: {
        title: 'Tema',
        icon: 'paintbrush',
        items: [
          { value: 'brasa', title: 'Brasa (#FF450C · Exo 2)' },
          { value: 'leela', title: 'Leela (Oxblood/Lima)' },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: {
    theme: 'brasa',
  },
  decorators: [withTheme],
  parameters: {
    layout: 'padded',
    backgrounds: { disable: true },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
};

export default preview;

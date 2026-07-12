import type { Config } from 'tailwindcss';
import leelaPreset from '@leela/design-system/tailwind-preset';

// Espelha o consumo do @leela/design-system em apps/painel (aceite S1200):
// o preset é a ÚNICA fonte de tokens (cores/spacing/radius/motion) — nenhum
// token é redefinido localmente. O `content` inclui o src do DS para que as
// classes usadas pelos componentes do DS (renderizados como leaves aqui)
// entrem no bundle CSS da landing.
const config: Config = {
  presets: [leelaPreset as Config],
  // O tema público é fixo em `leela` (data-theme no <html>); o seletor de dark
  // do preset (brasa) não se aplica, mas mantemos a convenção declarada.
  darkMode: ['selector', '[data-theme="brasa"]'],
  content: [
    './app/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    '../../packages/design-system/src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};

export default config;

import type { Config } from 'tailwindcss';
import leelaPreset from '@leela/design-system/tailwind-preset';

const config: Config = {
  presets: [leelaPreset as Config],
  darkMode: ['selector', '[data-theme="brasa"]'],
  content: [
    './index.html',
    './src/**/*.{ts,tsx}',
    '../../packages/design-system/src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      // -----------------------------------------------------------------
      // Reanimação escopada por filtro (REFACTOR item 10).
      //
      // DOIS nomes de keyframe IDÊNTICOS de propósito. Trocar o `animation-name`
      // é o que faz o browser rodar a animação de novo; um contador global que
      // remonta a árvore reanimaria a tela inteira a cada clique (era o
      // comportamento anterior, e lê como falha) e ainda mataria o estado dos
      // componentes. Alternando A↔B, só o gráfico cujo filtro mudou reanima, e
      // o nó nunca é remontado.
      //
      // O reveal é por `clip-path`, não por `scaleX`: escalar o wrapper
      // esmagaria os rótulos do eixo e o número na ponta da barra. O clip revela
      // da esquerda para a direita — a barra "cresce" e o número aterrissa no
      // fim, com a tipografia intacta.
      keyframes: {
        revelaGraficoA: {
          from: { clipPath: 'inset(0 100% 0 0)' },
          to: { clipPath: 'inset(0 0 0 0)' },
        },
        revelaGraficoB: {
          from: { clipPath: 'inset(0 100% 0 0)' },
          to: { clipPath: 'inset(0 0 0 0)' },
        },
      },
      animation: {
        // Duração/curva por TOKEN. O estudo pede 750ms cubic-bezier(.22,1,.36,1)
        // e nenhum token do DS carrega esses valores; inventá-los aqui seria
        // hardcode de motion numa app (a Conversa 1 fechou a parte de DS).
        // Fica com `--motion-duration-slow` + `--motion-easing-enter`, e o token
        // de 750ms está nomeado como impedimento no handoff.
        'revela-grafico-a':
          'revelaGraficoA var(--motion-duration-slow) var(--motion-easing-enter) both',
        'revela-grafico-b':
          'revelaGraficoB var(--motion-duration-slow) var(--motion-easing-enter) both',
      },
    },
  },
  plugins: [],
};

export default config;

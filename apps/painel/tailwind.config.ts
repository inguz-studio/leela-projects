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
        // §5 do estudo (HIFI-REC): entrada da tela em cascata — fade + subida
        // de 12px (token --motion-reveal-shift; o delay por seção vem de
        // --motion-stagger no consumidor).
        revelaSecao: {
          from: { opacity: '0', transform: 'translateY(var(--motion-reveal-shift))' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        // §5: barras crescem da esquerda (transform-origin no consumidor).
        cresceBarra: {
          from: { transform: 'scaleX(0)' },
          to: { transform: 'scaleX(1)' },
        },
        // §5: calendário/overlays trocam com fade + pop de 160ms.
        popV3: {
          from: { opacity: '0', transform: 'scale(0.98)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
      },
      animation: {
        // Duração/curva por TOKEN, sempre. A lane HIFI-REC pagou o impedimento
        // que a Conversa 2 nomeou: `--motion-bar-duration` (750ms) e
        // `--motion-bar-easing` (cubic-bezier(.22,1,.36,1)) agora existem no
        // DS — os gráficos usam o ritmo do estudo, não mais o duration-slow
        // de quebra-galho.
        'revela-grafico-a':
          'revelaGraficoA var(--motion-bar-duration) var(--motion-bar-easing) both',
        'revela-grafico-b':
          'revelaGraficoB var(--motion-bar-duration) var(--motion-bar-easing) both',
        'revela-secao':
          'revelaSecao var(--motion-duration-normal) var(--motion-easing-enter) both',
        'barra-v3': 'cresceBarra var(--motion-bar-duration) var(--motion-bar-easing) both',
        'pop-v3': 'popV3 var(--motion-pop-duration) var(--motion-easing-enter) both',
      },
    },
  },
  plugins: [],
};

export default config;

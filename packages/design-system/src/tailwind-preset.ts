/**
 * Tailwind CSS preset for @leela/design-system.
 *
 * In consuming apps (painel, landing):
 *   import leelaPreset from '@leela/design-system/tailwind-preset';
 *   export default { presets: [leelaPreset], content: [..., '../../packages/design-system/src/**\/*.{ts,tsx}'] }
 */

import type { Config } from 'tailwindcss';
import type { PluginAPI, PluginCreator } from 'tailwindcss/types/config';
import createPlugin from 'tailwindcss/plugin';
import animate from 'tailwindcss-animate';

/**
 * tailwindcss-animate registra os utilitários `duration`/`delay`/`ease`, que
 * COLIDEM com os de TRANSIÇÃO do core Tailwind (transition-duration,
 * transition-delay, transition-timing-function). O DS aplica
 * `duration-[var(--motion-*)]` e `ease-[var(--motion-*)]` em transições por
 * ~todos os componentes (Button, Input, Modal, Sidebar, Table, Toast…); com o
 * plugin cru essas classes viram ambíguas e o Tailwind as DESCARTA — a transição
 * some no app inteiro (provado no build do painel). Envolvemos o plugin para
 * registrar só os utilitários de ANIMAÇÃO que a esteira shadcn usa (animate-in/out,
 * fade/zoom/slide + keyframes) e descartamos duration/delay/ease: o core volta a
 * mandar nas transições e `animate-in` segue tokenizado por
 * animationDuration/TimingFunction.DEFAULT (abaixo). animate.config é repassado
 * para preservar keyframes e os defaults de animation* que fade/zoom/slide leem.
 */
const CORE_TRANSITION_UTILITIES = new Set(['duration', 'delay', 'ease']);
const animateBase = animate as unknown as {
  handler: PluginCreator;
  config?: Partial<Config>;
};

const animateAnimationsOnly = createPlugin((api: PluginAPI) => {
  const matchUtilities: PluginAPI['matchUtilities'] = (utilities, options) => {
    const kept = Object.fromEntries(
      Object.entries(utilities).filter(([name]) => !CORE_TRANSITION_UTILITIES.has(name)),
    ) as typeof utilities;
    if (Object.keys(kept).length > 0) api.matchUtilities(kept, options);
  };
  animateBase.handler({ ...api, matchUtilities });
}, animateBase.config);

const leelaPreset: Partial<Config> = {
  plugins: [animateAnimationsOnly],
  theme: {
    // Breakpoints DECLARADOS explicitamente (LEELA-RESP-M1-T1): o DS não herda
    // os defaults implícitos do Tailwind — a escala responsiva é decisão do
    // sistema, não do framework. Os valores coincidem com a escala default do
    // Tailwind (zero regressão nos usos `sm:`/`md:` já existentes), mas agora
    // são CONTRATO versionado do preset.
    //
    // `lg` (1024px) é o PONTO DE COLAPSO DO SHELL: acima dele o AppShell mostra
    // o rail fixo da Sidebar (fidelidade desktop 1440 intocada, mockup min-width
    // 1280); abaixo dele o rail some e a Sidebar vira drawer off-canvas acionado
    // por hambúrguer (alvo mobile real 390×844). Escolhido lg porque com o rail
    // de 240px um viewport <1024px deixa <784px de conteúdo — abaixo do
    // min-width 1280 do mockup, portanto fora da faixa de fidelidade desktop.
    screens: {
      sm: '640px',
      md: '768px',
      lg: '1024px',
      xl: '1280px',
      '2xl': '1536px',
    },
    extend: {
      colors: {
        // Surfaces
        'surface-base':    'var(--surface-base)',
        'surface-raised':  'var(--surface-raised)',
        'surface-overlay': 'var(--surface-overlay)',
        'surface-high':    'var(--surface-high)',
        'surface-sunken':  'var(--surface-sunken)',

        // Text
        'text-primary':   'var(--text-primary)',
        'text-secondary': 'var(--text-secondary)',
        'text-tertiary':  'var(--text-tertiary)',
        'text-disabled':  'var(--text-disabled)',
        'text-brand':     'var(--text-brand)',
        'text-danger':    'var(--text-danger)',
        'text-success':   'var(--text-success)',

        // Action
        'action-primary':            'var(--action-primary)',
        'action-primary-hover':      'var(--action-primary-hover)',
        'action-primary-pressed':    'var(--action-primary-pressed)',
        'action-primary-disabled':   'var(--action-primary-disabled)',
        'action-primary-fg':         'var(--action-primary-fg)',
        'action-secondary':          'var(--action-secondary)',
        'action-secondary-hover':    'var(--action-secondary-hover)',
        'action-secondary-fg':       'var(--action-secondary-fg)',
        'action-ghost-hover':        'var(--action-ghost-hover)',
        'action-ghost-fg':           'var(--action-ghost-fg)',
        'action-destructive':        'var(--action-destructive)',
        'action-destructive-hover':  'var(--action-destructive-hover)',
        'action-destructive-pressed':'var(--action-destructive-pressed)',
        'action-destructive-fg':     'var(--action-destructive-fg)',

        // Border
        'border-subtle':  'var(--border-subtle)',
        'border-default': 'var(--border-default)',
        'border-strong':  'var(--border-strong)',
        'border-brand':   'var(--border-brand)',
        'border-focus':   'var(--border-focus)',
        'border-danger':  'var(--border-danger)',

        // shadcn/ui bridge — aliases gerados pelo pipeline (tokens/shadcn.json).
        // Valores são var() diretos (nossas vars resolvem a hex), NUNCA hsl(var()).
        // Componentes shadcn stock (bg-popover, text-muted-foreground, ring-ring…)
        // nascem brasa/leela por estas entradas. Modificadores de alpha (bg-x/80)
        // não funcionam com var() hex — adaptar para token dedicado.
        border:     'var(--border)',
        input:      'var(--input)',
        ring:       'var(--ring)',
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        primary:     { DEFAULT: 'var(--primary)',     foreground: 'var(--primary-foreground)' },
        secondary:   { DEFAULT: 'var(--secondary)',   foreground: 'var(--secondary-foreground)' },
        destructive: { DEFAULT: 'var(--destructive)', foreground: 'var(--destructive-foreground)' },
        muted:       { DEFAULT: 'var(--muted)',       foreground: 'var(--muted-foreground)' },
        accent:      { DEFAULT: 'var(--accent)',      foreground: 'var(--accent-foreground)' },
        popover:     { DEFAULT: 'var(--popover)',     foreground: 'var(--popover-foreground)' },
        card:        { DEFAULT: 'var(--card)',        foreground: 'var(--card-foreground)' },

        // Feedback
        'feedback-success':         'var(--feedback-success)',
        'feedback-success-fg':      'var(--feedback-success-fg)',
        'feedback-success-surface': 'var(--feedback-success-surface)',
        'feedback-danger':          'var(--feedback-danger)',
        'feedback-danger-fg':       'var(--feedback-danger-fg)',
        'feedback-danger-surface':  'var(--feedback-danger-surface)',
        'feedback-warning':         'var(--feedback-warning)',
        'feedback-warning-fg':      'var(--feedback-warning-fg)',
        'feedback-warning-surface': 'var(--feedback-warning-surface)',
        'feedback-heroico':         'var(--feedback-heroico)',
        'feedback-heroico-fg':      'var(--feedback-heroico-fg)',
        'feedback-heroico-surface': 'var(--feedback-heroico-surface)',
        // info: alias de compatibilidade (Toast variant 'info') — no brasa
        // resolve para a família heroico (rosa); azul só existe no tema leela.
        'feedback-info':            'var(--feedback-info)',
        'feedback-info-fg':         'var(--feedback-info-fg)',
        'feedback-info-surface':    'var(--feedback-info-surface)',
      },
      fontFamily: {
        display: ['var(--font-family-display)'],
        ui:      ['var(--font-family-ui)'],
        mono:    ['var(--font-family-mono)'],
      },
      borderRadius: {
        'ds-none': 'var(--radius-none)',
        'ds-sm':   'var(--radius-sm)',
        'ds-md':   'var(--radius-md)',
        'ds-lg':   'var(--radius-lg)',
        'ds-xl':   'var(--radius-xl)',
        'ds-pill': 'var(--radius-pill)',
        // shadcn/ui bridge — convenção stock: lg = --radius (alias de --radius-lg
        // do brasa desde o patch de congruência 2026-07-06: cards do mockup são
        // 12px), md/sm derivam por calc com offsets ajustados para cair NOS
        // degraus da escala: md = 12-4 = 8px (menus do mockup), sm = 12-6 = 6px
        // (= radius-sm, itens de menu). Sobrescreve rounded-{sm,md,lg} default
        // do Tailwind (nenhum uso bare no monorepo na adoção — auditado 2026-07-05).
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 4px)',
        sm: 'calc(var(--radius) - 6px)',
      },
      boxShadow: {
        'elev-0':     'var(--elevation-0)',
        'elev-1':     'var(--elevation-1)',
        'elev-2':     'var(--elevation-2)',
        'elev-3':     'var(--elevation-3)',
        'elev-brand': 'var(--elevation-brand)',
      },
      transitionDuration: {
        fast:   'var(--motion-duration-fast)',
        normal: 'var(--motion-duration-normal)',
        slow:   'var(--motion-duration-slow)',
      },
      transitionTimingFunction: {
        'ds-default': 'var(--motion-easing-default)',
        'ds-enter':   'var(--motion-easing-enter)',
        'ds-exit':    'var(--motion-easing-exit)',
      },
      // Motion para tailwindcss-animate (animate-in/out). O plugin lê
      // animationDuration.DEFAULT em .animate-in/.animate-out; herda de transition*
      // se não sobrescrito (traria a duração/easing crus, hardcoded, do core
      // Tailwind). Aqui os DEFAULT são tokenizados para que `animate-in` sem
      // modificador rode em var(--motion-duration-fast) + var(--motion-easing-default).
      animationDuration: {
        DEFAULT: 'var(--motion-duration-fast)',
        fast:    'var(--motion-duration-fast)',
        normal:  'var(--motion-duration-normal)',
        slow:    'var(--motion-duration-slow)',
      },
      animationTimingFunction: {
        DEFAULT:    'var(--motion-easing-default)',
        'ds-enter': 'var(--motion-easing-enter)',
        'ds-exit':  'var(--motion-easing-exit)',
      },
    },
  },
};

export default leelaPreset;

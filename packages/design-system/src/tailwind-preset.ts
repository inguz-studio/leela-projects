/**
 * Tailwind CSS preset for @leela/design-system.
 *
 * In consuming apps (painel, landing):
 *   import leelaPreset from '@leela/design-system/tailwind-preset';
 *   export default { presets: [leelaPreset], content: [..., '../../packages/design-system/src/**\/*.{ts,tsx}'] }
 */

import type { Config } from 'tailwindcss';

const leelaPreset: Partial<Config> = {
  theme: {
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
    },
  },
};

export default leelaPreset;

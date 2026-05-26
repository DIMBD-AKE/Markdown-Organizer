import type { Config } from 'tailwindcss'

export default {
  content: ['./src/renderer/src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      // Theme-sensitive colors (base, mantle, crust, surface0) are CSS variables
      // so that .theme-dark / .theme-black classes on the root div take effect.
      // All other Catppuccin Mocha colors are static across themes.
      colors: {
        // Theme-sensitive — read from CSS variables set by .theme-* class
        base:     'var(--color-base)',
        mantle:   'var(--color-mantle)',
        crust:    'var(--color-crust)',
        surface0: 'var(--color-surface0)',
        // Accent — primary interactive color (DESIGN.md: Amber)
        amber:    '#f5c05a',
        // Static across dark/light themes
        surface1: '#45475a',
        overlay0: '#6c7086',
        text:     '#cdd6f4',
        subtext0: '#a6adc8',
        lavender: '#b4befe',
        mauve:    '#cba6f7',
        blue:     '#89b4fa',
        green:    '#a6e3a1',
        yellow:   '#f9e2af',
        red:      '#f38ba8',
        teal:     '#94e2d5'
      },
      fontFamily: {
        // UI chrome, navigation, labels (DESIGN.md: Geist)
        sans: ['Geist', 'system-ui', 'sans-serif'],
        // Document body prose (DESIGN.md: Literata variable)
        serif: ['Literata Variable', 'Literata', 'Georgia', 'serif'],
        // Code blocks — Shiki renders these; also used for panel headers
        mono: ['JetBrains Mono', 'Menlo', 'monospace'],
      },
      typography: {
        DEFAULT: {
          css: {
            '--tw-prose-body':          'var(--color-text)',
            '--tw-prose-headings':      'var(--color-text)',
            '--tw-prose-lead':          'var(--color-subtext0)',
            '--tw-prose-links':         'var(--color-blue)',
            '--tw-prose-bold':          'var(--color-text)',
            '--tw-prose-counters':      'var(--color-subtext0)',
            '--tw-prose-bullets':       'var(--color-overlay0)',
            '--tw-prose-hr':            'var(--color-surface0)',
            '--tw-prose-quotes':        'var(--color-subtext0)',
            '--tw-prose-quote-borders': 'var(--color-surface0)',
            '--tw-prose-captions':      'var(--color-subtext0)',
            '--tw-prose-code':          'var(--color-mauve)',
            '--tw-prose-pre-code':      'var(--color-text)',
            '--tw-prose-pre-bg':        'var(--color-mantle)',
            '--tw-prose-th-borders':    'var(--color-surface0)',
            '--tw-prose-td-borders':    'var(--color-surface0)',
            maxWidth: 'none',
          }
        }
      }
    }
  },
  plugins: [require('@tailwindcss/typography')]
} satisfies Config

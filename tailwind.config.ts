import type { Config } from 'tailwindcss'

export default {
  content: ['./src/renderer/src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      // All colors reference CSS variables defined in index.css.
      // This makes every color theme-sensitive — dark / black / latte
      // are handled by the .theme-* class on the root div.
      colors: {
        base:       'var(--color-base)',
        mantle:     'var(--color-mantle)',
        crust:      'var(--color-crust)',
        surface0:   'var(--color-surface0)',
        surface1:   'var(--color-surface1)',
        overlay0:   'var(--color-overlay0)',
        text:       'var(--color-text)',
        subtext0:   'var(--color-subtext0)',
        lavender:   'var(--color-lavender)',
        mauve:      'var(--color-mauve)',
        blue:       'var(--color-blue)',
        green:      'var(--color-green)',
        yellow:     'var(--color-yellow)',
        red:        'var(--color-red)',
        teal:       'var(--color-teal)',
        amber:      'var(--color-amber)',
      },
      fontFamily: {
        sans:  ['Geist', 'system-ui', 'sans-serif'],
        serif: ['Literata Variable', 'Literata', 'Georgia', 'serif'],
        mono:  ['JetBrains Mono', 'Menlo', 'monospace'],
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
            '--tw-prose-code':          'var(--color-blue)',
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

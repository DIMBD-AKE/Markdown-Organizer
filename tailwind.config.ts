import type { Config } from 'tailwindcss'

export default {
  content: ['./src/renderer/src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        base:     '#1e1e2e',
        mantle:   '#181825',
        crust:    '#11111b',
        surface0: '#313244',
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
      }
    }
  }
} satisfies Config

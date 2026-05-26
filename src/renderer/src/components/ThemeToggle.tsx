import { useUiStore } from '../stores/uiStore'

const ICONS: Record<string, string> = {
  dark:  '◐',
  black: '●',
  latte: '○',
}

const LABELS: Record<string, string> = {
  dark:  '다크 (Mocha)',
  black: '블랙 (OLED)',
  latte: '라이트 (Latte)',
}

export default function ThemeToggle() {
  const theme = useUiStore((s) => s.theme)
  const setTheme = useUiStore((s) => s.setTheme)

  function toggle() {
    const next = theme === 'dark' ? 'black' : theme === 'black' ? 'latte' : 'dark'
    setTheme(next)
    window.api.setSetting('theme', next)
  }

  return (
    <button
      onClick={toggle}
      title={`테마: ${LABELS[theme]} (클릭으로 전환)`}
      className="w-8 h-8 rounded-md flex items-center justify-center text-overlay0
        hover:text-text hover:bg-surface0/50 transition-colors text-sm"
    >
      {ICONS[theme]}
    </button>
  )
}

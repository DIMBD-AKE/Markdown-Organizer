import { useUiStore } from '../stores/uiStore'

export default function ThemeToggle() {
  const theme = useUiStore((s) => s.theme)
  const setTheme = useUiStore((s) => s.setTheme)

  function toggle() {
    const next = theme === 'dark' ? 'black' : 'dark'
    setTheme(next)
    window.api.setSetting('theme', next)
  }

  return (
    <button
      onClick={toggle}
      title={`현재: ${theme} 테마`}
      className="w-9 h-9 rounded-lg flex items-center justify-center text-overlay0 hover:text-text hover:bg-surface0/50 text-sm"
    >
      {theme === 'dark' ? '◐' : '●'}
    </button>
  )
}

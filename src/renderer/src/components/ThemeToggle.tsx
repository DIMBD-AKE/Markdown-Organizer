import { useUiStore } from '../stores/uiStore'

export default function ThemeToggle() {
  const theme = useUiStore((s) => s.theme)
  const setTheme = useUiStore((s) => s.setTheme)

  function toggle() {
    const next = theme === 'dark' ? 'black' : theme === 'black' ? 'latte' : 'dark'
    setTheme(next)
    window.api.setSetting('theme', next)
  }

  const icon = theme === 'dark' ? '◐' : theme === 'black' ? '●' : '○'
  const label = theme === 'dark' ? '다크' : theme === 'black' ? '블랙' : '라이트'

  return (
    <button
      onClick={toggle}
      title={`현재: ${label} 테마 (클릭으로 변경)`}
      className="w-9 h-9 rounded-lg flex items-center justify-center text-overlay0 hover:text-text hover:bg-surface0/50 text-sm"
    >
      {icon}
    </button>
  )
}

import { useUiStore } from '../../stores/uiStore'

const THEMES: Array<{ id: 'dark' | 'black' | 'latte'; label: string; bg: string; text: string }> = [
  { id: 'dark',  label: 'Mocha',  bg: '#1e1e2e', text: '#cdd6f4' },
  { id: 'black', label: 'Black',  bg: '#000000', text: '#cdd6f4' },
  { id: 'latte', label: 'Latte',  bg: '#eff1f5', text: '#4c4f69' },
]

export default function SettingsPanel() {
  const theme = useUiStore((s) => s.theme)
  const setTheme = useUiStore((s) => s.setTheme)

  function handleTheme(id: 'dark' | 'black' | 'latte') {
    setTheme(id)
    window.api.setSetting('theme', id)
  }

  return (
    <div
      className="flex flex-col w-full h-full bg-mantle border-r border-surface0 overflow-hidden"
    >
      <div className="px-3 py-2 border-b border-surface0">
        <div className="text-[10px] font-semibold text-overlay0 uppercase tracking-widest">
          설정
        </div>
      </div>

      <div className="p-3 space-y-4 overflow-y-auto">
        <div>
          <div className="text-[10px] text-overlay0 uppercase tracking-widest mb-2">테마</div>
          <div className="space-y-1">
            {THEMES.map((t) => (
              <button
                key={t.id}
                onClick={() => handleTheme(t.id)}
                className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm transition-colors
                  ${theme === t.id ? 'bg-surface0 text-text' : 'text-subtext0 hover:bg-surface0/40 hover:text-text'}`}
              >
                {/* Color swatch */}
                <span
                  className="w-4 h-4 rounded-sm border border-surface0 flex-shrink-0"
                  style={{ background: t.bg }}
                />
                <span>{t.label}</span>
                {theme === t.id && (
                  <span className="ml-auto text-amber text-xs">✓</span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

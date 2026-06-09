import { useUiStore, type Theme } from '../../stores/uiStore'
import { useState, useEffect } from 'react'

const THEMES: Array<{ id: Theme; label: string; bg: string; text: string }> = [
  { id: 'dark',   label: 'Mocha',  bg: '#1e1e2e', text: '#cdd6f4' },
  { id: 'black',  label: 'Black',  bg: '#000000', text: '#cdd6f4' },
  { id: 'latte',  label: 'Latte',  bg: '#eff1f5', text: '#4c4f69' },
  { id: 'claude', label: 'Claude', bg: '#faf9f5', text: '#141413' },
  { id: 'codex',  label: 'Codex',  bg: '#202123', text: '#f5f7fa' },
]

type UpdateStatus = 'idle' | 'checking' | 'available' | 'not-available' | 'downloading' | 'ready' | 'error'

export default function SettingsPanel() {
  const theme = useUiStore((s) => s.theme)
  const setTheme = useUiStore((s) => s.setTheme)

  const [updateStatus, setUpdateStatus] = useState<UpdateStatus>('idle')
  const [updateError, setUpdateError] = useState<string>('')
  const [appVersion, setAppVersion] = useState<string>('')
  const [latestVersion, setLatestVersion] = useState<string>('')

  useEffect(() => {
    window.api.getAppVersion?.().then(setAppVersion)
  }, [])

  useEffect(() => {
    const unsubs = [
      window.api.onUpdateAvailable?.((info: unknown) => {
        setUpdateStatus('available')
        const v = (info as { version?: string } | null)?.version
        if (v) setLatestVersion(v)
      }),
      window.api.onUpdateNotAvailable?.(() => setUpdateStatus('not-available')),
      window.api.onUpdateProgress?.(() => setUpdateStatus('downloading')),
      window.api.onUpdateDownloaded?.(() => setUpdateStatus('ready')),
      window.api.onUpdateError?.((msg: string) => { setUpdateStatus('error'); setUpdateError(msg) }),
    ]
    return () => unsubs.forEach((u) => u?.())
  }, [])

  function handleTheme(id: Theme) {
    setTheme(id)
    window.api.setSetting('theme', id)
  }

  async function handleCheckUpdate() {
    setUpdateStatus('checking')
    setUpdateError('')
    await window.api.checkForUpdates?.()
  }

  function handleInstallUpdate() {
    window.api.installUpdate?.()
  }

  const updateLabel: Record<UpdateStatus, string> = {
    idle: '업데이트 확인',
    checking: '확인 중...',
    available: '업데이트 발견',
    'not-available': '최신 버전',
    downloading: '다운로드 중...',
    ready: '재시작하여 설치',
    error: '오류 발생',
  }

  return (
    <div className="flex flex-col w-full h-full bg-mantle border-r border-surface0 overflow-hidden">
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

        <div>
          <div className="text-[10px] text-overlay0 uppercase tracking-widest mb-2">업데이트</div>
          <div className="flex items-center justify-between px-0.5 pb-2 text-[11px]">
            <span className="text-subtext0">현재 버전</span>
            <span className="text-text font-mono">v{appVersion || '—'}</span>
          </div>
          <button
            onClick={updateStatus === 'ready' ? handleInstallUpdate : handleCheckUpdate}
            disabled={updateStatus === 'checking' || updateStatus === 'available' || updateStatus === 'downloading'}
            className="w-full flex items-center justify-center px-2.5 py-2 rounded-md text-sm
              bg-surface0 text-text hover:bg-surface1 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {updateLabel[updateStatus]}
          </button>
          {updateStatus === 'not-available' && (
            <p className="text-[11px] text-subtext0 mt-1 text-center">최신 버전을 사용 중입니다</p>
          )}
          {(updateStatus === 'available' || updateStatus === 'downloading' || updateStatus === 'ready') && latestVersion && (
            <p className="text-[11px] text-amber mt-1 text-center">
              최신 버전 v{latestVersion} 사용 가능
            </p>
          )}
          {updateStatus === 'error' && (
            <p className="text-[11px] text-red mt-1 text-center truncate">{updateError}</p>
          )}
        </div>
      </div>
    </div>
  )
}

import { useUiStore, type SidebarTab } from '../../stores/uiStore'

interface Tab {
  id: SidebarTab
  label: string
  // Simple SVG-based icons to avoid emoji rendering inconsistencies
  icon: React.FC<{ className?: string }>
}

function FilesIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  )
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  )
}

function SettingsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  )
}

import React from 'react'

const TABS: Tab[] = [
  { id: 'files',    label: '문서',  icon: FilesIcon },
  { id: 'search',  label: '검색',  icon: SearchIcon },
  { id: 'settings', label: '설정', icon: SettingsIcon },
]

export default function Sidebar() {
  const sidebarTab = useUiStore((s) => s.sidebarTab)
  const setSidebarTab = useUiStore((s) => s.setSidebarTab)

  return (
    <aside className="w-12 flex flex-col items-center pt-2 pb-2 gap-1 bg-mantle border-r border-surface0 flex-shrink-0">
      {TABS.map(({ id, label, icon: Icon }) => {
        const active = sidebarTab === id
        return (
          <button
            key={id}
            title={label}
            onClick={() => setSidebarTab(id)}
            className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors
              ${active
                ? 'bg-surface0 text-amber'
                : 'text-overlay0 hover:text-text hover:bg-surface0/50'
              }`}
          >
            <Icon />
          </button>
        )
      })}
    </aside>
  )
}

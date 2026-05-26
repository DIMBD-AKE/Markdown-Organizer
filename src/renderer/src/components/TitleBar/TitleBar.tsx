import React, { useState } from 'react'
import { useProjectStore } from '../../stores/projectStore'
import { useFileTreeStore } from '../../stores/fileTreeStore'
import ThemeToggle from '../ThemeToggle'

// Electron-specific — not in React typings
const dragStyle = { WebkitAppRegion: 'drag' } as React.CSSProperties
const noDragStyle = { WebkitAppRegion: 'no-drag' } as React.CSSProperties

export default function TitleBar() {
  const { projects, activeProjectId, setActiveProject, addProject } = useProjectStore()
  const { setTree, setLoading } = useFileTreeStore()
  const [open, setOpen] = useState(false)
  const activeProject = projects.find((p) => p.id === activeProjectId)

  async function selectProject(id: string, path: string) {
    setActiveProject(id)
    window.api.setSetting('active_project_id', id)
    setLoading(true)
    try {
      const tree = await window.api.getFileTree(path)
      setTree(tree)
    } catch (err) {
      console.error('Failed to load project:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleAddProject() {
    try {
      const folderPath = await window.api.selectFolder()
      if (!folderPath) return
      const project = await window.api.addProject(folderPath)
      addProject(project)
      selectProject(project.id, project.path)
    } catch (err) {
      console.error('Failed to add project:', err)
    }
  }

  return (
    // Entire header is drag region; interactive elements override with no-drag
    <header
      style={dragStyle}
      className="h-10 flex-shrink-0 flex items-center bg-mantle border-b border-surface0"
    >
      {/* Traffic light clearance — macOS places buttons at x:12, ~70px wide */}
      <div className="w-[80px] flex-shrink-0" />

      {/* Project dropdown */}
      <div style={noDragStyle} className="relative">
        <button
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-sm transition-colors
            text-text hover:bg-surface0/60"
        >
          <span className="font-medium max-w-[200px] truncate">
            {activeProject?.name ?? '프로젝트 없음'}
          </span>
          <span className="text-overlay0 text-[10px] mt-0.5">▾</span>
        </button>

        {open && (
          <>
            {/* Click-away backdrop */}
            <div
              className="fixed inset-0 z-40"
              style={noDragStyle}
              onClick={() => setOpen(false)}
            />
            {/* Dropdown menu */}
            <div className="absolute top-full left-0 mt-1 z-50 min-w-[200px] overflow-hidden
              bg-mantle border border-surface0 rounded-lg shadow-xl">
              {projects.map((p) => (
                <button
                  key={p.id}
                  onClick={() => { selectProject(p.id, p.path); setOpen(false) }}
                  className={`w-full text-left px-4 py-2 text-sm transition-colors
                    ${p.id === activeProjectId
                      ? 'text-amber bg-surface0/40'
                      : 'text-text hover:bg-surface0/50'
                    }`}
                >
                  {p.name}
                </button>
              ))}
              {projects.length > 0 && <div className="border-t border-surface0" />}
              <button
                onClick={() => { handleAddProject(); setOpen(false) }}
                className="w-full text-left px-4 py-2 text-sm text-overlay0 hover:bg-surface0/50 transition-colors"
              >
                + 프로젝트 추가
              </button>
            </div>
          </>
        )}
      </div>

      <div className="flex-1" />

      {/* Right actions */}
      <div style={noDragStyle} className="flex items-center pr-3">
        <ThemeToggle />
      </div>
    </header>
  )
}

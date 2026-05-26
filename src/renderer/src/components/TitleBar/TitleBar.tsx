import React, { useState } from 'react'
import { useProjectStore } from '../../stores/projectStore'
import { useFileTreeStore } from '../../stores/fileTreeStore'
import ThemeToggle from '../ThemeToggle'
import type { ProjectType } from '../../types'

const dragStyle = { WebkitAppRegion: 'drag' } as React.CSSProperties
const noDragStyle = { WebkitAppRegion: 'no-drag' } as React.CSSProperties

const TYPE_LABEL: Partial<Record<ProjectType, string>> = {
  unity:       'Unity',
  unreal:      'Unreal',
  node:        'Node',
  rust:        'Rust',
  python:      'Python',
  'ai-research': 'AI',
  docs:        'Docs',
}

export default function TitleBar() {
  const { projects, activeProjectId, setActiveProject, addProject } = useProjectStore()
  const { setTree, setLoading } = useFileTreeStore()
  const [open, setOpen] = useState(false)
  const activeProject = projects.find((p) => p.id === activeProjectId)
  const activeTypeLabel = activeProject ? TYPE_LABEL[activeProject.type] : undefined

  async function selectProject(id: string, projPath: string) {
    setActiveProject(id)
    window.api.setSetting('active_project_id', id)
    setLoading(true)
    try {
      const tree = await window.api.getFileTree(projPath)
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
    <header
      style={dragStyle}
      className="h-10 flex-shrink-0 flex items-center bg-mantle border-b border-surface0"
    >
      {/* Traffic light clearance (~80px) */}
      <div className="w-[80px] flex-shrink-0" />

      {/* Project selector — button + type badge side by side */}
      <div style={noDragStyle} className="flex items-center gap-2">
        {/* Clickable dropdown trigger */}
        <button
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-sm transition-colors
            text-text hover:bg-surface0/60 relative"
        >
          <span className="font-medium max-w-[200px] truncate">
            {activeProject?.name ?? '프로젝트 없음'}
          </span>
          <span className="text-overlay0 text-[10px] mt-px">▾</span>

          {open && (
            <>
              <div
                className="fixed inset-0 z-40"
                style={noDragStyle}
                onClick={(e) => { e.stopPropagation(); setOpen(false) }}
              />
              <div className="absolute top-full left-0 mt-1 z-50 min-w-[210px] overflow-hidden
                bg-mantle border border-surface0 rounded-lg shadow-xl">
                {projects.map((p) => (
                  <button
                    key={p.id}
                    onClick={(e) => { e.stopPropagation(); selectProject(p.id, p.path); setOpen(false) }}
                    className={`w-full text-left px-4 py-2 text-sm flex items-center gap-2 transition-colors
                      ${p.id === activeProjectId
                        ? 'text-amber bg-surface0/40'
                        : 'text-text hover:bg-surface0/50'
                      }`}
                  >
                    <span className="flex-1 truncate">{p.name}</span>
                    {TYPE_LABEL[p.type] && (
                      <span className="text-[10px] text-overlay0 font-mono bg-surface0 px-1.5 py-0.5 rounded flex-shrink-0">
                        {TYPE_LABEL[p.type]}
                      </span>
                    )}
                  </button>
                ))}
                {projects.length > 0 && <div className="border-t border-surface0" />}
                <button
                  onClick={(e) => { e.stopPropagation(); handleAddProject(); setOpen(false) }}
                  className="w-full text-left px-4 py-2 text-sm text-overlay0 hover:bg-surface0/50 transition-colors"
                >
                  + 프로젝트 추가
                </button>
              </div>
            </>
          )}
        </button>

        {/* Type badge — outside the button, in the no-drag zone */}
        {activeTypeLabel && (
          <span className="text-[10px] text-overlay0 font-mono bg-surface0 px-1.5 py-0.5 rounded flex-shrink-0">
            {activeTypeLabel}
          </span>
        )}
      </div>

      <div className="flex-1" />

      <div style={noDragStyle} className="flex items-center pr-3">
        <ThemeToggle />
      </div>
    </header>
  )
}

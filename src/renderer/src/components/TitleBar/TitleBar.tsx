import React, { useState } from 'react'
import { useProjectStore } from '../../stores/projectStore'
import { useFileTreeStore } from '../../stores/fileTreeStore'
import { useViewerStore } from '../../stores/viewerStore'
import ThemeToggle from '../ThemeToggle'
import type { ProjectType } from '../../types'

const dragStyle = { WebkitAppRegion: 'drag' } as React.CSSProperties
const noDragStyle = { WebkitAppRegion: 'no-drag' } as React.CSSProperties

const TYPE_LABEL: Partial<Record<ProjectType, string>> = {
  unity:         'Unity',
  unreal:        'Unreal',
  node:          'Node',
  rust:          'Rust',
  python:        'Python',
  'ai-research': 'AI',
  docs:          'Docs',
  go:            'Go',
  java:          'Java',
  php:           'PHP',
  ruby:          'Ruby',
  dart:          'Dart',
  cpp:           'C++',
  csharp:        'C#',
}

export default function TitleBar() {
  const { projects, activeProjectId, setActiveProject, addProject, removeProject } = useProjectStore()
  const { setTree, setLoading } = useFileTreeStore()
  const [open, setOpen] = useState(false)
  const activeProject = projects.find((p) => p.id === activeProjectId)
  const activeTypeLabel = activeProject ? TYPE_LABEL[activeProject.type] : undefined

  async function selectProject(id: string, projPath: string) {
    useViewerStore.getState().clearForProjectSwitch()
    useFileTreeStore.getState().setSelectedFile(null)
    setActiveProject(id)
    window.api.setSetting('active_project_id', id)
    window.api.startWatcher(projPath)
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

  async function handleDeleteProject(e: React.MouseEvent, id: string) {
    e.stopPropagation()
    await window.api.removeProject(id)
    removeProject(id)

    if (id === activeProjectId) {
      useViewerStore.getState().clearForProjectSwitch()
      useFileTreeStore.getState().setTree(null)
      useFileTreeStore.getState().setSelectedFile(null)

      const remaining = projects.filter((p) => p.id !== id)
      if (remaining.length > 0) {
        selectProject(remaining[0].id, remaining[0].path)
      } else {
        setActiveProject(null)
        window.api.setSetting('active_project_id', '')
        window.api.startWatcher('')
      }
    }
  }

  function handleOpenInFinder() {
    if (activeProject) window.api.openPath(activeProject.path)
  }

  return (
    <header
      style={dragStyle}
      className="h-10 flex-shrink-0 flex items-center bg-mantle border-b border-surface0"
    >
      {/* Traffic light clearance (~80px) */}
      <div className="w-[80px] flex-shrink-0" />

      {/* Project selector */}
      <div style={noDragStyle} className="flex items-center gap-2">
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
              <div className="absolute top-full left-0 mt-1 z-50 min-w-[220px] overflow-hidden
                bg-mantle border border-surface0 rounded-lg shadow-xl">
                {projects.map((p) => (
                  <div
                    key={p.id}
                    className={`flex items-center group transition-colors
                      ${p.id === activeProjectId ? 'bg-surface0/40' : 'hover:bg-surface0/50'}`}
                  >
                    <button
                      onClick={(e) => { e.stopPropagation(); selectProject(p.id, p.path); setOpen(false) }}
                      className={`flex-1 text-left px-4 py-2 text-sm flex items-center gap-2
                        ${p.id === activeProjectId ? 'text-amber' : 'text-text'}`}
                    >
                      <span className="flex-1 truncate">{p.name}</span>
                      {TYPE_LABEL[p.type] && (
                        <span className="text-[10px] text-overlay0 font-mono bg-surface0 px-1.5 py-0.5 rounded flex-shrink-0">
                          {TYPE_LABEL[p.type]}
                        </span>
                      )}
                    </button>
                    {/* Delete button — appears on hover */}
                    <button
                      onClick={(e) => handleDeleteProject(e, p.id)}
                      title="프로젝트 삭제"
                      className="pr-3 pl-1 py-2 opacity-0 group-hover:opacity-100 text-overlay0
                        hover:text-red transition-all text-sm leading-none"
                    >
                      ×
                    </button>
                  </div>
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

        {activeProject?.frameworks && activeProject.frameworks.length > 0 ? (
          <div className="flex items-center gap-1">
            {activeProject.frameworks.slice(0, 3).map((fw) => (
              <span key={fw} className="text-[10px] text-overlay0 font-mono bg-surface0 px-1.5 py-0.5 rounded flex-shrink-0">
                {fw}
              </span>
            ))}
            {activeProject.frameworks.length > 3 && (
              <span className="text-[10px] text-overlay0 font-mono bg-surface0 px-1.5 py-0.5 rounded flex-shrink-0">
                +{activeProject.frameworks.length - 3}
              </span>
            )}
            {activeProject.confidence !== undefined && activeProject.confidence < 50 && (
              <span
                className="text-[10px] text-amber font-mono bg-surface0 px-1.5 py-0.5 rounded flex-shrink-0"
                title="낮은 신뢰도"
              >
                ?
              </span>
            )}
          </div>
        ) : activeTypeLabel ? (
          <span className="text-[10px] text-overlay0 font-mono bg-surface0 px-1.5 py-0.5 rounded flex-shrink-0">
            {activeTypeLabel}
          </span>
        ) : null}
      </div>

      <div className="flex-1" />

      <div style={noDragStyle} className="flex items-center gap-1 pr-3">
        {/* Open active project in Finder */}
        {activeProject && (
          <button
            onClick={handleOpenInFinder}
            title="Finder에서 열기"
            className="p-1.5 rounded text-overlay0 hover:text-text hover:bg-surface0/60 transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1.5 4A1.5 1.5 0 013 2.5h2.5l1 1.5H11A1.5 1.5 0 0112.5 5.5v5A1.5 1.5 0 0111 12H3A1.5 1.5 0 011.5 10.5V4z" />
            </svg>
          </button>
        )}
        <ThemeToggle />
      </div>
    </header>
  )
}

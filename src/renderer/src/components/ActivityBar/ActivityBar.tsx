import React from 'react'
import { useProjectStore } from '../../stores/projectStore'
import { useFileTreeStore } from '../../stores/fileTreeStore'
import ProjectIcon from './ProjectIcon'
import ThemeToggle from '../ThemeToggle'

// Electron-specific CSS property not in React typings
const dragStyle = { WebkitAppRegion: 'drag', pointerEvents: 'none' } as React.CSSProperties
const noDragStyle = { WebkitAppRegion: 'no-drag' } as React.CSSProperties

export default function ActivityBar() {
  const { projects, activeProjectId, setActiveProject } = useProjectStore()
  const { setTree, setLoading } = useFileTreeStore()

  async function handleAddProject() {
    try {
      const folderPath = await window.api.selectFolder()
      if (!folderPath) return
      const project = await window.api.addProject(folderPath)
      useProjectStore.getState().addProject(project)
      selectProject(project.id, project.path)
    } catch (err) {
      console.error('Failed to add project:', err)
    }
  }

  async function selectProject(id: string, path: string) {
    setActiveProject(id)
    window.api.setSetting('active_project_id', id)
    setLoading(true)
    try {
      const tree = await window.api.getFileTree(path)
      setTree(tree)
    } catch (err) {
      console.error('Failed to load file tree:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <aside className="w-12 flex flex-col items-center pb-2 gap-1 bg-mantle border-r border-surface0">
      {/* Drag zone for window — covers traffic light area (macOS: ~36px) */}
      <div style={dragStyle} className="w-full h-9 flex-shrink-0" />

      <div style={noDragStyle} className="flex flex-col items-center gap-1 flex-1 w-full overflow-hidden">
        {projects.map((p) => (
          <ProjectIcon
            key={p.id}
            icon={p.icon}
            name={p.name}
            isActive={p.id === activeProjectId}
            onClick={() => selectProject(p.id, p.path)}
          />
        ))}

        <div className="flex-1" />

        <ThemeToggle />

        <button
          title="프로젝트 추가"
          onClick={handleAddProject}
          className="w-9 h-9 rounded-lg flex items-center justify-center text-overlay0 hover:text-text hover:bg-surface0/50 text-xl transition-colors"
        >
          +
        </button>
      </div>
    </aside>
  )
}

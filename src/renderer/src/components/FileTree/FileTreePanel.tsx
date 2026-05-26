import { useProjectStore, activeProject } from '../../stores/projectStore'
import { useFileTreeStore } from '../../stores/fileTreeStore'
import FileTree from './FileTree'

export default function FileTreePanel() {
  const project = useProjectStore(activeProject)
  const { isLoading } = useFileTreeStore()

  if (!project) return null

  return (
    <div className="flex flex-col bg-mantle border-r border-surface0 overflow-hidden" style={{ width: 220 }}>
      <div className="px-3 py-2 border-b border-surface0">
        <div className="text-xs font-semibold text-mauve uppercase tracking-wider truncate">
          {project.name}
        </div>
        <div className="text-xs text-overlay0 mt-0.5">{project.type}</div>
      </div>
      {isLoading
        ? <div className="flex-1 flex items-center justify-center text-overlay0 text-xs">로딩 중...</div>
        : <FileTree />
      }
    </div>
  )
}

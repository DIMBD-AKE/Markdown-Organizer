import { useProjectStore } from '../../stores/projectStore'
import { useFileTreeStore } from '../../stores/fileTreeStore'
import ProjectIcon from './ProjectIcon'

export default function ActivityBar() {
  const { projects, activeProjectId, setActiveProject } = useProjectStore()
  const { setTree, setLoading } = useFileTreeStore()

  async function handleAddProject() {
    const folderPath = await window.api.selectFolder()
    if (!folderPath) return
    const project = await window.api.addProject(folderPath)
    useProjectStore.getState().addProject(project)
    selectProject(project.id, project.path)
  }

  async function selectProject(id: string, path: string) {
    setActiveProject(id)
    window.api.setSetting('active_project_id', id)
    setLoading(true)
    const tree = await window.api.getFileTree(path)
    setTree(tree)
    setLoading(false)
  }

  return (
    <aside className="w-12 flex flex-col items-center py-2 gap-1 bg-mantle border-r border-surface0">
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

      <button
        title="프로젝트 추가"
        onClick={handleAddProject}
        className="w-9 h-9 rounded-lg flex items-center justify-center text-overlay0 hover:text-text hover:bg-surface0/50 text-xl transition-colors"
      >
        +
      </button>
    </aside>
  )
}

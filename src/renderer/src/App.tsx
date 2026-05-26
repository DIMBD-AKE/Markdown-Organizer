import { useEffect } from 'react'
import { useProjectStore } from './stores/projectStore'
import { useUiStore } from './stores/uiStore'
import { useFileWatcher } from './hooks/useFileWatcher'
import ActivityBar from './components/ActivityBar/ActivityBar'
import FileTreePanel from './components/FileTree/FileTreePanel'
import DocumentViewer from './components/Viewer/DocumentViewer'

export default function App() {
  const setProjects = useProjectStore((s) => s.setProjects)
  const setActiveProject = useProjectStore((s) => s.setActiveProject)
  const setTheme = useUiStore((s) => s.setTheme)
  useFileWatcher()

  useEffect(() => {
    window.api.getAppState().then((state) => {
      setProjects(state.projects)
      setActiveProject(state.activeProjectId)
      setTheme(state.theme)
    })
  }, [setProjects, setActiveProject, setTheme])

  return (
    <div className="flex flex-col h-screen bg-base text-text select-none">
      <div className="flex flex-1 overflow-hidden">
        <ActivityBar />
        <FileTreePanel />
        <DocumentViewer />
        {/* TocPanel — Task 11에서 추가 */}
      </div>
    </div>
  )
}

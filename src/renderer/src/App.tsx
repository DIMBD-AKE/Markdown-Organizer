import { useEffect } from 'react'
import { useProjectStore } from './stores/projectStore'
import { useUiStore } from './stores/uiStore'
import ActivityBar from './components/ActivityBar/ActivityBar'

export default function App() {
  const setProjects = useProjectStore((s) => s.setProjects)
  const setActiveProject = useProjectStore((s) => s.setActiveProject)
  const setTheme = useUiStore((s) => s.setTheme)

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
        <div className="flex-1 flex items-center justify-center text-overlay0 text-sm">
          파일을 선택하세요
        </div>
      </div>
    </div>
  )
}

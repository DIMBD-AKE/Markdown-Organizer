import { useEffect } from 'react'
import { useProjectStore } from './stores/projectStore'
import { useUiStore } from './stores/uiStore'

export default function App() {
  const { setProjects, setActiveProject } = useProjectStore()
  const { setTheme } = useUiStore()

  useEffect(() => {
    window.api.getAppState().then((state) => {
      setProjects(state.projects)
      setActiveProject(state.activeProjectId)
      setTheme(state.theme)
    })
  }, [])

  return (
    <div className="flex flex-col h-screen bg-base text-text select-none">
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 flex items-center justify-center text-overlay0 text-sm">
          프로젝트를 등록하세요
        </div>
      </div>
    </div>
  )
}

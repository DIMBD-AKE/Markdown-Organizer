import { useEffect, useRef } from 'react'
import { useProjectStore } from './stores/projectStore'
import { useUiStore } from './stores/uiStore'
import { useFileTreeStore } from './stores/fileTreeStore'
import { useViewerStore } from './stores/viewerStore'
import { useFileWatcher } from './hooks/useFileWatcher'
import { useScrollSync } from './hooks/useScrollSync'
import ActivityBar from './components/ActivityBar/ActivityBar'
import FileTreePanel from './components/FileTree/FileTreePanel'
import DocumentViewer from './components/Viewer/DocumentViewer'
import TocPanel from './components/TocPanel/TocPanel'

export default function App() {
  const setProjects = useProjectStore((s) => s.setProjects)
  const setActiveProject = useProjectStore((s) => s.setActiveProject)
  const theme = useUiStore((s) => s.theme)
  const setTheme = useUiStore((s) => s.setTheme)
  const scrollRef = useRef<HTMLDivElement>(null)
  const { activeId, scrollToId } = useScrollSync(scrollRef)
  useFileWatcher()

  useEffect(() => {
    window.api.getAppState().then(async (state) => {
      setProjects(state.projects)
      setTheme(state.theme)

      if (state.activeProjectId) {
        setActiveProject(state.activeProjectId)

        // Restore project state
        const ps = state.projectStates[state.activeProjectId]
        if (ps) {
          useFileTreeStore.getState().setExpandedDirs(ps.expandedDirs)
          const proj = state.projects.find((p) => p.id === state.activeProjectId)
          if (proj) {
            useFileTreeStore.getState().setLoading(true)
            try {
              const tree = await window.api.getFileTree(proj.path)
              useFileTreeStore.getState().setTree(tree)
              // Restore last file
              if (ps.lastFile) {
                const { content } = await window.api.readFile(ps.lastFile)
                if (content) {
                  useViewerStore.getState().setFile(ps.lastFile, content)
                  useFileTreeStore.getState().setSelectedFile(ps.lastFile)
                }
              }
            } finally {
              useFileTreeStore.getState().setLoading(false)
            }
          }
        }
      }
    })

    // Save state before app closes
    const saveState = () => {
      const { activeProjectId } = useProjectStore.getState()
      if (!activeProjectId) return
      const { selectedFile, expandedDirs } = useFileTreeStore.getState()
      const { scrollPos } = useViewerStore.getState()
      window.api.saveProjectState({
        projectId: activeProjectId,
        lastFile: selectedFile,
        scrollPos,
        expandedDirs: Array.from(expandedDirs),
        searchHistory: []
      })
    }

    window.addEventListener('beforeunload', saveState)
    return () => window.removeEventListener('beforeunload', saveState)
  }, [setProjects, setActiveProject, setTheme])

  return (
    <div className={`theme-${theme} flex flex-col h-screen bg-base text-text select-none`}>
      <div className="flex flex-1 overflow-hidden">
        <ActivityBar />
        <FileTreePanel />
        <DocumentViewer scrollRef={scrollRef} />
        <TocPanel activeId={activeId} onSelect={scrollToId} />
      </div>
    </div>
  )
}

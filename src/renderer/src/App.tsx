import { useEffect, useRef } from 'react'
import { useProjectStore } from './stores/projectStore'
import { useUiStore } from './stores/uiStore'
import { useFileTreeStore } from './stores/fileTreeStore'
import { useViewerStore } from './stores/viewerStore'
import { useFileWatcher } from './hooks/useFileWatcher'
import { useScrollSync } from './hooks/useScrollSync'
import TitleBar from './components/TitleBar/TitleBar'
import Sidebar from './components/Sidebar/Sidebar'
import FileTreePanel from './components/FileTree/FileTreePanel'
import SearchPanel from './components/Search/SearchPanel'
import SettingsPanel from './components/Settings/SettingsPanel'
import DocumentViewer from './components/Viewer/DocumentViewer'
import TocPanel from './components/TocPanel/TocPanel'

export default function App() {
  const setProjects = useProjectStore((s) => s.setProjects)
  const setActiveProject = useProjectStore((s) => s.setActiveProject)
  const theme = useUiStore((s) => s.theme)
  const sidebarTab = useUiStore((s) => s.sidebarTab)
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

        const ps = state.projectStates[state.activeProjectId]
        if (ps) {
          useFileTreeStore.getState().setExpandedDirs(ps.expandedDirs)
          const proj = state.projects.find((p) => p.id === state.activeProjectId)
          if (proj) {
            useFileTreeStore.getState().setLoading(true)
            try {
              const tree = await window.api.getFileTree(proj.path)
              useFileTreeStore.getState().setTree(tree)
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

  function renderSidePanel() {
    if (sidebarTab === 'search') return <SearchPanel />
    if (sidebarTab === 'settings') return <SettingsPanel />
    return <FileTreePanel />
  }

  return (
    <div className={`theme-${theme} flex flex-col h-screen bg-base text-text select-none`}>
      {/* Top title bar — full width drag region with project dropdown */}
      <TitleBar />

      <div className="flex flex-1 overflow-hidden">
        {/* Left icon sidebar — files / search / settings tabs */}
        <Sidebar />

        {/* Side panel — content based on active sidebar tab */}
        {renderSidePanel()}

        {/* Main document viewer */}
        <DocumentViewer scrollRef={scrollRef} />

        {/* Table of contents */}
        <TocPanel activeId={activeId} onSelect={scrollToId} />
      </div>
    </div>
  )
}

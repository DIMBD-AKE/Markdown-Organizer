import { useEffect, useRef, useCallback } from 'react'
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
import ResizeHandle from './components/ResizeHandle'

const MIN_SIDE = 140
const MAX_SIDE = 480
const MIN_TOC  = 120
const MAX_TOC  = 400

export default function App() {
  const setProjects = useProjectStore((s) => s.setProjects)
  const setActiveProject = useProjectStore((s) => s.setActiveProject)
  const theme = useUiStore((s) => s.theme)
  const sidebarTab = useUiStore((s) => s.sidebarTab)
  const setTheme = useUiStore((s) => s.setTheme)
  const fileTreeWidth = useUiStore((s) => s.fileTreeWidth)
  const tocWidth = useUiStore((s) => s.tocWidth)
  const setFileTreeWidth = useUiStore((s) => s.setFileTreeWidth)
  const setTocWidth = useUiStore((s) => s.setTocWidth)
  const scrollRef = useRef<HTMLDivElement>(null)
  const { activeId, scrollToId } = useScrollSync(scrollRef)
  useFileWatcher()

  // ---------- Init ----------
  useEffect(() => {
    window.api.getAppState().then(async (state) => {
      setProjects(state.projects)
      setTheme(state.theme as 'dark' | 'black' | 'latte')

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

    // Restore panel widths
    Promise.all([
      window.api.getSetting('file_tree_width'),
      window.api.getSetting('toc_width'),
    ]).then(([ftw, tocw]) => {
      if (ftw) setFileTreeWidth(Math.max(MIN_SIDE, Math.min(MAX_SIDE, Number(ftw))))
      if (tocw) setTocWidth(Math.max(MIN_TOC, Math.min(MAX_TOC, Number(tocw))))
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
  }, [setProjects, setActiveProject, setTheme, setFileTreeWidth, setTocWidth])

  // ---------- Cmd+F / Ctrl+F shortcut ----------
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
        e.preventDefault()
        useUiStore.getState().setSidebarTab('search')
        // SearchPanel auto-focuses its input when sidebarTab becomes 'search'
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // ---------- Resize handlers ----------
  const handleSideDelta = useCallback((delta: number) => {
    const cur = useUiStore.getState().fileTreeWidth
    useUiStore.getState().setFileTreeWidth(Math.max(MIN_SIDE, Math.min(MAX_SIDE, cur + delta)))
  }, [])

  const handleTocDelta = useCallback((delta: number) => {
    const cur = useUiStore.getState().tocWidth
    useUiStore.getState().setTocWidth(Math.max(MIN_TOC, Math.min(MAX_TOC, cur - delta)))
  }, [])

  const commitSideWidth = useCallback(() => {
    window.api.setSetting('file_tree_width', String(useUiStore.getState().fileTreeWidth))
  }, [])

  const commitTocWidth = useCallback(() => {
    window.api.setSetting('toc_width', String(useUiStore.getState().tocWidth))
  }, [])

  // ---------- Side panel routing ----------
  function renderSidePanel() {
    if (sidebarTab === 'search')   return <SearchPanel />
    if (sidebarTab === 'settings') return <SettingsPanel />
    return <FileTreePanel />
  }

  return (
    <div className={`theme-${theme} flex flex-col h-screen bg-base text-text select-none`}>
      <TitleBar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />

        {/* Resizable side panel */}
        <div
          className="flex-shrink-0 flex overflow-hidden"
          style={{ width: fileTreeWidth }}
        >
          {renderSidePanel()}
        </div>

        <ResizeHandle onDelta={handleSideDelta} onCommit={commitSideWidth} />

        {/* Document viewer — takes remaining space */}
        <DocumentViewer scrollRef={scrollRef} />

        <ResizeHandle onDelta={handleTocDelta} onCommit={commitTocWidth} />

        {/* Resizable TOC */}
        <div
          className="flex-shrink-0 flex overflow-hidden"
          style={{ width: tocWidth }}
        >
          <TocPanel activeId={activeId} onSelect={scrollToId} />
        </div>
      </div>
    </div>
  )
}

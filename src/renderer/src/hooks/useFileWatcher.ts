import { useEffect } from 'react'
import { useViewerStore } from '../stores/viewerStore'
import { useFileTreeStore } from '../stores/fileTreeStore'
import { useProjectStore, activeProject } from '../stores/projectStore'

export function useFileWatcher() {
  const project = useProjectStore(activeProject)

  useEffect(() => {
    const unsub = window.api.onFileChanged(async ({ events }) => {
      try {
        const { filePath, setFile, setError } = useViewerStore.getState()

        // Re-read the open document only if it changed in this batch.
        const openChanged = events.some(
          (e) => e.type === 'change' && e.path === filePath
        )
        if (openChanged && filePath) {
          const { content, error } = await window.api.readFile(filePath)
          if (content) setFile(filePath, content)
          else setError(error ?? '읽기 실패')
        }

        // Rebuild the tree ONCE per batch, not once per changed file — a
        // burst of N files used to trigger N full recursive disk walks,
        // spiking CPU and crashing on large projects.
        if (project) {
          const tree = await window.api.getFileTree(project.path)
          useFileTreeStore.getState().setTree(tree)
        }
      } catch (err) {
        console.error('File watcher error:', err)
      }
    })
    return unsub
  }, [project?.path])
}

import { useEffect } from 'react'
import { useViewerStore } from '../stores/viewerStore'
import { useFileTreeStore } from '../stores/fileTreeStore'
import { useProjectStore, activeProject } from '../stores/projectStore'

export function useFileWatcher() {
  const project = useProjectStore(activeProject)

  useEffect(() => {
    const unsub = window.api.onFileChanged(async ({ type, path: changedPath }) => {
      try {
        const { filePath, setFile, setError } = useViewerStore.getState()

        if (type === 'change' && changedPath === filePath) {
          const { content, error } = await window.api.readFile(changedPath)
          if (content) setFile(changedPath, content)
          else setError(error ?? '읽기 실패')
        }

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

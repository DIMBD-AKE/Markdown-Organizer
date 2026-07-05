import type { ProjectState } from './types'

interface ProjectStateSnapshotInput {
  activeProjectId: string | null
  viewerFilePath: string | null
  selectedPath: string | null
  expandedDirs: Set<string>
  scrollPos: number
  scrollPositions: Record<string, number>
}

interface DebouncedProjectStateSaverOptions {
  delayMs: number
  getSnapshot: () => ProjectState | null
  save: (state: ProjectState) => void | Promise<void>
  onError?: (error: unknown) => void
}

function markdownPath(path: string | null): string | null {
  if (!path) return null
  return /\.md$/i.test(path) ? path : null
}

export function buildProjectStateSnapshot(input: ProjectStateSnapshotInput): ProjectState | null {
  if (!input.activeProjectId) return null
  const lastFile = markdownPath(input.viewerFilePath) ?? markdownPath(input.selectedPath)
  const scrollPositions = { ...input.scrollPositions }
  const viewerFile = markdownPath(input.viewerFilePath)
  if (viewerFile) {
    scrollPositions[viewerFile] = input.scrollPos
  }

  return {
    projectId: input.activeProjectId,
    lastFile,
    scrollPos: input.scrollPos,
    scrollPositions,
    expandedDirs: Array.from(input.expandedDirs),
    searchHistory: [],
  }
}

export function createDebouncedProjectStateSaver(options: DebouncedProjectStateSaverOptions) {
  let timer: ReturnType<typeof setTimeout> | null = null

  const persist = () => {
    timer = null
    const snapshot = options.getSnapshot()
    if (!snapshot) return
    try {
      Promise.resolve(options.save(snapshot)).catch((error) => {
        options.onError?.(error)
      })
    } catch (error) {
      options.onError?.(error)
    }
  }

  const cancel = () => {
    if (!timer) return
    clearTimeout(timer)
    timer = null
  }

  return {
    schedule() {
      cancel()
      timer = setTimeout(persist, options.delayMs)
    },
    flush() {
      cancel()
      persist()
    },
    cancel,
  }
}

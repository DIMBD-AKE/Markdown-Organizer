import { useProjectStore } from '../../stores/projectStore'
import { useFileTreeStore } from '../../stores/fileTreeStore'
import FileTree from './FileTree'

export default function FileTreePanel() {
  const { activeProjectId } = useProjectStore()
  const { isLoading } = useFileTreeStore()

  return (
    <div
      className="flex flex-col w-full h-full bg-mantle border-r border-surface0 overflow-hidden"
    >
      <div className="px-3 py-2 border-b border-surface0">
        <div className="text-[10px] font-semibold text-overlay0 uppercase tracking-widest">
          파일
        </div>
      </div>

      {!activeProjectId ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-2 p-4">
          <span className="text-xs text-overlay0 text-center">
            상단 드롭다운에서<br />프로젝트를 선택하세요
          </span>
        </div>
      ) : isLoading ? (
        <div className="flex-1 flex items-center justify-center text-overlay0 text-xs">
          로딩 중...
        </div>
      ) : (
        <FileTree />
      )}
    </div>
  )
}

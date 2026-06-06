import { useProjectStore } from '../../stores/projectStore'
import { useFileTreeStore } from '../../stores/fileTreeStore'
import { useUiStore } from '../../stores/uiStore'
import type { SortField, SortOrder } from '../../utils/sortTree'
import FileTree from './FileTree'

const SELECT_CLASS =
  'bg-mantle border border-surface0 text-subtext0 text-[11px] rounded-md px-1.5 py-0.5 ' +
  'hover:border-surface1 focus:outline-none focus:border-amber cursor-pointer'

export default function FileTreePanel() {
  const { activeProjectId } = useProjectStore()
  const { isLoading } = useFileTreeStore()
  const sortField = useUiStore((s) => s.sortField)
  const sortOrder = useUiStore((s) => s.sortOrder)
  const virtualGrouping = useUiStore((s) => s.virtualGrouping)
  const setSortField = useUiStore((s) => s.setSortField)
  const setSortOrder = useUiStore((s) => s.setSortOrder)
  const toggleVirtualGrouping = useUiStore((s) => s.toggleVirtualGrouping)

  const onField = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const v = e.target.value as SortField
    setSortField(v)
    window.api.setSetting('file_sort_field', v)
  }
  const onOrder = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const v = e.target.value as SortOrder
    setSortOrder(v)
    window.api.setSetting('file_sort_order', v)
  }
  const onToggleGroup = () => {
    toggleVirtualGrouping()
    window.api.setSetting('virtual_grouping', String(!virtualGrouping))
  }

  return (
    <div className="flex flex-col w-full h-full bg-mantle border-r border-surface0 overflow-hidden">
      <div className="px-3 py-2 border-b border-surface0 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-semibold text-overlay0 uppercase tracking-widest">
            파일
          </span>
          <button
            onClick={onToggleGroup}
            title="날짜·접두사 패턴으로 가상 폴더 그룹화"
            className={`text-[10px] font-medium px-1.5 py-0.5 rounded-md border transition-colors ${
              virtualGrouping
                ? 'border-amber text-amber bg-[var(--color-amber-soft)]'
                : 'border-surface0 text-overlay0 hover:text-subtext0 hover:border-surface1'
            }`}
          >
            그룹
          </button>
        </div>
        {activeProjectId && (
          <div className="flex items-center gap-1.5">
            <select value={sortField} onChange={onField} className={SELECT_CLASS} title="정렬 기준">
              <option value="name">이름</option>
              <option value="date">날짜</option>
            </select>
            <select value={sortOrder} onChange={onOrder} className={SELECT_CLASS} title="정렬 순서">
              <option value="asc">오름차순</option>
              <option value="desc">내림차순</option>
            </select>
          </div>
        )}
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

// src/renderer/src/components/TocPanel/TocTree.tsx
import { useViewerStore } from '../../stores/viewerStore'
import { tocAncestorIds } from '../../utils/tocAncestors'
import TocItem from './TocItem'

interface Props { activeId: string | null; onSelect(id: string): void }

export default function TocTree({ activeId, onSelect }: Props) {
  const toc = useViewerStore((s) => s.toc)
  const collapsedTocIds = useViewerStore((s) => s.collapsedTocIds)
  const toggleTocCollapse = useViewerStore((s) => s.toggleTocCollapse)

  if (toc.length === 0) {
    return <div className="text-xs text-overlay0 px-3 py-2">목차 없음</div>
  }

  // Active heading's ancestors stay expanded so it never hides inside a fold.
  const ancestors = tocAncestorIds(toc, activeId)
  const isCollapsed = (id: string) => collapsedTocIds.has(id) && !ancestors.has(id)

  return (
    <div className="overflow-y-auto flex-1 py-1 px-1">
      {toc.map((item) => (
        <TocItem
          key={item.id}
          item={item}
          activeId={activeId}
          onSelect={onSelect}
          isCollapsed={isCollapsed}
          onToggle={toggleTocCollapse}
        />
      ))}
    </div>
  )
}

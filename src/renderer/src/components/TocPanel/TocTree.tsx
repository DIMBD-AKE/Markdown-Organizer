// src/renderer/src/components/TocPanel/TocTree.tsx
import { useViewerStore } from '../../stores/viewerStore'
import TocItem from './TocItem'

interface Props { activeId: string | null; onSelect(id: string): void }

export default function TocTree({ activeId, onSelect }: Props) {
  const toc = useViewerStore((s) => s.toc)

  if (toc.length === 0) {
    return <div className="text-xs text-overlay0 px-3 py-2">목차 없음</div>
  }

  return (
    <div className="overflow-y-auto flex-1 py-1">
      {toc.map((item) => (
        <TocItem key={item.id} item={item} activeId={activeId} depth={0} onSelect={onSelect} />
      ))}
    </div>
  )
}

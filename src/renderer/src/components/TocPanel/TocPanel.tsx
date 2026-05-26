// src/renderer/src/components/TocPanel/TocPanel.tsx
import TocTree from './TocTree'

interface Props {
  activeId: string | null
  onSelect(id: string): void
}

export default function TocPanel({ activeId, onSelect }: Props) {
  return (
    <div className="flex flex-col bg-mantle border-l border-surface0 overflow-hidden" style={{ width: 200 }}>
      <div className="px-3 py-2 border-b border-surface0">
        <span className="text-xs font-semibold text-mauve uppercase tracking-wider">목차</span>
      </div>
      <TocTree activeId={activeId} onSelect={onSelect} />
    </div>
  )
}

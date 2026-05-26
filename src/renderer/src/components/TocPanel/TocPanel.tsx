import TocTree from './TocTree'

interface Props {
  activeId: string | null
  onSelect(id: string): void
}

export default function TocPanel({ activeId, onSelect }: Props) {
  return (
    <div className="flex flex-col w-full h-full bg-mantle border-l border-surface0 overflow-hidden">
      <div className="px-3 py-2 border-b border-surface0">
        <span className="text-[10px] font-semibold text-overlay0 uppercase tracking-widest">목차</span>
      </div>
      <TocTree activeId={activeId} onSelect={onSelect} />
    </div>
  )
}

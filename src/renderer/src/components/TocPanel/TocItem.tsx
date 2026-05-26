// src/renderer/src/components/TocPanel/TocItem.tsx
import type { TocItem as TocItemType } from '../../types'

interface Props {
  item: TocItemType
  activeId: string | null
  depth: number
  onSelect(id: string): void
}

export default function TocItem({ item, activeId, depth, onSelect }: Props) {
  const isActive = item.id === activeId
  return (
    <div>
      <button
        onClick={() => onSelect(item.id)}
        className={`
          w-full text-left text-xs py-0.5 px-2 rounded transition-colors truncate
          ${isActive ? 'text-mauve bg-surface0' : 'text-subtext0 hover:text-text hover:bg-surface0/40'}
        `}
        style={{ paddingLeft: `${depth * 10 + 8}px` }}
      >
        {item.text}
      </button>
      {item.children.map((child) => (
        <TocItem key={child.id} item={child} activeId={activeId} depth={depth + 1} onSelect={onSelect} />
      ))}
    </div>
  )
}

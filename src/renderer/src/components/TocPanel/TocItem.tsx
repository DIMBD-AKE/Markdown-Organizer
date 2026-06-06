// src/renderer/src/components/TocPanel/TocItem.tsx
import type { TocItem as TocItemType } from '../../types'

interface Props {
  item: TocItemType
  activeId: string | null
  onSelect(id: string): void
  isCollapsed(id: string): boolean
  onToggle(id: string): void
}

export default function TocItem({ item, activeId, onSelect, isCollapsed, onToggle }: Props) {
  const isActive = item.id === activeId
  const hasChildren = item.children.length > 0
  const collapsed = hasChildren && isCollapsed(item.id)

  return (
    <div>
      <div
        className={`
          flex items-center gap-0.5 rounded transition-colors
          ${isActive ? 'text-amber bg-[var(--color-amber-soft)] font-medium' : 'text-subtext0 hover:text-text hover:bg-surface0/40'}
        `}
      >
        {hasChildren ? (
          <button
            onClick={() => onToggle(item.id)}
            className="w-4 flex-shrink-0 text-overlay0 hover:text-text text-[11px] leading-none py-1"
            aria-label={collapsed ? '펼치기' : '접기'}
          >
            {collapsed ? '▸' : '▾'}
          </button>
        ) : (
          <span className="w-4 flex-shrink-0" />
        )}
        <button
          onClick={() => onSelect(item.id)}
          className="flex-1 text-left text-xs py-0.5 pr-2 truncate"
        >
          {item.text}
        </button>
      </div>
      {hasChildren && !collapsed && (
        <div className="ml-3 border-l border-surface0 pl-0.5">
          {item.children.map((child) => (
            <TocItem
              key={child.id}
              item={child}
              activeId={activeId}
              onSelect={onSelect}
              isCollapsed={isCollapsed}
              onToggle={onToggle}
            />
          ))}
        </div>
      )}
    </div>
  )
}

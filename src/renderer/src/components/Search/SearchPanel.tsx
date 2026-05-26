export default function SearchPanel() {
  return (
    <div
      className="flex flex-col bg-mantle border-r border-surface0 overflow-hidden flex-shrink-0"
      style={{ width: 220 }}
    >
      <div className="px-3 py-2 border-b border-surface0">
        <div className="text-[10px] font-semibold text-overlay0 uppercase tracking-widest">
          검색
        </div>
      </div>
      <div className="flex-1 flex items-center justify-center">
        <span className="text-xs text-overlay0">준비 중</span>
      </div>
    </div>
  )
}

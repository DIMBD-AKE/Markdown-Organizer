import { getFreshness, getFreshnessColor } from '../../utils/freshness'

export default function StatusDot({ modifiedAt }: { modifiedAt: number }) {
  const freshness = getFreshness(modifiedAt)
  const color = getFreshnessColor(freshness)
  return (
    <span
      className="w-1.5 h-1.5 rounded-full inline-block flex-shrink-0"
      style={{ backgroundColor: color }}
      title={`${freshness}`}
    />
  )
}

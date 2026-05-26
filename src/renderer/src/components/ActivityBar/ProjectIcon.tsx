interface Props {
  icon: string
  name: string
  isActive: boolean
  onClick(): void
}

export default function ProjectIcon({ icon, name, isActive, onClick }: Props) {
  return (
    <button
      title={name}
      onClick={onClick}
      className={`
        w-9 h-9 rounded-lg flex items-center justify-center text-lg
        transition-colors duration-150
        ${isActive
          ? 'bg-surface0 text-text'
          : 'text-overlay0 hover:text-text hover:bg-surface0/50'}
      `}
    >
      {icon}
    </button>
  )
}
